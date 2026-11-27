import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { geoTransverseMercator } from 'd3-geo';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Compass, Expand, Minimize2, Minus, MousePointerClick, Plus, RotateCcw } from 'lucide-react';
import type { Departamento, Planta, Producto } from '@/schemas';
import type {
  DepartamentosFeatureCollection,
  MapaDepartamentoResumen,
  MapaProvinciaResumen,
  ProvinciasFeatureCollection,
} from '@/data';
import { getCategoryAccent } from '@/lib/categoryAccent';
import { prefetchProvinceGeo, useProvinceDeptGeo } from '@/lib/useProvinceDeptGeo';
import { ProductIcon } from './ProductIcon';

type PlantaConEmpresa = Planta & { empresaNombre: string | null };

export interface ArgentinaMap3DStageProps {
  continentalGeo: ProvinciasFeatureCollection;
  departamentosGeo: DepartamentosFeatureCollection;
  provinciasData: MapaProvinciaResumen[];
  departamentosData: MapaDepartamentoResumen[];
  productos: Producto[];
  selectedId: string | null;
  selectedDeptId: string | null;
  selectedPlantaId: string | null;
  activeProductId: string | null;
  showAllDeptos: boolean;
  onSelectProvincia: (provinciaId: string | null) => void;
  onSelectDepartamento: (deptId: string | null) => void;
  onSelectPlanta: (planta: PlantaConEmpresa) => void;
}

interface ProjectedOverlayLabel {
  key: string;
  kind: 'prov' | 'caba' | 'dept-active' | 'dept-context' | 'plant';
  x: number;
  y: number;
  anchorX: number;
  anchorY: number;
  hasLeader: boolean;
  title: string;
  subtitle?: string;
  badgeCount?: number;
  accent: string;
  iconoId?: string;
  isSelected: boolean;
  provinciaId: string;
  deptId?: string;
  planta?: PlantaConEmpresa;
}

interface HoverBanner {
  title: string;
  subtitle: string;
  accent: string;
  x: number;
  y: number;
}

interface PrismRecord {
  id: string;
  kind: 'provincia' | 'depto';
  provinciaId: string;
  nombre: string;
  activo: boolean;
  mesh: THREE.Mesh;
  topMat: THREE.MeshStandardMaterial;
  sideMat: THREE.MeshStandardMaterial;
  edgeLines: THREE.LineSegments;
  edgeMat: THREE.LineBasicMaterial;
  centroid: [number, number];
  bounds: [[number, number], [number, number]];
  currentH: number;
  targetH: number;
}

interface Plant3DNode {
  planta: PlantaConEmpresa;
  producto: Producto;
  baseX: number;
  baseZ: number;
  fanX: number;
  fanZ: number;
  topY: number;
  group: THREE.Group;
  leaderLine: THREE.Line;
  baseDot: THREE.Mesh;
}

const PROJ_W = 570;
const PROJ_H = 756;
const WORLD_SCALE = 0.042;
const CENTER_PX = 285;
const CENTER_PY = 378;

function darkerSideHex(hex: string): string {
  switch (hex.toUpperCase()) {
    case '#0A42E0':
      return '#06288F';
    case '#0B7A53':
      return '#064D34';
    case '#C86A11':
      return '#834308';
    case '#D93025':
      return '#8E1C15';
    default:
      return '#BFC5D0';
  }
}

function getZoneHex(tipo: Departamento['tipo_zona']): string {
  switch (tipo) {
    case 'polo_industrial':
      return '#0A42E0';
    case 'minero':
      return '#0B7A53';
    case 'agro':
      return '#C86A11';
    case 'energetico':
      return '#D93025';
    default:
      return '#0A42E0';
  }
}

function shortEmpresaOrPlanta(pl: PlantaConEmpresa): string {
  if (pl.empresaNombre) {
    return pl.empresaNombre
      .replace(/\s*S\.A\.I\.C\.A\.?|\s*S\.A\.I\.C\.?|\s*S\.A\.?|\s*S\.R\.L\.?/gi, '')
      .replace(/\s*\([^)]*\)/g, '')
      .trim()
      .slice(0, 22);
  }
  return pl.nombre.split('(')[0]!.trim().slice(0, 22);
}

function shortPlantSpecialty(pl: PlantaConEmpresa, prod: Producto): string {
  const n = pl.nombre.toLowerCase();
  if (n.includes('unipar')) return 'Cloro-PVC';
  if (n.includes('dow')) return 'Polietileno';
  if (n.includes('fenix') || n.includes('fénix') || n.includes('rincón') || n.includes('rincon')) {
    return 'Litio DLE';
  }
  if (n.includes('olaroz')) return 'Litio Solar';
  if (prod.producto_id === 'galvanizado-caliente') return 'Galvanizado';
  if (prod.producto_id === 'farmoquimica-ifa') return 'IFAs GMP';
  if (prod.producto_id === 'aceite-oliva') return 'Oliva V.E.';
  if (prod.producto_id === 'tanino-quebracho') return 'Tanino';
  if (prod.producto_id === 'resina-colofonia') return 'Colofonia';
  return prod.nombre.split(' ')[0]!;
}

function signedRingArea(pts: Array<[number, number]>): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[(i + 1) % pts.length]!;
    a += x1 * y2 - x2 * y1;
  }
  return a * 0.5;
}

function projectRingToShapePts(
  ring: number[][],
  proj: (coord: [number, number]) => [number, number] | null
): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (const coord of ring) {
    if (coord.length < 2) continue;
    const p = proj([coord[0]!, coord[1]!]);
    if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) continue;
    const sx = (p[0] - CENTER_PX) * WORLD_SCALE;
    const sy = -(p[1] - CENTER_PY) * WORLD_SCALE;
    const prev = pts[pts.length - 1];
    if (!prev || Math.hypot(sx - prev[0], sy - prev[1]) > 0.0008) {
      pts.push([sx, sy]);
    }
  }
  if (pts.length > 2) {
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 0.0008) {
      pts.pop();
    }
  }
  return pts;
}

function buildExtrudedPrismGeometry(
  geometry: { type: string; coordinates?: unknown } | null | undefined,
  proj: (coord: [number, number]) => [number, number] | null
): {
  geo: THREE.ExtrudeGeometry;
  topEdges: THREE.BufferGeometry;
  centroid: [number, number];
  bounds: [[number, number], [number, number]];
} | null {
  if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) {
    return null;
  }
  const polys =
    geometry.type === 'Polygon'
      ? [geometry.coordinates as number[][][]]
      : (geometry.coordinates as number[][][][]);
  const shapes: THREE.Shape[] = [];

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let bestArea = 0;
  let bestCx = 0;
  let bestCz = 0;

  for (const poly of polys) {
    if (!poly[0]) continue;
    const outerPts = projectRingToShapePts(poly[0], proj);
    if (outerPts.length < 3) continue;
    const area = Math.abs(signedRingArea(outerPts));
    if (area < 0.00008) continue;

    // Centroid del mayor anillo para etiquetas estables
    if (area > bestArea) {
      bestArea = area;
      let cx = 0;
      let cy = 0;
      for (const [x, y] of outerPts) {
        cx += x;
        cy += y;
      }
      bestCx = cx / outerPts.length;
      bestCz = -(cy / outerPts.length);
    }

    for (const [x, y] of outerPts) {
      const wz = -y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (wz < minZ) minZ = wz;
      if (wz > maxZ) maxZ = wz;
    }

    const shape = new THREE.Shape();
    shape.moveTo(outerPts[0]![0], outerPts[0]![1]);
    for (let i = 1; i < outerPts.length; i++) {
      shape.lineTo(outerPts[i]![0], outerPts[i]![1]);
    }
    shape.closePath();

    for (let h = 1; h < poly.length; h++) {
      const holePts = projectRingToShapePts(poly[h]!, proj);
      if (holePts.length < 3 || Math.abs(signedRingArea(holePts)) < 0.00012) continue;
      const holePath = new THREE.Path();
      holePath.moveTo(holePts[0]![0], holePts[0]![1]);
      for (let i = 1; i < holePts.length; i++) {
        holePath.lineTo(holePts[i]![0], holePts[i]![1]);
      }
      holePath.closePath();
      shape.holes.push(holePath);
    }

    shapes.push(shape);
  }

  if (shapes.length === 0 || !Number.isFinite(minX)) return null;

  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: 1,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1,
  });
  // Rota para que la extrusión crezca en +Y (0..1) y el plano quede en (X, Z)
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();

  // Contorno nítido de la cara superior (en y = 0 para posicionar a altura dinámica)
  const edgePositions: number[] = [];
  for (const s of shapes) {
    const pts = s.getPoints(1);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[(i + 1) % pts.length]!;
      edgePositions.push(a.x, 0, -a.y, b.x, 0, -b.y);
    }
  }
  const topEdges = new THREE.BufferGeometry();
  topEdges.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));

  return {
    geo,
    topEdges,
    centroid: [bestCx, bestCz],
    bounds: [
      [minX, minZ],
      [maxX, maxZ],
    ],
  };
}

function buildMiniFactoryMesh(categoria: Producto['categoria'], accentHex: string): THREE.Group {
  const g = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: '#F7F7F5', roughness: 0.75 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.48 });
  const steelMat = new THREE.MeshStandardMaterial({ color: '#DCE1E9', roughness: 0.55 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#1C1E22', roughness: 0.65 });

  // Plinto industrial cuadrado con filete oscuro
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.16, 1.15), baseMat);
  plinth.position.y = 0.08;
  g.add(plinth);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 1.2), darkMat);
  rim.position.y = 0.02;
  g.add(rim);

  if (categoria === 'petroquimica' || categoria === 'fertilizantes') {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 1.15, 12), accentMat);
    tower.position.set(-0.22, 0.72, -0.1);
    g.add(tower);
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), steelMat);
    sphere.position.set(0.24, 0.44, 0.12);
    g.add(sphere);
  } else if (categoria === 'metalurgia') {
    const hall = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.48, 0.56), steelMat);
    hall.position.set(-0.08, 0.4, 0.08);
    g.add(hall);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.6), accentMat);
    roof.position.set(-0.08, 0.69, 0.08);
    g.add(roof);
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.1, 10), darkMat);
    stack.position.set(0.32, 0.7, -0.22);
    g.add(stack);
  } else if (categoria === 'mineria_quimica') {
    const pond = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.12, 0.52), new THREE.MeshStandardMaterial({ color: '#4CC3B7', roughness: 0.35 }));
    pond.position.set(-0.14, 0.22, 0.16);
    g.add(pond);
    const reactor = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.88, 12), accentMat);
    reactor.position.set(0.24, 0.6, -0.18);
    g.add(reactor);
  } else {
    // Agroindustria y bioenergía: batería de silos + torre de proceso
    const silo1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.72, 12), steelMat);
    silo1.position.set(-0.24, 0.52, 0.12);
    g.add(silo1);
    const silo2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.82, 12), steelMat);
    silo2.position.set(0.08, 0.57, 0.16);
    g.add(silo2);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 1.04, 12), accentMat);
    col.position.set(0.28, 0.68, -0.2);
    g.add(col);
  }

  return g;
}

export const ArgentinaMap3DStage = memo(function ArgentinaMap3DStage({
  continentalGeo,
  departamentosGeo,
  provinciasData,
  departamentosData,
  productos,
  selectedId,
  selectedDeptId,
  selectedPlantaId,
  activeProductId,
  showAllDeptos,
  onSelectProvincia,
  onSelectDepartamento,
  onSelectPlanta,
}: ArgentinaMap3DStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [labels, setLabels] = useState<ProjectedOverlayLabel[]>([]);
  const [hoverBanner, setHoverBanner] = useState<HoverBanner | null>(null);
  const [wheelUnlocked, setWheelUnlocked] = useState(false);
  const [wheelHint, setWheelHint] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [touchFreeOrbit, setTouchFreeOrbit] = useState(false);
  const [compassDeg, setCompassDeg] = useState(0);
  const [contextLost, setContextLost] = useState(false);

  // Carga bajo demanda con caché L1 memoria + L2 Cache API de todos los partidos de la provincia enfocada
  const { shard: provinceShard, loading: loadingShard } = useProvinceDeptGeo(selectedId);

  const dataById = useMemo(
    () => new Map(provinciasData.map((p) => [p.provincia.provincia_id, p])),
    [provinciasData]
  );
  const deptById = useMemo(
    () => new Map(departamentosData.map((d) => [d.departamento.departamento_id, d])),
    [departamentosData]
  );
  const prodById = useMemo(
    () => new Map(productos.map((p) => [p.producto_id, p])),
    [productos]
  );

  const projection = useMemo(
    () =>
      geoTransverseMercator()
        .rotate([64, 0, 0])
        .fitExtent(
          [
            [38, 22],
            [PROJ_W - 38, PROJ_H - 22],
          ],
          continentalGeo
        ),
    [continentalGeo]
  );

  const projectCoord = useCallback(
    (lonLat: [number, number]): [number, number] | null => {
      const p = projection(lonLat);
      if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null;
      return [p[0], p[1]];
    },
    [projection]
  );

  const projectWorld = useCallback(
    (lon: number, lat: number): [number, number] | null => {
      const p = projectCoord([lon, lat]);
      if (!p) return null;
      return [(p[0] - CENTER_PX) * WORLD_SCALE, (p[1] - CENTER_PY) * WORLD_SCALE];
    },
    [projectCoord]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(pointer: coarse)');
    setIsCoarsePointer(mq.matches);
    const onChange = (ev: MediaQueryListEvent) => setIsCoarsePointer(ev.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Referencias mutables para que el loop Three.js lea siempre el último estado sin recrear el contexto WebGL
  const stateRef = useRef({
    selectedId,
    selectedDeptId,
    selectedPlantaId,
    activeProductId,
    showAllDeptos,
    hoveredProvId: null as string | null,
    hoveredDeptId: null as string | null,
    onSelectProvincia,
    onSelectDepartamento,
    onSelectPlanta,
  });
  stateRef.current = {
    ...stateRef.current,
    selectedId,
    selectedDeptId,
    selectedPlantaId,
    activeProductId,
    showAllDeptos,
    onSelectProvincia,
    onSelectDepartamento,
    onSelectPlanta,
  };

  // Controladores imperativos del motor 3D expuestos a botones UI y efectos de selección
  const engineRef = useRef<{
    requestRender: () => void;
    flyTo: (target: [number, number, number], distance: number, polarDeg?: number, azimuthDeg?: number) => void;
    zoomBy: (factor: number) => void;
    resetNorthTilt: () => void;
    provRecords: Map<string, PrismRecord>;
    deptRecords: Map<string, PrismRecord>;
    syncDeptLayer: () => void;
    syncPlantsLayer: () => void;
    syncStylesAndTargets: () => void;
  } | null>(null);

  // Inicialización única de la escena Three.js
  useEffect(() => {
    const container = stageRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const isMobileInit = window.matchMedia('(pointer: coarse)').matches;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobileInit ? 1.65 : 2));
    renderer.setClearColor('#DFE4EA', 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#DFE4EA');

    const initW = Math.max(1, container.clientWidth);
    const initH = Math.max(1, container.clientHeight);
    const camera = new THREE.PerspectiveCamera(34, initW / initH, 0.2, 160);
    const initPolar = THREE.MathUtils.degToRad(38);
    const initAzim = THREE.MathUtils.degToRad(-5);
    const initDist = 36.5;
    camera.position.set(
      0.25 + initDist * Math.sin(initPolar) * Math.sin(initAzim),
      initDist * Math.cos(initPolar),
      -0.25 + initDist * Math.sin(initPolar) * Math.cos(initAzim)
    );
    renderer.setSize(initW, initH, false);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0.25, 0, -0.25);
    controls.enableDamping = true;
    controls.dampingFactor = 0.085;
    controls.screenSpacePanning = false;
    controls.minDistance = 2.1;
    controls.maxDistance = 42;
    controls.minPolarAngle = THREE.MathUtils.degToRad(14);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(62);
    controls.rotateSpeed = 0.68;
    controls.panSpeed = 0.78;
    controls.zoomSpeed = 0.95;
    // En desktop manejamos la rueda manualmente para no secuestrar el scroll normal de la página
    controls.enableZoom = isMobileInit;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // Iluminación arquitectónica de 3 puntos para esculpir las paredes verticales de cada provincia/partido
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa4b4, 1.48));
    const keyLight = new THREE.DirectionalLight(0xfffdf8, 1.45);
    keyLight.position.set(-14, 26, 18);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xdce6f7, 0.52);
    rimLight.position.set(16, 14, -12);
    scene.add(rimLight);

    // Grilla cartográfica sutil sobre la cuenca oceánica
    const seaGrid = new THREE.GridHelper(54, 27, 0xc5cdd8, 0xcfd6e0);
    seaGrid.position.y = -0.02;
    (seaGrid.material as THREE.Material).transparent = true;
    (seaGrid.material as THREE.Material).opacity = 0.42;
    scene.add(seaGrid);

    const provincesGroup = new THREE.Group();
    const deptosGroup = new THREE.Group();
    const plantsGroup = new THREE.Group();
    scene.add(provincesGroup, deptosGroup, plantsGroup);

    const provRecords = new Map<string, PrismRecord>();
    const deptRecords = new Map<string, PrismRecord>();
    let plantNodes: Plant3DNode[] = [];

    // Construir prismas 3D de las 24 jurisdicciones una sola vez
    for (const feat of continentalGeo.features) {
      const id = feat.properties.id;
      const built = buildExtrudedPrismGeometry(feat.geometry, projectCoord);
      if (!built) continue;

      const topMat = new THREE.MeshStandardMaterial({
        color: '#F7F7F5',
        roughness: 0.78,
        metalness: 0.02,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });
      const sideMat = new THREE.MeshStandardMaterial({
        color: '#C2C8D2',
        roughness: 0.82,
        metalness: 0.04,
      });
      const mesh = new THREE.Mesh(built.geo, [topMat, sideMat]);
      mesh.scale.y = 0.46;
      mesh.userData = { kind: 'provincia', id, provinciaId: id };
      provincesGroup.add(mesh);

      const edgeMat = new THREE.LineBasicMaterial({
        color: '#1C1E22',
        transparent: true,
        opacity: 0.85,
      });
      const edgeLines = new THREE.LineSegments(built.topEdges, edgeMat);
      edgeLines.position.y = 0.468;
      provincesGroup.add(edgeLines);

      provRecords.set(id, {
        id,
        kind: 'provincia',
        provinciaId: id,
        nombre: feat.properties.nombre,
        activo: true,
        mesh,
        topMat,
        sideMat,
        edgeLines,
        edgeMat,
        centroid: built.centroid,
        bounds: built.bounds,
        currentH: 0.46,
        targetH: 0.46,
      });
    }

    // Animación suave de cámara (vuelo interpolado hacia provincia, departamento o país)
    const camAnim = {
      active: false,
      startTarget: new THREE.Vector3(),
      endTarget: new THREE.Vector3(0, 0, 0.4),
      startPos: new THREE.Vector3(),
      endPos: new THREE.Vector3(-1.6, 26.5, 21.5),
      t: 0,
      duration: 0.58,
    };

    let rafId = 0;
    let lastTime = performance.now();
    let labelTickCounter = 0;

    const updateProjectedOverlays = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width < 120 || height < 120) return;

      const st = stateRef.current;
      const tmpV = new THREE.Vector3();
      const tmpBase = new THREE.Vector3();
      const camDist = camera.position.distanceTo(controls.target);

      const toScreen = (wx: number, wy: number, wz: number): [number, number, boolean] => {
        tmpV.set(wx, wy, wz).project(camera);
        if (tmpV.z <= -1 || tmpV.z >= 1) return [0, 0, false];
        return [(tmpV.x * 0.5 + 0.5) * width, (-tmpV.y * 0.5 + 0.5) * height, true];
      };

      // Recalcular apertura radial (abanico) de plantas según la distancia actual de cámara
      if (plantNodes.length > 0) {
        const minSep = Math.max(0.14, Math.min(1.45, camDist * 0.088));
        const used = new Set<number>();
        for (let i = 0; i < plantNodes.length; i++) {
          if (used.has(i)) continue;
          const cluster = [i];
          used.add(i);
          for (let j = i + 1; j < plantNodes.length; j++) {
            if (used.has(j)) continue;
            const d = Math.hypot(
              plantNodes[i]!.baseX - plantNodes[j]!.baseX,
              plantNodes[i]!.baseZ - plantNodes[j]!.baseZ
            );
            if (d < minSep) {
              cluster.push(j);
              used.add(j);
            }
          }

          if (cluster.length === 1) {
            const n = plantNodes[cluster[0]!]!;
            n.fanX = n.baseX;
            n.fanZ = n.baseZ;
          } else {
            let cx = 0;
            let cz = 0;
            for (const idx of cluster) {
              cx += plantNodes[idx]!.baseX;
              cz += plantNodes[idx]!.baseZ;
            }
            cx /= cluster.length;
            cz /= cluster.length;
            const radius = Math.max(0.16, Math.min(1.25, camDist * 0.072));
            cluster.forEach((idx, k) => {
              const angle = -Math.PI / 2 + (k * Math.PI * 2) / cluster.length;
              plantNodes[idx]!.fanX = cx + Math.cos(angle) * radius;
              plantNodes[idx]!.fanZ = cz + Math.sin(angle) * radius;
            });
          }
        }

        const factoryScale = Math.max(0.075, Math.min(0.46, camDist * 0.032));
        for (const node of plantNodes) {
          const deptRec = node.planta.departamento_id
            ? deptRecords.get(node.planta.departamento_id)
            : undefined;
          const provRec = provRecords.get(node.planta.provincia_id);
          const baseY = deptRec ? deptRec.currentH : provRec ? provRec.currentH : 0.5;
          node.topY = baseY;

          const liftPedestal = Math.hypot(node.fanX - node.baseX, node.fanZ - node.baseZ) > 0.02
            ? factoryScale * 0.35
            : 0.01;

          node.group.position.set(node.fanX, baseY + liftPedestal, node.fanZ);
          node.group.scale.setScalar(factoryScale);

          node.baseDot.position.set(node.baseX, baseY + 0.018, node.baseZ);
          node.baseDot.scale.setScalar(Math.max(0.035, factoryScale * 0.24));

          const posAttr = node.leaderLine.geometry.getAttribute('position') as THREE.BufferAttribute;
          posAttr.setXYZ(0, node.baseX, baseY + 0.02, node.baseZ);
          posAttr.setXYZ(1, node.fanX, baseY + liftPedestal + 0.01, node.fanZ);
          posAttr.needsUpdate = true;
          node.leaderLine.visible = liftPedestal > 0.015;
        }
      }

      const rawCandidates: Array<ProjectedOverlayLabel & { priority: number; estW: number; estH: number }> = [];

      // 1) Etiquetas de fábricas individuales (máxima prioridad cuando hay provincia/depto enfocado)
      for (const node of plantNodes) {
        const factoryScale = node.group.scale.x;
        const [sx, sy, ok] = toScreen(node.fanX, node.group.position.y + factoryScale * 1.28, node.fanZ);
        if (!ok || sx < 16 || sx > width - 16 || sy < 36 || sy > height - 24) continue;
        tmpBase.set(node.baseX, node.topY + 0.02, node.baseZ).project(camera);
        const ax = (tmpBase.x * 0.5 + 0.5) * width;
        const ay = (-tmpBase.y * 0.5 + 0.5) * height;

        const isSelPlant = st.selectedPlantaId === node.planta.planta_id;
        const shortOp = shortEmpresaOrPlanta(node.planta);
        const shortProd = shortPlantSpecialty(node.planta, node.producto);
        const title = `${shortOp} · ${shortProd}`;
        const accent = getCategoryAccent(node.producto.categoria);

        rawCandidates.push({
          key: `pl-${node.planta.planta_id}`,
          kind: 'plant',
          priority: isSelPlant ? 120 : 100,
          x: sx,
          y: sy - 14,
          anchorX: ax,
          anchorY: ay,
          hasLeader: Math.hypot(sx - ax, sy - ay) > 14,
          title,
          subtitle: camDist < 6.8 ? node.planta.localidad : undefined,
          accent,
          iconoId: node.producto.icono_id,
          isSelected: isSelPlant,
          provinciaId: node.planta.provincia_id,
          deptId: node.planta.departamento_id ?? undefined,
          planta: node.planta,
          estW: Math.min(210, title.length * 6.5 + 34),
          estH: camDist < 6.8 ? 34 : 24,
        });
      }

      // 2) Etiquetas de departamentos dentro de la provincia enfocada (activos + vecinos de referencia)
      if (st.selectedId !== null || st.showAllDeptos || camDist < 15) {
        for (const rec of deptRecords.values()) {
          if (st.selectedId !== null && !st.showAllDeptos && rec.provinciaId !== st.selectedId) continue;
          const [sx, sy, ok] = toScreen(rec.centroid[0], rec.currentH + 0.06, rec.centroid[1]);
          if (!ok || sx < 24 || sx > width - 24 || sy < 44 || sy > height - 26) continue;

          const info = deptById.get(rec.id);
          const isSelDept = st.selectedDeptId === rec.id;

          if (info) {
            // Si el departamento ya está seleccionado y sus plantas están desplegadas en abanico,
            // colocamos el cartel del departamento ligeramente arriba o dejamos prioridad a sus plantas
            const zonaAccent = getZoneHex(info.departamento.tipo_zona);
            rawCandidates.push({
              key: `dept-act-${rec.id}`,
              kind: 'dept-active',
              priority: isSelDept ? 94 : 88,
              x: sx,
              y: isSelDept ? sy - 34 : sy - 10,
              anchorX: sx,
              anchorY: sy,
              hasLeader: false,
              title: info.departamento.nombre,
              subtitle: info.plantas.length > 1 ? `${info.plantas.length} plantas` : undefined,
              accent: zonaAccent,
              isSelected: isSelDept,
              provinciaId: rec.provinciaId,
              deptId: rec.id,
              estW: info.departamento.nombre.length * 6.8 + (info.plantas.length > 1 ? 66 : 26),
              estH: 23,
            });
          } else if (st.selectedId === rec.provinciaId && camDist < 13.5) {
            // Partidos vecinos en relieve piedra (como en las capturas 2 y 3)
            const bw = rec.bounds[1][0] - rec.bounds[0][0];
            const bz = rec.bounds[1][1] - rec.bounds[0][1];
            const approxArea = bw * bz;
            if (camDist > 7.5 && approxArea < 0.12) continue;

            rawCandidates.push({
              key: `dept-ctx-${rec.id}`,
              kind: 'dept-context',
              priority: Math.min(48, 20 + approxArea * 18),
              x: sx,
              y: sy,
              anchorX: sx,
              anchorY: sy,
              hasLeader: false,
              title: rec.nombre,
              accent: '#6B7280',
              isSelected: false,
              provinciaId: rec.provinciaId,
              deptId: rec.id,
              estW: rec.nombre.length * 6.0 + 18,
              estH: 18,
            });
          }
        }
      }

      // 3) Etiquetas provinciales en vista nacional
      if (st.selectedId === null && camDist >= 10.5) {
        for (const item of provinciasData) {
          const pid = item.provincia.provincia_id;
          if (!item.dominante) continue;
          const allProds = [item.dominante, ...item.secundarios];
          if (st.activeProductId && !allProds.some((p) => p.producto_id === st.activeProductId)) {
            continue;
          }
          const displayProd =
            (st.activeProductId
              ? allProds.find((p) => p.producto_id === st.activeProductId)
              : null) ?? item.dominante;
          const accent = getCategoryAccent(displayProd.categoria);

          if (pid === '02') {
            const cabaW = projectWorld(-58.44, -34.61);
            if (cabaW) {
              const [ax, ay, ok] = toScreen(cabaW[0], 0.55, cabaW[1]);
              if (ok) {
                rawCandidates.push({
                  key: 'prov-02',
                  kind: 'caba',
                  priority: 85,
                  x: Math.min(width - 48, ax + 54),
                  y: ay - 10,
                  anchorX: ax,
                  anchorY: ay,
                  hasLeader: true,
                  title: 'CABA',
                  accent,
                  iconoId: displayProd.icono_id,
                  isSelected: false,
                  provinciaId: '02',
                  estW: 68,
                  estH: 22,
                });
              }
            }
            continue;
          }

          const rec = provRecords.get(pid);
          if (!rec) continue;
          const [sx, sy, ok] = toScreen(rec.centroid[0], rec.currentH + 0.08, rec.centroid[1]);
          if (!ok || sx < 28 || sx > width - 28 || sy < 34 || sy > height - 24) continue;

          const shortName =
            pid === '94'
              ? 'T. del Fuego'
              : pid === '86'
                ? 'Sgo. del Estero'
                : item.provincia.nombre;

          rawCandidates.push({
            key: `prov-${pid}`,
            kind: 'prov',
            priority: st.hoveredProvId === pid ? 92 : 65 + item.plantas.length * 2,
            x: sx,
            y: sy,
            anchorX: sx,
            anchorY: sy,
            hasLeader: false,
            title: shortName,
            badgeCount: item.secundarios.length > 0 && !st.activeProductId ? item.secundarios.length : undefined,
            accent,
            iconoId: displayProd.icono_id,
            isSelected: false,
            provinciaId: pid,
            estW: shortName.length * 6.3 + 38,
            estH: 22,
          });
        }
      }

      rawCandidates.sort((a, b) => b.priority - a.priority);

      const placedBoxes: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];
      const accepted: ProjectedOverlayLabel[] = [];

      for (const cand of rawCandidates) {
        // Las plantas intentan múltiples offsets verticales/laterales para que JAMÁS se oculte una fábrica
        const offsets: Array<[number, number]> =
          cand.kind === 'plant'
            ? [
                [0, 0],
                [0, -24],
                [0, 22],
                [-34, -14],
                [34, -14],
                [-42, 16],
                [42, 16],
              ]
            : cand.kind === 'dept-active'
              ? [
                  [0, 0],
                  [0, -22],
                  [0, 22],
                ]
              : [[0, 0]];

        let placed = false;
        for (const [dx, dy] of offsets) {
          const cx = Math.max(cand.estW / 2 + 8, Math.min(width - cand.estW / 2 - 8, cand.x + dx));
          const cy = Math.max(cand.estH / 2 + 38, Math.min(height - cand.estH / 2 - 14, cand.y + dy));
          const box = {
            x0: cx - cand.estW / 2,
            y0: cy - cand.estH / 2,
            x1: cx + cand.estW / 2,
            y1: cy + cand.estH / 2,
          };
          const pad = cand.kind === 'plant' ? 3 : 5;
          const hit = placedBoxes.some(
            (b) => !(box.x1 + pad < b.x0 || box.x0 - pad > b.x1 || box.y1 + pad < b.y0 || box.y0 - pad > b.y1)
          );
          if (!hit) {
            placedBoxes.push(box);
            accepted.push({
              ...cand,
              x: cx,
              y: cy,
              hasLeader: cand.hasLeader || Math.hypot(dx, dy) > 12,
            });
            placed = true;
            break;
          }
        }

        // Garantía estricta: si una planta colisionaba en los 7 intentos, igual se muestra desplazada arriba
        if (!placed && cand.kind === 'plant') {
          const fallbackY = Math.max(46, cand.y - 38);
          placedBoxes.push({
            x0: cand.x - cand.estW / 2,
            y0: fallbackY - cand.estH / 2,
            x1: cand.x + cand.estW / 2,
            y1: fallbackY + cand.estH / 2,
          });
          accepted.push({ ...cand, y: fallbackY, hasLeader: true });
        }
      }

      setLabels(accepted);

      const az = Math.round(THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()));
      setCompassDeg(az);
    };

    const tick = (now: number) => {
      rafId = 0;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      let needsMoreFrames = false;

      if (camAnim.active) {
        camAnim.t = Math.min(1, camAnim.t + dt / camAnim.duration);
        const ease = 1 - Math.pow(1 - camAnim.t, 3);
        controls.target.lerpVectors(camAnim.startTarget, camAnim.endTarget, ease);
        camera.position.lerpVectors(camAnim.startPos, camAnim.endPos, ease);
        if (camAnim.t >= 1) {
          camAnim.active = false;
        } else {
          needsMoreFrames = true;
        }
      }

      if (controls.update()) {
        needsMoreFrames = true;
      }

      // Animación elástica suave de alturas de prismas 3D (provincias y departamentos)
      const speed = Math.min(1, dt * 11);
      for (const rec of provRecords.values()) {
        if (Math.abs(rec.targetH - rec.currentH) > 0.003) {
          rec.currentH += (rec.targetH - rec.currentH) * speed;
          rec.mesh.scale.y = Math.max(0.04, rec.currentH);
          rec.edgeLines.position.y = rec.currentH + 0.007;
          needsMoreFrames = true;
        }
      }
      for (const rec of deptRecords.values()) {
        if (Math.abs(rec.targetH - rec.currentH) > 0.003) {
          rec.currentH += (rec.targetH - rec.currentH) * speed;
          rec.mesh.scale.y = Math.max(0.04, rec.currentH);
          rec.edgeLines.position.y = rec.currentH + 0.008;
          needsMoreFrames = true;
        }
      }

      renderer.render(scene, camera);

      labelTickCounter++;
      if (!needsMoreFrames || labelTickCounter % 2 === 0) {
        updateProjectedOverlays();
      }

      if (needsMoreFrames) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const requestRender = () => {
      if (rafId === 0) {
        lastTime = performance.now();
        rafId = window.requestAnimationFrame(tick);
      }
    };

    controls.addEventListener('change', requestRender);
    controls.addEventListener('start', () => {
      camAnim.active = false;
    });

    const flyTo = (
      target: [number, number, number],
      distance: number,
      polarDeg = 44,
      azimuthDeg = -6
    ) => {
      camAnim.startTarget.copy(controls.target);
      camAnim.endTarget.set(target[0], target[1], target[2]);
      camAnim.startPos.copy(camera.position);

      const polar = THREE.MathUtils.degToRad(polarDeg);
      const azim = THREE.MathUtils.degToRad(azimuthDeg);
      const sinP = Math.sin(polar);
      camAnim.endPos.set(
        target[0] + distance * sinP * Math.sin(azim),
        target[1] + distance * Math.cos(polar),
        target[2] + distance * sinP * Math.cos(azim)
      );
      camAnim.t = 0;
      camAnim.active = true;
      requestRender();
    };

    const zoomBy = (factor: number) => {
      const offset = camera.position.clone().sub(controls.target);
      const nextLen = THREE.MathUtils.clamp(offset.length() / factor, controls.minDistance, controls.maxDistance);
      offset.setLength(nextLen);
      camAnim.startTarget.copy(controls.target);
      camAnim.endTarget.copy(controls.target);
      camAnim.startPos.copy(camera.position);
      camAnim.endPos.copy(controls.target).add(offset);
      camAnim.t = 0;
      camAnim.duration = 0.28;
      camAnim.active = true;
      requestRender();
      camAnim.duration = 0.58;
    };

    const resetNorthTilt = () => {
      const dist = camera.position.distanceTo(controls.target);
      flyTo([controls.target.x, controls.target.y, controls.target.z], dist, 44, 0);
    };

    const disposeGroupChildren = (grp: THREE.Group) => {
      while (grp.children.length > 0) {
        const obj = grp.children[0]!;
        grp.remove(obj);
        obj.traverse((child) => {
          const m = child as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (m.material) {
            if (Array.isArray(m.material)) m.material.forEach((mt) => mt.dispose());
            else m.material.dispose();
          }
        });
      }
    };

    const syncStylesAndTargets = () => {
      const st = stateRef.current;

      for (const [pid, rec] of provRecords.entries()) {
        const info = dataById.get(pid);
        const allProds = info?.dominante ? [info.dominante, ...info.secundarios] : [];
        const matchesFilter =
          st.activeProductId !== null && allProds.some((p) => p.producto_id === st.activeProductId);
        const filtProd = st.activeProductId ? prodById.get(st.activeProductId) : undefined;
        const accent =
          matchesFilter && filtProd
            ? getCategoryAccent(filtProd.categoria)
            : info?.dominante
              ? getCategoryAccent(info.dominante.categoria)
              : '#52555E';

        const isSel = st.selectedId === pid;
        const isHov = st.hoveredProvId === pid && st.hoveredDeptId === null;

        // Cuando la provincia está enfocada y tenemos sus departamentos cargados, bajamos su losa base
        // para que todos sus partidos internos formen el relieve protagonista sin z-fighting!
        const hasChildDeptsRendered = [...deptRecords.values()].some((d) => d.provinciaId === pid);

        if (st.selectedId !== null) {
          if (isSel) {
            rec.mesh.visible = !hasChildDeptsRendered;
            rec.edgeLines.visible = true;
            rec.targetH = hasChildDeptsRendered ? 0.06 : 0.78;
            rec.topMat.color.set('#F4F3EE');
            rec.sideMat.color.set(darkerSideHex(accent));
            rec.edgeMat.color.set(accent);
            rec.edgeMat.opacity = 0.95;
          } else {
            rec.mesh.visible = true;
            rec.edgeLines.visible = true;
            rec.targetH = isHov ? 0.3 : 0.15;
            rec.topMat.color.set(isHov ? '#ECECE6' : '#E5E6E1');
            rec.sideMat.color.set('#C5CAD4');
            rec.edgeMat.color.set('#9DA4B0');
            rec.edgeMat.opacity = 0.58;
          }
        } else {
          rec.mesh.visible = true;
          rec.edgeLines.visible = true;
          if (st.activeProductId !== null) {
            rec.targetH = matchesFilter ? (isHov ? 1.12 : 0.96) : 0.24;
            rec.topMat.color.set(matchesFilter ? accent : '#EBEBE7');
            rec.sideMat.color.set(matchesFilter ? darkerSideHex(accent) : '#C6CBD4');
            rec.edgeMat.color.set(matchesFilter ? '#FFFFFF' : '#A4ABB6');
            rec.edgeMat.opacity = matchesFilter ? 0.95 : 0.55;
          } else if (isHov) {
            rec.targetH = 0.94;
            rec.topMat.color.set(accent);
            rec.sideMat.color.set(darkerSideHex(accent));
            rec.edgeMat.color.set('#FFFFFF');
            rec.edgeMat.opacity = 1;
          } else {
            // Relieve nacional escalonado según densidad industrial (1 a 4+ plantas) para lectura 3D inmediata
            const plantBoost = Math.min(0.28, (info?.plantas.length ?? 1) * 0.06);
            rec.targetH = 0.56 + plantBoost;
            rec.topMat.color.set('#F7F7F4');
            rec.sideMat.color.set('#9DA6B6');
            rec.edgeMat.color.set('#1C1E22');
            rec.edgeMat.opacity = 0.88;
          }
        }
      }

      for (const [did, rec] of deptRecords.entries()) {
        const info = deptById.get(did);
        const isSel = st.selectedDeptId === did;
        const isHov = st.hoveredDeptId === did;

        if (info) {
          const matchesFilter =
            st.activeProductId === null ||
            info.productos.some((p) => p.producto_id === st.activeProductId);
          const zonaHex = getZoneHex(info.departamento.tipo_zona);

          if (!matchesFilter) {
            rec.targetH = 0.34;
            rec.topMat.color.set('#ECEBE6');
            rec.sideMat.color.set('#C3C8D2');
            rec.edgeMat.color.set('#969CA8');
            rec.edgeMat.opacity = 0.65;
          } else if (isSel) {
            rec.targetH = 1.54;
            rec.topMat.color.set(zonaHex);
            rec.sideMat.color.set(darkerSideHex(zonaHex));
            rec.edgeMat.color.set('#FFFFFF');
            rec.edgeMat.opacity = 1;
          } else if (isHov) {
            rec.targetH = 1.34;
            rec.topMat.color.set(zonaHex);
            rec.sideMat.color.set(darkerSideHex(zonaHex));
            rec.edgeMat.color.set('#FFFFFF');
            rec.edgeMat.opacity = 1;
          } else {
            rec.targetH = 1.12;
            rec.topMat.color.set(zonaHex);
            rec.sideMat.color.set(darkerSideHex(zonaHex));
            rec.edgeMat.color.set('#F7F7F5');
            rec.edgeMat.opacity = 0.92;
          }
        } else {
          // Partido vecino de contexto (piedra arquitectónica en relieve bajo)
          rec.targetH = isHov ? 0.54 : 0.34;
          rec.topMat.color.set(isHov ? '#E6E5DD' : '#F2F1EC');
          rec.sideMat.color.set(isHov ? '#B4BBC7' : '#C8CDD6');
          rec.edgeMat.color.set(isHov ? '#1C1E22' : '#9AA1AE');
          rec.edgeMat.opacity = isHov ? 0.9 : 0.68;
        }
      }

      requestRender();
    };

    // Raycasting limpio para hover y click sobre provincias, partidos y fábricas 3D
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let movedDrag = false;

    const pickScene = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);

      // 1) Probar mini-plantas 3D primero
      if (plantsGroup.children.length > 0) {
        const plantHits = raycaster.intersectObjects(plantsGroup.children, true);
        for (const h of plantHits) {
          let cur: THREE.Object3D | null = h.object;
          while (cur) {
            if (cur.userData?.kind === 'planta') {
              return {
                kind: 'planta' as const,
                planta: cur.userData.planta as PlantaConEmpresa,
                x: clientX - rect.left,
                y: clientY - rect.top,
              };
            }
            cur = cur.parent;
          }
        }
      }

      // 2) Probar departamentos visibles
      if (deptosGroup.children.length > 0) {
        const deptMeshes = [...deptRecords.values()].filter((r) => r.mesh.visible).map((r) => r.mesh);
        const deptHits = raycaster.intersectObjects(deptMeshes, false);
        if (deptHits[0]) {
          const ud = deptHits[0].object.userData as {
            id: string;
            provinciaId: string;
            nombre: string;
            activo: boolean;
          };
          return {
            kind: 'depto' as const,
            id: ud.id,
            provinciaId: ud.provinciaId,
            nombre: ud.nombre,
            activo: ud.activo,
            x: clientX - rect.left,
            y: clientY - rect.top,
          };
        }
      }

      // 3) Probar provincias
      const provMeshes = [...provRecords.values()].filter((r) => r.mesh.visible).map((r) => r.mesh);
      const provHits = raycaster.intersectObjects(provMeshes, false);
      if (provHits[0]) {
        const ud = provHits[0].object.userData as { id: string };
        return {
          kind: 'provincia' as const,
          id: ud.id,
          x: clientX - rect.left,
          y: clientY - rect.top,
        };
      }

      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      movedDrag = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) {
        movedDrag = true;
      }
      if (e.pointerType === 'touch') return;

      const hit = pickScene(e.clientX, e.clientY);
      const st = stateRef.current;

      if (!hit) {
        if (st.hoveredProvId !== null || st.hoveredDeptId !== null) {
          st.hoveredProvId = null;
          st.hoveredDeptId = null;
          setHoverBanner(null);
          canvas.style.cursor = 'grab';
          syncStylesAndTargets();
        }
        return;
      }

      canvas.style.cursor = 'pointer';

      if (hit.kind === 'planta') {
        const prod = prodById.get(hit.planta.producto_id);
        st.hoveredProvId = hit.planta.provincia_id;
        st.hoveredDeptId = hit.planta.departamento_id ?? null;
        setHoverBanner({
          title: hit.planta.nombre,
          subtitle: `${hit.planta.localidad} · ${prod?.nombre ?? hit.planta.producto_id}`,
          accent: prod ? getCategoryAccent(prod.categoria) : '#0A42E0',
          x: hit.x,
          y: hit.y,
        });
        syncStylesAndTargets();
        return;
      }

      if (hit.kind === 'depto') {
        if (st.hoveredDeptId !== hit.id) {
          st.hoveredProvId = hit.provinciaId;
          st.hoveredDeptId = hit.id;
          syncStylesAndTargets();
        }
        const info = deptById.get(hit.id);
        setHoverBanner({
          title: hit.nombre,
          subtitle: info
            ? `${info.plantas.length} ${info.plantas.length === 1 ? 'planta registrada' : 'plantas registradas'} · Click para acercar`
            : 'Partido de referencia territorial · Sin plantas relevadas',
          accent: info ? getZoneHex(info.departamento.tipo_zona) : '#6B7280',
          x: hit.x,
          y: hit.y,
        });
        return;
      }

      if (hit.kind === 'provincia') {
        if (st.hoveredProvId !== hit.id || st.hoveredDeptId !== null) {
          st.hoveredProvId = hit.id;
          st.hoveredDeptId = null;
          prefetchProvinceGeo(hit.id);
          syncStylesAndTargets();
        }
        const pInfo = dataById.get(hit.id);
        if (pInfo) {
          setHoverBanner({
            title: pInfo.provincia.nombre,
            subtitle: `${pInfo.plantas.length} ${pInfo.plantas.length === 1 ? 'planta' : 'plantas'} · ${pInfo.departamentosConfiables.length} ${pInfo.departamentosConfiables.length === 1 ? 'localidad activa' : 'localidades activas'}`,
            accent: pInfo.dominante ? getCategoryAccent(pInfo.dominante.categoria) : '#111214',
            x: hit.x,
            y: hit.y,
          });
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (movedDrag || e.button > 0) return;
      const hit = pickScene(e.clientX, e.clientY);
      const st = stateRef.current;
      if (!hit) {
        if (st.selectedDeptId !== null) {
          st.onSelectDepartamento(null);
        }
        return;
      }

      if (hit.kind === 'planta') {
        st.onSelectPlanta(hit.planta);
        return;
      }

      if (hit.kind === 'depto') {
        if (hit.activo) {
          st.onSelectDepartamento(st.selectedDeptId === hit.id ? null : hit.id);
        } else if (st.selectedDeptId !== null) {
          st.onSelectDepartamento(null);
        }
        return;
      }

      if (hit.kind === 'provincia') {
        st.onSelectProvincia(hit.id);
      }
    };

    const onPointerLeave = () => {
      stateRef.current.hoveredProvId = null;
      stateRef.current.hoveredDeptId = null;
      setHoverBanner(null);
      syncStylesAndTargets();
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
      requestRender();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    const resizeObserver = new ResizeObserver(() => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      requestRender();
    });
    resizeObserver.observe(container);

    engineRef.current = {
      requestRender,
      flyTo,
      zoomBy,
      resetNorthTilt,
      provRecords,
      deptRecords,
      syncDeptLayer: () => {},
      syncPlantsLayer: () => {},
      syncStylesAndTargets,
    };

    // Métodos para reconstruir dinámicamente solo los departamentos y plantas del foco actual
    engineRef.current.syncDeptLayer = () => {
      disposeGroupChildren(deptosGroup);
      deptRecords.clear();

      const st = stateRef.current;
      const featuresToBuild: Array<{
        id: string;
        nombre: string;
        provinciaId: string;
        activo: boolean;
        geometry: { type: string; coordinates?: unknown } | null | undefined;
      }> = [];

      const shard = engineShardRef.current;
      if (st.selectedId !== null && shard && shard.provincia_id === st.selectedId) {
        for (const f of shard.features) {
          featuresToBuild.push({
            id: f.properties.id,
            nombre: f.properties.nombre,
            provinciaId: f.properties.provincia_id,
            activo: f.properties.activo,
            geometry: f.geometry,
          });
        }
      } else if (st.selectedId !== null || st.showAllDeptos) {
        for (const f of departamentosGeo.features) {
          if (st.selectedId !== null && !st.showAllDeptos && f.properties.provincia_id !== st.selectedId) {
            continue;
          }
          featuresToBuild.push({
            id: f.properties.id,
            nombre: f.properties.nombre,
            provinciaId: f.properties.provincia_id,
            activo: true,
            geometry: f.geometry,
          });
        }
      }

      // Si además se activó "Deptos (todos)" con una provincia enfocada, sumar los activos del resto del país
      if (st.selectedId !== null && st.showAllDeptos) {
        const existing = new Set(featuresToBuild.map((x) => x.id));
        for (const f of departamentosGeo.features) {
          if (existing.has(f.properties.id)) continue;
          featuresToBuild.push({
            id: f.properties.id,
            nombre: f.properties.nombre,
            provinciaId: f.properties.provincia_id,
            activo: true,
            geometry: f.geometry,
          });
        }
      }

      for (const item of featuresToBuild) {
        const built = buildExtrudedPrismGeometry(item.geometry, projectCoord);
        if (!built) continue;

        const initH = item.activo ? 0.55 : 0.22;
        const topMat = new THREE.MeshStandardMaterial({
          color: item.activo ? '#0A42E0' : '#F2F1EC',
          roughness: 0.72,
          metalness: 0.03,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        });
        const sideMat = new THREE.MeshStandardMaterial({
          color: item.activo ? '#06288F' : '#C8CDD6',
          roughness: 0.8,
          metalness: 0.04,
        });
        const mesh = new THREE.Mesh(built.geo, [topMat, sideMat]);
        mesh.scale.y = initH;
        mesh.userData = {
          kind: 'depto',
          id: item.id,
          provinciaId: item.provinciaId,
          nombre: item.nombre,
          activo: item.activo,
        };
        deptosGroup.add(mesh);

        const edgeMat = new THREE.LineBasicMaterial({
          color: item.activo ? '#FFFFFF' : '#9AA1AE',
          transparent: true,
          opacity: item.activo ? 0.92 : 0.68,
        });
        const edgeLines = new THREE.LineSegments(built.topEdges, edgeMat);
        edgeLines.position.y = initH + 0.008;
        deptosGroup.add(edgeLines);

        deptRecords.set(item.id, {
          id: item.id,
          kind: 'depto',
          provinciaId: item.provinciaId,
          nombre: item.nombre,
          activo: item.activo,
          mesh,
          topMat,
          sideMat,
          edgeLines,
          edgeMat,
          centroid: built.centroid,
          bounds: built.bounds,
          currentH: initH,
          targetH: initH,
        });
      }

      syncStylesAndTargets();
    };

    engineRef.current.syncPlantsLayer = () => {
      disposeGroupChildren(plantsGroup);
      plantNodes = [];

      const st = stateRef.current;
      // Mostrar mini-plantas 3D al entrar a una provincia/departamento, al filtrar por producto o al activar "Deptos"
      if (st.selectedId === null && !st.showAllDeptos && st.activeProductId === null) {
        requestRender();
        return;
      }

      for (const provItem of provinciasData) {
        if (st.selectedId !== null && provItem.provincia.provincia_id !== st.selectedId) continue;

        for (const pl of provItem.plantas) {
          if (st.activeProductId !== null && pl.producto_id !== st.activeProductId) continue;
          // Mantenemos visibles también las demás plantas de la provincia en segundo plano si no hay filtro,
          // o enfocamos las del departamento cuando hay departamento seleccionado
          if (st.selectedDeptId !== null && pl.departamento_id !== st.selectedDeptId) continue;

          const w = projectWorld(pl.lon, pl.lat);
          const prod = prodById.get(pl.producto_id);
          if (!w || !prod) continue;

          const accent = getCategoryAccent(prod.categoria);
          const factoryGroup = buildMiniFactoryMesh(prod.categoria, accent);
          factoryGroup.userData = { kind: 'planta', planta: pl };
          plantsGroup.add(factoryGroup);

          const dotGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.25, 14);
          const dotMat = new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.5 });
          const baseDot = new THREE.Mesh(dotGeo, dotMat);
          plantsGroup.add(baseDot);

          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(w[0], 0.5, w[1]),
            new THREE.Vector3(w[0], 0.5, w[1]),
          ]);
          const lineMat = new THREE.LineBasicMaterial({ color: '#111214', transparent: true, opacity: 0.78 });
          const leaderLine = new THREE.Line(lineGeo, lineMat);
          plantsGroup.add(leaderLine);

          plantNodes.push({
            planta: pl,
            producto: prod,
            baseX: w[0],
            baseZ: w[1],
            fanX: w[0],
            fanZ: w[1],
            topY: 1.1,
            group: factoryGroup,
            leaderLine,
            baseDot,
          });
        }
      }

      requestRender();
    };

    // Referencia interna para controles táctiles adaptativos
    (engineRef.current as unknown as { controls: OrbitControls }).controls = controls;

    syncStylesAndTargets();
    controls.update();
    renderer.render(scene, camera);
    updateProjectedOverlays();
    requestRender();

    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      disposeGroupChildren(provincesGroup);
      disposeGroupChildren(deptosGroup);
      disposeGroupChildren(plantsGroup);
      controls.dispose();
      renderer.dispose();
      engineRef.current = null;
    };
  }, [continentalGeo, departamentosGeo, provinciasData, dataById, deptById, prodById, projectCoord, projectWorld]);

  // Ref sincronizada del shard GeoJSON provincial para el builder imperativo
  const engineShardRef = useRef(provinceShard);
  engineShardRef.current = provinceShard;

  // Coordinación de gestos en celular: en vista nacional 1 dedo scrollea la página sin bloqueo,
  // y al entrar a una provincia (o activar Mover 3D) 1 dedo orbita libremente
  useEffect(() => {
    const eng = engineRef.current as unknown as { controls?: OrbitControls } | null;
    if (!eng?.controls) return;
    if (!isCoarsePointer) {
      eng.controls.enableRotate = true;
      eng.controls.enablePan = true;
      return;
    }
    const interactiveTouch = selectedId !== null || touchFreeOrbit;
    eng.controls.enableRotate = interactiveTouch;
    eng.controls.enablePan = interactiveTouch;
  }, [isCoarsePointer, selectedId, touchFreeOrbit]);

  // Rueda no invasiva en desktop: Ctrl + rueda acerca siempre; rueda normal no bloquea scroll salvo Rueda libre o fullscreen
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let hintTimer: number | undefined;

    const onWheel = (e: WheelEvent) => {
      const eng = engineRef.current;
      if (!eng) return;

      if (e.ctrlKey || e.metaKey || wheelUnlocked || isFullscreen) {
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.0022);
        eng.zoomBy(factor);
        return;
      }

      setWheelHint(true);
      window.clearTimeout(hintTimer);
      hintTimer = window.setTimeout(() => setWheelHint(false), 2100);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.clearTimeout(hintTimer);
      el.removeEventListener('wheel', onWheel);
    };
  }, [wheelUnlocked, isFullscreen]);

  // Sincronizar capa de partidos/departamentos y plantas cuando cambia foco, shard o filtro
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.syncDeptLayer();
    eng.syncPlantsLayer();
    eng.syncStylesAndTargets();
  }, [selectedId, selectedDeptId, selectedPlantaId, activeProductId, showAllDeptos, provinceShard]);

  // Vuelo automático de cámara al cambiar provincia, departamento o planta seleccionada
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;

    if (selectedDeptId) {
      // Buscar bounds en deptRecords o calcular desde departamentosGeo
      const rec = eng.deptRecords.get(selectedDeptId);
      if (rec) {
        const bw = Math.max(0.25, rec.bounds[1][0] - rec.bounds[0][0]);
        const bz = Math.max(0.25, rec.bounds[1][1] - rec.bounds[0][1]);
        const span = Math.max(bw, bz);
        const dist = THREE.MathUtils.clamp(span * 3.1, 2.7, 8.5);
        eng.flyTo([rec.centroid[0], 0.9, rec.centroid[1]], dist, 47, -8);
        return;
      }
      const feat = departamentosGeo.features.find((f) => f.properties.id === selectedDeptId);
      if (feat) {
        const built = buildExtrudedPrismGeometry(feat.geometry, projectCoord);
        if (built) {
          const span = Math.max(built.bounds[1][0] - built.bounds[0][0], built.bounds[1][1] - built.bounds[0][1]);
          built.geo.dispose();
          built.topEdges.dispose();
          eng.flyTo([built.centroid[0], 0.9, built.centroid[1]], THREE.MathUtils.clamp(span * 3.1, 2.7, 8.5), 47, -8);
          return;
        }
      }
    }

    if (selectedId) {
      if (selectedId === '02') {
        const cabaW = projectWorld(-58.44, -34.61);
        if (cabaW) {
          eng.flyTo([cabaW[0], 0.7, cabaW[1]], 2.9, 46, -6);
          return;
        }
      }
      const rec = eng.provRecords.get(selectedId);
      if (rec) {
        const bw = Math.max(0.6, rec.bounds[1][0] - rec.bounds[0][0]);
        const bz = Math.max(0.6, rec.bounds[1][1] - rec.bounds[0][1]);
        const cx = (rec.bounds[0][0] + rec.bounds[1][0]) * 0.5;
        const cz = (rec.bounds[0][1] + rec.bounds[1][1]) * 0.5;
        const span = Math.max(bw, bz);
        const dist = THREE.MathUtils.clamp(span * 2.42, 4.8, 17.8);
        eng.flyTo([cx, 0.45, cz], dist, 43, -6);
        return;
      }
    }

    // Vista nacional bicontinental en perspectiva 3D completa (de Jujuy a Tierra del Fuego)
    eng.flyTo([0.25, 0, -0.25], 36.5, 38, -5);
  }, [selectedId, selectedDeptId, departamentosGeo, projectCoord, projectWorld]);

  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  }, []);

  return (
    <div
      ref={stageRef}
      className={`relative flex w-full items-center justify-center overflow-hidden bg-sea-basin ${
        isFullscreen ? 'h-screen' : 'h-[520px] sm:h-[640px] lg:h-[720px]'
      }`}
    >
      <canvas
        ref={canvasRef}
        aria-label="Mapa 3D interactivo de provincias, localidades y plantas industriales de Argentina"
        className="block h-full w-full"
        style={{
          touchAction: isCoarsePointer && selectedId === null && !touchFreeOrbit ? 'pan-y' : 'none',
        }}
      />

      {/* Líneas guía SVG para etiquetas desplazadas en abanico (plantas múltiples y CABA) */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      >
        {labels
          .filter((l) => l.hasLeader)
          .map((l) => (
            <g key={`ldr-${l.key}`}>
              <line
                x1={l.anchorX}
                y1={l.anchorY}
                x2={l.x}
                y2={l.y}
                stroke="#111214"
                strokeWidth={l.kind === 'plant' ? 1.25 : 1}
                strokeDasharray={l.kind === 'caba' ? '3 2.5' : undefined}
                opacity={0.78}
              />
              <circle cx={l.anchorX} cy={l.anchorY} r={2.6} fill={l.accent} stroke="#FFFFFF" strokeWidth={1} />
            </g>
          ))}
      </svg>

      {/* Capa de etiquetas interactivas nítidas sin colisiones */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {labels.map((lbl) => {
          if (lbl.kind === 'dept-context') {
            return (
              <div
                key={lbl.key}
                style={{ transform: `translate(${lbl.x}px, ${lbl.y}px) translate(-50%, -50%)` }}
                className="absolute left-0 top-0 inline-flex items-center gap-1 whitespace-nowrap rounded-xs bg-stone-surface/82 px-1.5 py-0.5 text-[10.5px] font-medium text-ink-muted shadow-2xs backdrop-blur-[1px]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-ink-muted/65" />
                <span>{lbl.title}</span>
              </div>
            );
          }

          if (lbl.kind === 'plant' && lbl.planta) {
            return (
              <button
                key={lbl.key}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPlanta(lbl.planta!);
                }}
                style={{
                  transform: `translate(${lbl.x}px, ${lbl.y}px) translate(-50%, -50%)`,
                  borderColor: lbl.isSelected ? lbl.accent : '#111214',
                }}
                className={`bencho-press pointer-events-auto absolute left-0 top-0 inline-flex cursor-pointer items-center gap-1.5 border px-2 py-1 text-left shadow-md transition-colors duration-150 ${
                  lbl.isSelected
                    ? 'bg-ink text-white ring-2 ring-white'
                    : 'bg-stone-surface/96 text-ink hover:bg-ink hover:text-white'
                }`}
              >
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center text-white"
                  style={{ backgroundColor: lbl.accent }}
                >
                  {lbl.iconoId ? <ProductIcon iconId={lbl.iconoId} size={11} /> : null}
                </span>
                <span className="leading-none">
                  <span className="block whitespace-nowrap text-[11px] font-semibold">
                    {lbl.title}
                  </span>
                  {lbl.subtitle && (
                    <span
                      className={`mt-0.5 block whitespace-nowrap text-[9.5px] ${
                        lbl.isSelected ? 'text-white/75' : 'text-ink-muted'
                      }`}
                    >
                      {lbl.subtitle}
                    </span>
                  )}
                </span>
              </button>
            );
          }

          if (lbl.kind === 'dept-active') {
            return (
              <button
                key={lbl.key}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (lbl.deptId) onSelectDepartamento(selectedDeptId === lbl.deptId ? null : lbl.deptId);
                }}
                style={{ transform: `translate(${lbl.x}px, ${lbl.y}px) translate(-50%, -50%)` }}
                className={`bencho-press pointer-events-auto absolute left-0 top-0 inline-flex cursor-pointer items-center gap-1.5 border px-2 py-0.5 text-[11px] font-semibold shadow-sm transition-colors duration-150 ${
                  lbl.isSelected
                    ? 'border-white bg-ink text-white'
                    : 'border-ink bg-stone-surface/95 text-ink hover:bg-ink hover:text-white'
                }`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/80"
                  style={{ backgroundColor: lbl.accent }}
                />
                <span className="whitespace-nowrap">{lbl.title}</span>
                {lbl.subtitle && (
                  <span className="bg-cobalt px-1 py-0.2 text-[9.5px] font-semibold text-white tabular-nums">
                    {lbl.subtitle}
                  </span>
                )}
              </button>
            );
          }

          // Etiqueta provincial / CABA en vista nacional
          return (
            <button
              key={lbl.key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectProvincia(lbl.provinciaId);
              }}
              style={{ transform: `translate(${lbl.x}px, ${lbl.y}px) translate(-50%, -50%)` }}
              className="bencho-press pointer-events-auto absolute left-0 top-0 inline-flex cursor-pointer items-center gap-1.5 border border-ink/85 bg-stone-surface/94 px-2 py-0.5 text-[11px] font-medium text-ink shadow-xs transition-colors duration-150 hover:bg-ink hover:text-white"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: lbl.accent }}
              />
              <span className="whitespace-nowrap">{lbl.title}</span>
              {lbl.badgeCount !== undefined && lbl.badgeCount > 0 && (
                <span className="bg-ink px-1 text-[9.5px] font-semibold text-white tabular-nums">
                  +{lbl.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Aviso discreto de rueda no invasiva (desktop) */}
      {wheelHint && (
        <div className="pointer-events-none absolute bottom-14 left-1/2 z-30 -translate-x-1/2 border border-ink bg-ink/94 px-3 py-1.5 text-[12px] font-medium text-white shadow-md">
          Usá Ctrl + rueda para acercar o activá Rueda libre a la derecha
        </div>
      )}

      {/* Botón en celular cuando está en vista país para alternar entre scroll de página y órbita 3D con 1 dedo */}
      {isCoarsePointer && selectedId === null && (
        <button
          type="button"
          onClick={() => setTouchFreeOrbit((v) => !v)}
          className={`bencho-press absolute bottom-3.5 left-3.5 z-20 inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[12px] font-medium shadow-xs ${
            touchFreeOrbit
              ? 'border-cobalt bg-cobalt text-white'
              : 'border-rule bg-stone-surface/95 text-ink'
          }`}
        >
          <MousePointerClick className="h-3.5 w-3.5" />
          <span>{touchFreeOrbit ? 'Órbita 3D activa' : 'Tocá provincia o usá 2 dedos'}</span>
        </button>
      )}

      {/* Controles flotantes derechos estilo instrumentos cartográficos (Zoom, Brújula/Inclinación, Rueda, Fullscreen) */}
      <div className="absolute right-3.5 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1.5">
        <button
          type="button"
          onClick={() => engineRef.current?.zoomBy(1.4)}
          aria-label="Acercar cámara 3D"
          title="Acercar"
          className="bencho-press flex h-9 w-9 cursor-pointer items-center justify-center border border-rule bg-stone-surface/95 text-ink shadow-xs transition-colors duration-150 hover:bg-ink hover:text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => engineRef.current?.zoomBy(1 / 1.4)}
          aria-label="Alejar cámara 3D"
          title="Alejar"
          className="bencho-press flex h-9 w-9 cursor-pointer items-center justify-center border border-rule bg-stone-surface/95 text-ink shadow-xs transition-colors duration-150 hover:bg-ink hover:text-white"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => engineRef.current?.resetNorthTilt()}
          aria-label="Enderezar norte e inclinación 3D"
          title="Enderezar norte e inclinación"
          className="bencho-press flex h-9 w-9 cursor-pointer items-center justify-center border border-rule bg-stone-surface/95 text-ink shadow-xs transition-colors duration-150 hover:bg-ink hover:text-white"
        >
          <Compass
            className="h-4 w-4 transition-transform duration-150"
            style={{ transform: `rotate(${-compassDeg}deg)` }}
          />
        </button>
        {!isCoarsePointer && (
          <button
            type="button"
            aria-pressed={wheelUnlocked}
            onClick={() => setWheelUnlocked((v) => !v)}
            title={wheelUnlocked ? 'Rueda libre activa (click para liberar scroll)' : 'Activar zoom directo con rueda'}
            className={`bencho-press flex h-9 w-9 cursor-pointer items-center justify-center border text-[10px] font-semibold shadow-xs transition-colors duration-150 ${
              wheelUnlocked
                ? 'border-cobalt bg-cobalt text-white'
                : 'border-rule bg-stone-surface/95 text-ink hover:bg-ink hover:text-white'
            }`}
          >
            Z
          </button>
        )}
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Ver mapa 3D en pantalla completa'}
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          className="bencho-press flex h-9 w-9 cursor-pointer items-center justify-center border border-rule bg-stone-surface/95 text-ink shadow-xs transition-colors duration-150 hover:bg-ink hover:text-white"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
        </button>
        {(selectedId !== null || selectedDeptId !== null) && (
          <button
            type="button"
            onClick={() => onSelectProvincia(null)}
            aria-label="Volver al mapa completo de Argentina"
            title="Volver al país completo"
            className="bencho-press flex h-9 w-9 cursor-pointer items-center justify-center border border-ink bg-ink text-white shadow-xs transition-colors duration-150 hover:bg-cobalt"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Píldoras contextuales rápidas de navegación territorial (estilo capturas 2 y 3) */}
      {selectedId !== null && (
        <div className="absolute left-4 top-13 z-20 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelectProvincia(null)}
            className="bencho-press cursor-pointer border border-ink bg-ink px-2.5 py-1 text-[12px] font-medium text-white shadow-xs transition-colors duration-150 hover:bg-cobalt"
          >
            ← Volver al país
          </button>
          {selectedDeptId !== null && dataById.get(selectedId) && (
            <button
              type="button"
              onClick={() => onSelectDepartamento(null)}
              className="bencho-press cursor-pointer border border-rule bg-stone-surface/95 px-2.5 py-1 text-[12px] font-medium text-ink shadow-xs transition-colors duration-150 hover:bg-ink hover:text-white"
            >
              ← {dataById.get(selectedId)!.provincia.nombre}
            </button>
          )}
          {loadingShard && (
            <span className="pointer-events-none border border-rule bg-stone-surface/95 px-2 py-1 text-[11px] font-medium text-ink-muted shadow-xs">
              Cargando partidos...
            </span>
          )}
        </div>
      )}

      {/* Tooltip flotante en desktop al pasar sobre provincias, partidos o fábricas */}
      {hoverBanner && !isCoarsePointer && (
        <div
          style={{
            left: Math.min(hoverBanner.x + 16, (stageRef.current?.clientWidth ?? 520) - 252),
            top: Math.max(hoverBanner.y - 18, 52),
          }}
          className="pointer-events-none absolute z-30 hidden w-60 border border-ink bg-ink px-3.5 py-2.5 text-white shadow-lg sm:block"
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: hoverBanner.accent }}
            />
            <p className="truncate text-[13px] font-medium text-white">{hoverBanner.title}</p>
          </div>
          <p className="mt-1 text-[12px] leading-snug text-white/80 tabular-nums">
            {hoverBanner.subtitle}
          </p>
        </div>
      )}

      {/* Blindaje ante pérdida de contexto WebGL (AGENTS.md §5) */}
      {contextLost && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-stone-surface/95 p-6 text-center">
          <p className="font-display text-[17px] font-medium text-ink">
             El navegador pausó la aceleración 3D del mapa
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bencho-press cursor-pointer bg-ink px-4 py-2 text-[13px] font-medium text-white hover:bg-cobalt"
          >
            Reactivar escena 3D
          </button>
        </div>
      )}
    </div>
  );
});

export default ArgentinaMap3DStage;
