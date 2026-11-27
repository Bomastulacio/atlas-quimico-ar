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

interface OverlayDescriptor {
  key: string;
  kind: 'prov' | 'caba' | 'dept-active' | 'dept-context' | 'plant';
  priority: number;
  wx: number;
  wz: number;
  provId: string;
  deptId?: string;
  planta?: PlantaConEmpresa;
  title: string;
  specialty?: string;
  badgeCount?: number;
  accent: string;
  iconoId?: string;
  isSelected: boolean;
  estW: number;
  estH: number;
  approxArea?: number;
  fanIndex?: number;
  fanTotal?: number;
}

interface HoverCardMeta {
  idKey: string;
  title: string;
  subtitle: string;
  accent: string;
}

interface BuiltGeoEntry {
  geo: THREE.ExtrudeGeometry;
  topEdges: THREE.BufferGeometry;
  centroid: [number, number];
  bounds: [[number, number], [number, number]];
}

interface PrismRecord {
  id: string;
  kind: 'provincia' | 'depto';
  provinciaId: string;
  nombre: string;
  activo: boolean;
  mesh: THREE.Mesh;
  topMat: THREE.MeshLambertMaterial;
  sideMat: THREE.MeshLambertMaterial;
  edgeLines: THREE.LineSegments;
  edgeMat: THREE.LineBasicMaterial;
  centroid: [number, number];
  bounds: [[number, number], [number, number]];
  currentH: number;
  targetH: number;
}

const PROJ_W = 570;
const PROJ_H = 756;
const WORLD_SCALE = 0.042;
const CENTER_PX = 285;
const CENTER_PY = 378;

// Alturas contenidas: en reposo queda en color al ras; al hover sube apenas; al click recién emerge el bloque 3D
const H_NEIGHBOR_DIM = 0.14;
const H_STONE_BASE = 0.22;
const H_COLOR_REST = 0.25;
const H_HOVER_SUBTLE = 0.36;
const H_CLICK_SELECTED = 0.76;

// Caché en memoria a nivel módulo de geometrías trianguladas para no recalcular ExtrudeGeometry al cambiar de vista
const provBuiltGeoCache = new Map<string, BuiltGeoEntry>();
const deptBuiltGeoCache = new Map<string, BuiltGeoEntry>();

function darkerSideHex(hex: string): string {
  switch (hex.toUpperCase()) {
    case '#0A42E0':
    case '#3B6AE6':
      return '#082E9E';
    case '#0B7A53':
    case '#238B65':
      return '#075238';
    case '#C86A11':
    case '#D47B26':
      return '#894709';
    case '#D93025':
    case '#DE4B41':
      return '#941F18';
    default:
      return '#BFC5D0';
  }
}

function softRestSurfaceHex(hex: string, strength: 'prov' | 'dept'): string {
  // En vista nacional usamos un tinte arquitectónico suave; en vista provincial un tono pleno calmo
  if (strength === 'dept') {
    switch (hex.toUpperCase()) {
      case '#0A42E0':
        return '#3B6AE6';
      case '#0B7A53':
        return '#238B65';
      case '#C86A11':
        return '#D47B26';
      case '#D93025':
        return '#DE4B41';
      default:
        return hex;
    }
  }
  switch (hex.toUpperCase()) {
    case '#0A42E0':
      return '#DCE5FA';
    case '#0B7A53':
      return '#D9EDE5';
    case '#C86A11':
      return '#F4E5D4';
    case '#D93025':
      return '#F7DFDD';
    default:
      return '#F4F4F1';
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
      .slice(0, 20);
  }
  return pl.nombre.split('(')[0]!.trim().slice(0, 20);
}

function shortPlantSpecialty(pl: PlantaConEmpresa, prod: Producto): string {
  const n = pl.nombre.toLowerCase();
  if (n.includes('unipar')) return 'Cloro-PVC';
  if (n.includes('dow')) return 'Polietileno';
  if (n.includes('cie') || n.includes('ensenada')) return 'BTX Ensenada';
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
    // Simplificación sutil de vértices sub-píxel para aligerar triángulos sin perder fidelidad cartográfica
    if (!prev || Math.hypot(sx - prev[0], sy - prev[1]) > 0.0016) {
      pts.push([sx, sy]);
    }
  }
  if (pts.length > 2) {
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    if (Math.hypot(first[0], first[1] - last[1]) < 0.0016 && Math.hypot(first[0] - last[0], first[1] - last[1]) < 0.0016) {
      pts.pop();
    }
  }
  return pts;
}

function buildExtrudedPrismGeometry(
  cacheKey: string,
  cacheMap: Map<string, BuiltGeoEntry>,
  geometry: { type: string; coordinates?: unknown } | null | undefined,
  proj: (coord: [number, number]) => [number, number] | null
): BuiltGeoEntry | null {
  const cached = cacheMap.get(cacheKey);
  if (cached) return cached;

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
      if (holePts.length < 3 || Math.abs(signedRingArea(holePts)) < 0.00014) continue;
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
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

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

  const entry: BuiltGeoEntry = {
    geo,
    topEdges,
    centroid: [bestCx, bestCz],
    bounds: [
      [minX, minZ],
      [maxX, maxZ],
    ],
  };
  cacheMap.set(cacheKey, entry);
  return entry;
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
  const compassIconRef = useRef<SVGSVGElement | null>(null);
  const tooltipElRef = useRef<HTMLDivElement | null>(null);

  // Mapas imperativos de nodos DOM para proyectar etiquetas a 60 fps SIN disparar renders de React al hacer zoom/pan
  const labelElsRef = useRef(new Map<string, HTMLElement>());
  const leaderLineElsRef = useRef(new Map<string, SVGLineElement>());
  const leaderDotElsRef = useRef(new Map<string, SVGCircleElement>());

  const [hoverCard, setHoverCard] = useState<HoverCardMeta | null>(null);
  const [wheelUnlocked, setWheelUnlocked] = useState(false);
  const [wheelHint, setWheelHint] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [touchFreeOrbit, setTouchFreeOrbit] = useState(false);
  const [contextLost, setContextLost] = useState(false);

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

  // Descriptores declarativos de etiquetas: solo cambian cuando cambia la selección o el filtro (0 re-renders durante el zoom!)
  const overlayDescriptors = useMemo<OverlayDescriptor[]>(() => {
    const list: OverlayDescriptor[] = [];

    // 1) Vista nacional: píldoras provinciales limpias
    if (selectedId === null && !showAllDeptos) {
      for (const item of provinciasData) {
        const pid = item.provincia.provincia_id;
        if (!item.dominante) continue;
        const allProds = [item.dominante, ...item.secundarios];
        if (activeProductId && !allProds.some((p) => p.producto_id === activeProductId)) continue;

        const displayProd =
          (activeProductId ? allProds.find((p) => p.producto_id === activeProductId) : null) ??
          item.dominante;
        const accent = getCategoryAccent(displayProd.categoria);

        if (pid === '02') {
          const cabaW = projectWorld(-58.44, -34.61);
          if (cabaW) {
            list.push({
              key: 'prov-02',
              kind: 'caba',
              priority: 88,
              wx: cabaW[0],
              wz: cabaW[1],
              provId: '02',
              title: 'CABA',
              accent,
              iconoId: displayProd.icono_id,
              isSelected: false,
              estW: 68,
              estH: 24,
            });
          }
          continue;
        }

        const feat = continentalGeo.features.find((f) => f.properties.id === pid);
        if (!feat) continue;
        const built = buildExtrudedPrismGeometry(`prov-${pid}`, provBuiltGeoCache, feat.geometry, projectCoord);
        if (!built) continue;

        const shortName =
          pid === '94'
            ? 'T. del Fuego'
            : pid === '86'
              ? 'Sgo. del Estero'
              : item.provincia.nombre;

        list.push({
          key: `prov-${pid}`,
          kind: 'prov',
          priority: 65 + item.plantas.length * 2,
          wx: built.centroid[0],
          wz: built.centroid[1],
          provId: pid,
          title: shortName,
          badgeCount: item.secundarios.length > 0 && !activeProductId ? item.secundarios.length : undefined,
          accent,
          iconoId: displayProd.icono_id,
          isSelected: false,
          estW: shortName.length * 6.4 + 40,
          estH: 24,
        });
      }
      list.sort((a, b) => b.priority - a.priority);
      return list;
    }

    // 2) Emblemas livianos de fábricas (sin mallas 3D pesadas; agrupan co-ubicaciones en abanico limpio en pantalla)
    const rawPlants: Array<{
      pl: PlantaConEmpresa;
      prod: Producto;
      wx: number;
      wz: number;
    }> = [];

    for (const provItem of provinciasData) {
      if (selectedId !== null && provItem.provincia.provincia_id !== selectedId) continue;
      for (const pl of provItem.plantas) {
        if (activeProductId !== null && pl.producto_id !== activeProductId) continue;
        if (selectedDeptId !== null && pl.departamento_id !== selectedDeptId) continue;
        const w = projectWorld(pl.lon, pl.lat);
        const prod = prodById.get(pl.producto_id);
        if (!w || !prod) continue;
        rawPlants.push({ pl, prod, wx: w[0], wz: w[1] });
      }
    }

    // Agrupar plantas muy cercanas geográficamente (ej. Polo Petroquímico Bahía Blanca o San Lorenzo)
    const used = new Set<number>();
    for (let i = 0; i < rawPlants.length; i++) {
      if (used.has(i)) continue;
      const cluster = [i];
      used.add(i);
      for (let j = i + 1; j < rawPlants.length; j++) {
        if (used.has(j)) continue;
        const distW = Math.hypot(rawPlants[i]!.wx - rawPlants[j]!.wx, rawPlants[i]!.wz - rawPlants[j]!.wz);
        if (distW < 0.22) {
          cluster.push(j);
          used.add(j);
        }
      }

      cluster.forEach((idx, k) => {
        const { pl, prod, wx, wz } = rawPlants[idx]!;
        const opName = shortEmpresaOrPlanta(pl);
        const spec = shortPlantSpecialty(pl, prod);
        const isSel = selectedPlantaId === pl.planta_id;
        list.push({
          key: `pl-${pl.planta_id}`,
          kind: 'plant',
          priority: isSel ? 130 : 108,
          wx,
          wz,
          provId: pl.provincia_id,
          deptId: pl.departamento_id ?? undefined,
          planta: pl,
          title: opName,
          specialty: spec,
          accent: getCategoryAccent(prod.categoria),
          iconoId: prod.icono_id,
          isSelected: isSel,
          estW: Math.max(118, (opName.length + spec.length) * 6.1 + 48),
          estH: 30,
          fanIndex: k,
          fanTotal: cluster.length,
        });
      });
    }

    // 3) Etiquetas de departamentos con datos y los 14 mayores partidos vecinos de contexto
    const deptFeatures =
      selectedId !== null && provinceShard && provinceShard.provincia_id === selectedId
        ? provinceShard.features.map((f) => ({
          id: f.properties.id,
          nombre: f.properties.nombre,
          provinciaId: f.properties.provincia_id,
          activo: f.properties.activo,
          geometry: f.geometry,
        }))
        : departamentosGeo.features
          .filter((f) => selectedId === null || showAllDeptos || f.properties.provincia_id === selectedId)
          .map((f) => ({
            id: f.properties.id,
            nombre: f.properties.nombre,
            provinciaId: f.properties.provincia_id,
            activo: true,
            geometry: f.geometry,
          }));

    const contextCandidates: OverlayDescriptor[] = [];

    for (const f of deptFeatures) {
      const built = buildExtrudedPrismGeometry(`dept-${f.id}`, deptBuiltGeoCache, f.geometry, projectCoord);
      if (!built) continue;
      const info = deptById.get(f.id);

      if (info) {
        if (activeProductId !== null && !info.productos.some((p) => p.producto_id === activeProductId)) {
          continue;
        }
        const isSelDept = selectedDeptId === f.id;
        list.push({
          key: `dept-act-${f.id}`,
          kind: 'dept-active',
          priority: isSelDept ? 96 : 86,
          wx: built.centroid[0],
          wz: built.centroid[1],
          provId: f.provinciaId,
          deptId: f.id,
          title: info.departamento.nombre,
          badgeCount: info.plantas.length > 1 ? info.plantas.length : undefined,
          accent: getZoneHex(info.departamento.tipo_zona),
          isSelected: isSelDept,
          estW: info.departamento.nombre.length * 6.6 + (info.plantas.length > 1 ? 58 : 26),
          estH: 22,
        });
      } else if (selectedId === f.provinciaId) {
        const bw = built.bounds[1][0] - built.bounds[0][0];
        const bz = built.bounds[1][1] - built.bounds[0][1];
        const area = bw * bz;
        contextCandidates.push({
          key: `dept-ctx-${f.id}`,
          kind: 'dept-context',
          priority: 20 + Math.min(28, area * 18),
          wx: built.centroid[0],
          wz: built.centroid[1],
          provId: f.provinciaId,
          deptId: f.id,
          title: f.nombre,
          accent: '#6B7280',
          isSelected: false,
          estW: f.nombre.length * 5.8 + 16,
          estH: 18,
          approxArea: area,
        });
      }
    }

    // Limitar etiquetas de partidos vecinos a las 16 de mayor superficie para mantener DOM ultraligero
    contextCandidates.sort((a, b) => (b.approxArea ?? 0) - (a.approxArea ?? 0));
    list.push(...contextCandidates.slice(0, 16));

    list.sort((a, b) => b.priority - a.priority);
    return list;
  }, [
    selectedId,
    selectedDeptId,
    selectedPlantaId,
    activeProductId,
    showAllDeptos,
    provinceShard,
    provinciasData,
    continentalGeo,
    departamentosGeo,
    deptById,
    prodById,
    projectCoord,
    projectWorld,
  ]);

  const descriptorsRef = useRef(overlayDescriptors);
  descriptorsRef.current = overlayDescriptors;

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

  const stateRef = useRef({
    selectedId,
    selectedDeptId,
    selectedPlantaId,
    activeProductId,
    showAllDeptos,
    hoveredProvId: null as string | null,
    hoveredDeptId: null as string | null,
    lastHoverKey: '' as string,
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

  const engineShardRef = useRef(provinceShard);
  engineShardRef.current = provinceShard;

  const engineRef = useRef<{
    requestRender: () => void;
    projectOverlaysNow: () => void;
    flyTo: (target: [number, number, number], distance: number, polarDeg?: number, azimuthDeg?: number) => void;
    zoomSmoothBy: (factor: number) => void;
    resetNorthTilt: () => void;
    provRecords: Map<string, PrismRecord>;
    deptRecords: Map<string, PrismRecord>;
    syncDeptLayer: () => void;
    syncStylesAndTargets: () => void;
  } | null>(null);

  // Inicialización única del motor WebGL optimizado
  useEffect(() => {
    const container = stageRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const isMobileInit = window.matchMedia('(pointer: coarse)').matches;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    // Tope de DPR en 1.5 desktop / 1.35 mobile: nitidez impecable con ~40% menos costo de fill-rate al acercar
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobileInit ? 1.35 : 1.5));
    renderer.setClearColor('#DFE4EA', 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#DFE4EA');

    let stageW = Math.max(1, container.clientWidth);
    let stageH = Math.max(1, container.clientHeight);

    const camera = new THREE.PerspectiveCamera(34, stageW / stageH, 0.25, 150);
    const initPolar = THREE.MathUtils.degToRad(37);
    const initAzim = THREE.MathUtils.degToRad(-4);
    const initDist = 36.2;
    camera.position.set(
      0.25 + initDist * Math.sin(initPolar) * Math.sin(initAzim),
      initDist * Math.cos(initPolar),
      -0.25 + initDist * Math.sin(initPolar) * Math.cos(initAzim)
    );
    renderer.setSize(stageW, stageH, false);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0.25, 0, -0.25);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.screenSpacePanning = false;
    controls.minDistance = 2.0;
    controls.maxDistance = 42;
    controls.minPolarAngle = THREE.MathUtils.degToRad(14);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(60);
    controls.rotateSpeed = 0.65;
    controls.panSpeed = 0.78;
    controls.zoomSpeed = 0.95;
    controls.enableZoom = isMobileInit;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // Iluminación Lambertiana ultraliviana para caras superiores limpias y acantilados laterales sombreados
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9ca6b6, 1.55));
    const keyLight = new THREE.DirectionalLight(0xfffefa, 1.15);
    keyLight.position.set(-14, 28, 18);
    scene.add(keyLight);

    const seaGrid = new THREE.GridHelper(54, 27, 0xc7cfd9, 0xd1d8e2);
    seaGrid.position.y = -0.02;
    (seaGrid.material as THREE.Material).transparent = true;
    (seaGrid.material as THREE.Material).opacity = 0.38;
    scene.add(seaGrid);

    const provincesGroup = new THREE.Group();
    const deptosGroup = new THREE.Group();
    scene.add(provincesGroup, deptosGroup);

    const provRecords = new Map<string, PrismRecord>();
    const deptRecords = new Map<string, PrismRecord>();

    for (const feat of continentalGeo.features) {
      const id = feat.properties.id;
      const built = buildExtrudedPrismGeometry(`prov-${id}`, provBuiltGeoCache, feat.geometry, projectCoord);
      if (!built) continue;

      const topMat = new THREE.MeshLambertMaterial({
        color: '#F6F6F3',
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });
      const sideMat = new THREE.MeshLambertMaterial({
        color: '#AEB6C4',
      });
      const mesh = new THREE.Mesh(built.geo, [topMat, sideMat]);
      mesh.scale.y = H_COLOR_REST;
      mesh.userData = { kind: 'provincia', id, provinciaId: id };
      provincesGroup.add(mesh);

      const edgeMat = new THREE.LineBasicMaterial({
        color: '#23262C',
        transparent: true,
        opacity: 0.78,
      });
      const edgeLines = new THREE.LineSegments(built.topEdges, edgeMat);
      edgeLines.position.y = H_COLOR_REST + 0.006;
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
        currentH: H_COLOR_REST,
        targetH: H_COLOR_REST,
      });
    }

    const camAnim = {
      active: false,
      startTarget: new THREE.Vector3(),
      endTarget: new THREE.Vector3(),
      startPos: new THREE.Vector3(),
      endPos: new THREE.Vector3(),
      t: 0,
      duration: 0.48,
    };

    // Objetivo escalar de zoom continuo: acumula rueda/botones sin reiniciar curvas ni trabar frames
    let zoomTargetDist: number | null = null;

    let rafId = 0;
    let lastTime = performance.now();
    const tmpProj = new THREE.Vector3();
    const zoomDir = new THREE.Vector3();

    // Proyección imperativa directa a nodos DOM (0 llamadas a setState durante el zoom/órbita)
    const projectOverlaysImperative = () => {
      if (stageW < 100 || stageH < 100) return;

      const camDist = camera.position.distanceTo(controls.target);
      const descriptors = descriptorsRef.current;
      const placedBoxes: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];

      for (const desc of descriptors) {
        const el = labelElsRef.current.get(desc.key);
        const lineEl = leaderLineElsRef.current.get(desc.key);
        const dotEl = leaderDotElsRef.current.get(desc.key);
        if (!el) continue;

        // Ocultar partidos vecinos de contexto cuando la cámara está lejos para mantener lectura limpia
        if (desc.kind === 'dept-context' && camDist > 11.5) {
          el.style.visibility = 'hidden';
          continue;
        }

        const deptRec = desc.deptId ? deptRecords.get(desc.deptId) : undefined;
        const provRec = provRecords.get(desc.provId);
        const surfaceY = deptRec ? deptRec.currentH : provRec ? provRec.currentH : H_COLOR_REST;

        tmpProj.set(desc.wx, surfaceY + 0.03, desc.wz).project(camera);
        if (tmpProj.z <= -1 || tmpProj.z >= 1) {
          el.style.visibility = 'hidden';
          if (lineEl) lineEl.style.display = 'none';
          if (dotEl) dotEl.style.display = 'none';
          continue;
        }

        const ax = (tmpProj.x * 0.5 + 0.5) * stageW;
        const ay = (-tmpProj.y * 0.5 + 0.5) * stageH;

        if (ax < 18 || ax > stageW - 18 || ay < 34 || ay > stageH - 18) {
          el.style.visibility = 'hidden';
          if (lineEl) lineEl.style.display = 'none';
          if (dotEl) dotEl.style.display = 'none';
          continue;
        }

        // Offset base en píxeles de pantalla (abanico radial limpio cuando coexisten varias fábricas)
        let baseDx = 0;
        let baseDy = 0;

        if (desc.kind === 'caba') {
          baseDx = 54;
          baseDy = -10;
        } else if (desc.kind === 'plant') {
          const total = desc.fanTotal ?? 1;
          const idx = desc.fanIndex ?? 0;
          if (total === 1) {
            baseDx = 0;
            baseDy = -24;
          } else {
            const fanRadius = Math.min(64, 42 + total * 5);
            const angle = -Math.PI / 2 + (idx * Math.PI * 2) / total;
            baseDx = Math.cos(angle) * (fanRadius * 1.18);
            baseDy = Math.sin(angle) * (fanRadius * 0.85) - 10;
          }
        } else if (desc.kind === 'dept-active') {
          baseDy = 14;
        }

        const candidatesOffsets: Array<[number, number]> =
          desc.kind === 'plant'
            ? [
              [baseDx, baseDy],
              [baseDx, baseDy - 24],
              [baseDx, baseDy + 26],
              [baseDx - 44, baseDy - 10],
              [baseDx + 44, baseDy - 10],
            ]
            : desc.kind === 'dept-active'
              ? [
                [0, baseDy],
                [0, -18],
                [0, 32],
              ]
              : [[baseDx, baseDy]];

        let chosenX = ax + baseDx;
        let chosenY = ay + baseDy;
        let accepted = false;

        for (const [ox, oy] of candidatesOffsets) {
          const cx = Math.max(desc.estW * 0.5 + 8, Math.min(stageW - desc.estW * 0.5 - 8, ax + ox));
          const cy = Math.max(desc.estH * 0.5 + 38, Math.min(stageH - desc.estH * 0.5 - 14, ay + oy));
          const box = {
            x0: cx - desc.estW * 0.5,
            y0: cy - desc.estH * 0.5,
            x1: cx + desc.estW * 0.5,
            y1: cy + desc.estH * 0.5,
          };
          const pad = desc.kind === 'plant' ? 4 : 6;
          const collides = placedBoxes.some(
            (b) => !(box.x1 + pad < b.x0 || box.x0 - pad > b.x1 || box.y1 + pad < b.y0 || box.y0 - pad > b.y1)
          );
          if (!collides) {
            placedBoxes.push(box);
            chosenX = cx;
            chosenY = cy;
            accepted = true;
            break;
          }
        }

        // Las plantas siempre permanecen visibles aunque haya alta densidad
        if (!accepted && desc.kind === 'plant') {
          chosenX = Math.max(desc.estW * 0.5 + 8, Math.min(stageW - desc.estW * 0.5 - 8, ax + baseDx));
          chosenY = Math.max(44, ay + baseDy - 28);
          placedBoxes.push({
            x0: chosenX - desc.estW * 0.5,
            y0: chosenY - desc.estH * 0.5,
            x1: chosenX + desc.estW * 0.5,
            y1: chosenY + desc.estH * 0.5,
          });
          accepted = true;
        }

        if (!accepted) {
          el.style.visibility = 'hidden';
          if (lineEl) lineEl.style.display = 'none';
          if (dotEl) dotEl.style.display = 'none';
          continue;
        }

        el.style.visibility = 'visible';
        el.style.transform = `translate3d(${chosenX.toFixed(1)}px, ${chosenY.toFixed(1)}px, 0) translate(-50%, -50%)`;

        const showStem = desc.kind === 'plant' || desc.kind === 'caba';
        if (lineEl && dotEl) {
          if (showStem) {
            lineEl.style.display = '';
            lineEl.setAttribute('x1', ax.toFixed(1));
            lineEl.setAttribute('y1', ay.toFixed(1));
            lineEl.setAttribute('x2', chosenX.toFixed(1));
            lineEl.setAttribute('y2', chosenY.toFixed(1));
            dotEl.style.display = '';
            dotEl.setAttribute('cx', ax.toFixed(1));
            dotEl.setAttribute('cy', ay.toFixed(1));
          } else {
            lineEl.style.display = 'none';
            dotEl.style.display = 'none';
          }
        }
      }

      if (compassIconRef.current) {
        const az = Math.round(THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()));
        compassIconRef.current.style.transform = `rotate(${-az}deg)`;
      }
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
      } else if (zoomTargetDist !== null) {
        zoomDir.copy(camera.position).sub(controls.target);
        const curDist = zoomDir.length();
        const alpha = 1 - Math.exp(-dt * 20);
        const nextDist = curDist + (zoomTargetDist - curDist) * alpha;
        zoomDir.setLength(nextDist);
        camera.position.copy(controls.target).add(zoomDir);
        if (Math.abs(zoomTargetDist - nextDist) < 0.006) {
          zoomTargetDist = null;
        } else {
          needsMoreFrames = true;
        }
      }

      if (controls.update()) {
        needsMoreFrames = true;
      }

      // Interpolación ágil de alturas 3D
      const hAlpha = 1 - Math.exp(-dt * 16);
      for (const rec of provRecords.values()) {
        if (Math.abs(rec.targetH - rec.currentH) > 0.0025) {
          rec.currentH += (rec.targetH - rec.currentH) * hAlpha;
          rec.mesh.scale.y = Math.max(0.04, rec.currentH);
          rec.edgeLines.position.y = rec.currentH + 0.006;
          needsMoreFrames = true;
        }
      }
      for (const rec of deptRecords.values()) {
        if (Math.abs(rec.targetH - rec.currentH) > 0.0025) {
          rec.currentH += (rec.targetH - rec.currentH) * hAlpha;
          rec.mesh.scale.y = Math.max(0.04, rec.currentH);
          rec.edgeLines.position.y = rec.currentH + 0.007;
          needsMoreFrames = true;
        }
      }

      renderer.render(scene, camera);
      projectOverlaysImperative();

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
      zoomTargetDist = null;
    });

    const flyTo = (
      target: [number, number, number],
      distance: number,
      polarDeg = 42,
      azimuthDeg = -5
    ) => {
      zoomTargetDist = null;
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

    const zoomSmoothBy = (factor: number) => {
      camAnim.active = false;
      const baseDist = zoomTargetDist ?? camera.position.distanceTo(controls.target);
      zoomTargetDist = THREE.MathUtils.clamp(baseDist / factor, controls.minDistance, controls.maxDistance);
      requestRender();
    };

    const resetNorthTilt = () => {
      const dist = camera.position.distanceTo(controls.target);
      flyTo([controls.target.x, controls.target.y, controls.target.z], dist, 42, 0);
    };

    const clearDeptGroup = () => {
      while (deptosGroup.children.length > 0) {
        const obj = deptosGroup.children[0]!;
        deptosGroup.remove(obj);
        // No disponemos built.geo ni built.topEdges porque viven en deptBuiltGeoCache; solo materiales por instancia
        const m = obj as THREE.Mesh;
        if (m.material) {
          if (Array.isArray(m.material)) m.material.forEach((mt) => mt.dispose());
          else m.material.dispose();
        }
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
        const hasChildDeptsRendered = [...deptRecords.values()].some((d) => d.provinciaId === pid);

        if (st.selectedId !== null) {
          if (isSel) {
            rec.mesh.visible = !hasChildDeptsRendered;
            rec.edgeLines.visible = true;
            // Si no tuviera subdivisiones cargadas, ahí sí emerge al seleccionarse
            rec.targetH = hasChildDeptsRendered ? 0.05 : H_CLICK_SELECTED;
            rec.topMat.color.set(hasChildDeptsRendered ? '#F4F3EE' : accent);
            rec.sideMat.color.set(darkerSideHex(accent));
            rec.edgeMat.color.set(accent);
            rec.edgeMat.opacity = 0.95;
          } else {
            rec.mesh.visible = true;
            rec.edgeLines.visible = true;
            rec.targetH = isHov ? H_STONE_BASE : H_NEIGHBOR_DIM;
            rec.topMat.color.set(isHov ? '#EBEAE4' : '#E5E6E1');
            rec.sideMat.color.set('#C5CAD4');
            rec.edgeMat.color.set('#9DA4B0');
            rec.edgeMat.opacity = 0.55;
          }
        } else {
          rec.mesh.visible = true;
          rec.edgeLines.visible = true;
          if (st.activeProductId !== null) {
            // Con filtro activo: quedan en color al ras; al pasar el mouse levantan apenas
            rec.targetH = matchesFilter ? (isHov ? H_HOVER_SUBTLE : H_COLOR_REST) : H_STONE_BASE;
            rec.topMat.color.set(matchesFilter ? (isHov ? accent : softRestSurfaceHex(accent, 'dept')) : '#EDEDE9');
            rec.sideMat.color.set(matchesFilter ? darkerSideHex(accent) : '#C4C9D3');
            rec.edgeMat.color.set(matchesFilter ? '#FFFFFF' : '#A4ABB6');
            rec.edgeMat.opacity = matchesFilter ? 0.92 : 0.55;
          } else if (isHov) {
            // Al pasar el mouse sobre una provincia: color pleno y levanta apenas el relieve
            rec.targetH = H_HOVER_SUBTLE;
            rec.topMat.color.set(softRestSurfaceHex(accent, 'dept'));
            rec.sideMat.color.set(darkerSideHex(accent));
            rec.edgeMat.color.set('#FFFFFF');
            rec.edgeMat.opacity = 0.96;
          } else {
            // En reposo nacional: tinte suave en color a altura pareja sin escalones pesados
            rec.targetH = H_COLOR_REST;
            rec.topMat.color.set(info?.dominante ? softRestSurfaceHex(accent, 'prov') : '#F4F4F1');
            rec.sideMat.color.set('#A7B0BF');
            rec.edgeMat.color.set('#22252B');
            rec.edgeMat.opacity = 0.78;
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
            rec.targetH = H_STONE_BASE;
            rec.topMat.color.set('#ECEBE6');
            rec.sideMat.color.set('#C3C8D2');
            rec.edgeMat.color.set('#969CA8');
            rec.edgeMat.opacity = 0.65;
          } else if (isSel) {
            // Recién al hacer click sobre la localidad emerge el relieve 3D protagonista
            rec.targetH = H_CLICK_SELECTED;
            rec.topMat.color.set(zonaHex);
            rec.sideMat.color.set(darkerSideHex(zonaHex));
            rec.edgeMat.color.set('#FFFFFF');
            rec.edgeMat.opacity = 1;
          } else if (isHov) {
            // Al pasar el mouse: color intenso y levanta apenas el relieve
            rec.targetH = H_HOVER_SUBTLE;
            rec.topMat.color.set(zonaHex);
            rec.sideMat.color.set(darkerSideHex(zonaHex));
            rec.edgeMat.color.set('#FFFFFF');
            rec.edgeMat.opacity = 0.96;
          } else {
            // En reposo: queda identificado en color, prácticamente al ras de sus partidos vecinos
            rec.targetH = H_COLOR_REST;
            rec.topMat.color.set(softRestSurfaceHex(zonaHex, 'dept'));
            rec.sideMat.color.set(darkerSideHex(zonaHex));
            rec.edgeMat.color.set('#FFFFFF');
            rec.edgeMat.opacity = 0.88;
          }
        } else {
          // Partido vecino sin plantas: piedra clara; al pasar el mouse levanta una pizca sutil
          rec.targetH = isHov ? 0.29 : H_STONE_BASE;
          rec.topMat.color.set(isHov ? '#E6E5DD' : '#F2F1EC');
          rec.sideMat.color.set(isHov ? '#B4BBC7' : '#C8CDD6');
          rec.edgeMat.color.set(isHov ? '#1C1E22' : '#A0A7B4');
          rec.edgeMat.opacity = isHov ? 0.88 : 0.64;
        }
      }

      requestRender();
    };

    // Picking ultrarrápido con pre-filtro espacial O(1) en plano XZ + throttling a 1 vez por frame
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.24);
    const planeHitPt = new THREE.Vector3();

    let downX = 0;
    let downY = 0;
    let movedDrag = false;
    let pendingMoveEvent: { clientX: number; clientY: number } | null = null;
    let hoverRafId = 0;

    const pickSceneFast = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);

      const hasPlaneHit = raycaster.ray.intersectPlane(groundPlane, planeHitPt) !== null;
      const hx = planeHitPt.x;
      const hz = planeHitPt.z;
      const pad = 0.75;

      // 1) Departamentos visibles filtrados por caja envolvente 2D (evita testear 135 mallas completas)
      if (deptRecords.size > 0) {
        const candidateDepts: THREE.Mesh[] = [];
        for (const r of deptRecords.values()) {
          if (!r.mesh.visible) continue;
          if (
            !hasPlaneHit ||
            (hx >= r.bounds[0][0] - pad &&
              hx <= r.bounds[1][0] + pad &&
              hz >= r.bounds[0][1] - pad &&
              hz <= r.bounds[1][1] + pad)
          ) {
            candidateDepts.push(r.mesh);
          }
        }
        if (candidateDepts.length > 0) {
          const deptHits = raycaster.intersectObjects(candidateDepts, false);
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
              localX: clientX - rect.left,
              localY: clientY - rect.top,
            };
          }
        }
      }

      // 2) Provincias filtradas por caja envolvente 2D
      const candidateProvs: THREE.Mesh[] = [];
      for (const r of provRecords.values()) {
        if (!r.mesh.visible) continue;
        if (
          !hasPlaneHit ||
          (hx >= r.bounds[0][0] - pad &&
            hx <= r.bounds[1][0] + pad &&
            hz >= r.bounds[0][1] - pad &&
            hz <= r.bounds[1][1] + pad)
        ) {
          candidateProvs.push(r.mesh);
        }
      }
      if (candidateProvs.length > 0) {
        const provHits = raycaster.intersectObjects(candidateProvs, false);
        if (provHits[0]) {
          const ud = provHits[0].object.userData as { id: string };
          return {
            kind: 'provincia' as const,
            id: ud.id,
            localX: clientX - rect.left,
            localY: clientY - rect.top,
          };
        }
      }

      return null;
    };

    const positionTooltipImperative = (lx: number, ly: number) => {
      const tip = tooltipElRef.current;
      if (!tip) return;
      const tx = Math.min(lx + 16, Math.max(12, stageW - 252));
      const ty = Math.max(52, ly - 18);
      tip.style.transform = `translate3d(${tx.toFixed(0)}px, ${ty.toFixed(0)}px, 0)`;
    };

    const processPendingHover = () => {
      hoverRafId = 0;
      const ev = pendingMoveEvent;
      pendingMoveEvent = null;
      if (!ev || camAnim.active || zoomTargetDist !== null) return;

      const hit = pickSceneFast(ev.clientX, ev.clientY);
      const st = stateRef.current;

      if (!hit) {
        if (st.lastHoverKey !== '') {
          st.hoveredProvId = null;
          st.hoveredDeptId = null;
          st.lastHoverKey = '';
          setHoverCard(null);
          canvas.style.cursor = 'grab';
          syncStylesAndTargets();
        }
        return;
      }

      canvas.style.cursor = 'pointer';
      positionTooltipImperative(hit.localX, hit.localY);

      if (hit.kind === 'depto') {
        const hoverKey = `d:${hit.id}`;
        if (st.lastHoverKey !== hoverKey) {
          st.hoveredProvId = hit.provinciaId;
          st.hoveredDeptId = hit.id;
          st.lastHoverKey = hoverKey;
          syncStylesAndTargets();

          const info = deptById.get(hit.id);
          setHoverCard({
            idKey: hoverKey,
            title: hit.nombre,
            subtitle: info
              ? `${info.plantas.length} ${info.plantas.length === 1 ? 'fábrica registrada' : 'fábricas registradas'} · Click para elevar relieve`
              : 'Partido de referencia territorial · Sin plantas relevadas',
            accent: info ? getZoneHex(info.departamento.tipo_zona) : '#6B7280',
          });
        }
        return;
      }

      const hoverKey = `p:${hit.id}`;
      if (st.lastHoverKey !== hoverKey) {
        st.hoveredProvId = hit.id;
        st.hoveredDeptId = null;
        st.lastHoverKey = hoverKey;
        prefetchProvinceGeo(hit.id);
        syncStylesAndTargets();

        const pInfo = dataById.get(hit.id);
        if (pInfo) {
          setHoverCard({
            idKey: hoverKey,
            title: pInfo.provincia.nombre,
            subtitle: `${pInfo.plantas.length} ${pInfo.plantas.length === 1 ? 'fábrica' : 'fábricas'} · Click para ver partidos`,
            accent: pInfo.dominante ? getCategoryAccent(pInfo.dominante.categoria) : '#111214',
          });
        }
      }
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
      // Nunca ejecutar raycasting mientras se arrastra/orbita la cámara ni en eventos táctiles
      if (e.pointerType === 'touch' || e.buttons !== 0) return;

      // Actualizar posición de tooltip al instante en GPU aunque siga en el mismo polígono
      if (tooltipElRef.current && stateRef.current.lastHoverKey !== '') {
        const rect = canvas.getBoundingClientRect();
        positionTooltipImperative(e.clientX - rect.left, e.clientY - rect.top);
      }

      pendingMoveEvent = { clientX: e.clientX, clientY: e.clientY };
      if (hoverRafId === 0) {
        hoverRafId = window.requestAnimationFrame(processPendingHover);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (movedDrag || e.button > 0) return;
      const hit = pickSceneFast(e.clientX, e.clientY);
      const st = stateRef.current;
      if (!hit) {
        if (st.selectedDeptId !== null) {
          st.onSelectDepartamento(null);
        }
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
      stateRef.current.lastHoverKey = '';
      setHoverCard(null);
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
      stageW = Math.max(1, container.clientWidth);
      stageH = Math.max(1, container.clientHeight);
      camera.aspect = stageW / stageH;
      camera.updateProjectionMatrix();
      renderer.setSize(stageW, stageH, false);
      requestRender();
    });
    resizeObserver.observe(container);

    const syncDeptLayer = () => {
      clearDeptGroup();
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
        const built = buildExtrudedPrismGeometry(`dept-${item.id}`, deptBuiltGeoCache, item.geometry, projectCoord);
        if (!built) continue;

        const initH = item.activo ? H_COLOR_REST : H_STONE_BASE;
        const topMat = new THREE.MeshLambertMaterial({
          color: item.activo ? '#3B6AE6' : '#F2F1EC',
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        });
        const sideMat = new THREE.MeshLambertMaterial({
          color: item.activo ? '#082E9E' : '#C8CDD6',
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
          color: item.activo ? '#FFFFFF' : '#A0A7B4',
          transparent: true,
          opacity: item.activo ? 0.88 : 0.64,
        });
        const edgeLines = new THREE.LineSegments(built.topEdges, edgeMat);
        edgeLines.position.y = initH + 0.007;
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

    engineRef.current = {
      requestRender,
      projectOverlaysNow: projectOverlaysImperative,
      flyTo,
      zoomSmoothBy,
      resetNorthTilt,
      provRecords,
      deptRecords,
      syncDeptLayer,
      syncStylesAndTargets,
    };
    (engineRef.current as unknown as { controls: OrbitControls }).controls = controls;

    syncStylesAndTargets();
    controls.update();
    renderer.render(scene, camera);
    projectOverlaysImperative();

    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      if (hoverRafId !== 0) window.cancelAnimationFrame(hoverRafId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      clearDeptGroup();
      for (const r of provRecords.values()) {
        r.topMat.dispose();
        r.sideMat.dispose();
        r.edgeMat.dispose();
      }
      controls.dispose();
      renderer.dispose();
      engineRef.current = null;
    };
  }, [continentalGeo, departamentosGeo, dataById, deptById, prodById, projectCoord]);

  // Re-proyectar inmediatamente cuando cambia el conjunto de descriptores React
  useEffect(() => {
    engineRef.current?.projectOverlaysNow();
  }, [overlayDescriptors]);

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
        eng.zoomSmoothBy(factor);
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

  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.syncDeptLayer();
    eng.syncStylesAndTargets();
  }, [selectedId, selectedDeptId, selectedPlantaId, activeProductId, showAllDeptos, provinceShard]);

  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;

    if (selectedDeptId) {
      const rec = eng.deptRecords.get(selectedDeptId);
      if (rec) {
        const bw = Math.max(0.22, rec.bounds[1][0] - rec.bounds[0][0]);
        const bz = Math.max(0.22, rec.bounds[1][1] - rec.bounds[0][1]);
        const span = Math.max(bw, bz);
        const dist = THREE.MathUtils.clamp(span * 2.35, 2.2, 5.4);
        eng.flyTo([rec.centroid[0], 0.45, rec.centroid[1]], dist, 45, -7);
        return;
      }
      const feat = departamentosGeo.features.find((f) => f.properties.id === selectedDeptId);
      if (feat) {
        const built = buildExtrudedPrismGeometry(`dept-${selectedDeptId}`, deptBuiltGeoCache, feat.geometry, projectCoord);
        if (built) {
          const span = Math.max(built.bounds[1][0] - built.bounds[0][0], built.bounds[1][1] - built.bounds[0][1]);
          eng.flyTo([built.centroid[0], 0.45, built.centroid[1]], THREE.MathUtils.clamp(span * 2.35, 2.2, 5.4), 45, -7);
          return;
        }
      }
    }

    if (selectedId) {
      if (selectedId === '02') {
        const cabaW = projectWorld(-58.44, -34.61);
        if (cabaW) {
          eng.flyTo([cabaW[0], 0.4, cabaW[1]], 2.9, 44, -5);
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
        const dist = THREE.MathUtils.clamp(span * 2.4, 4.8, 17.5);
        eng.flyTo([cx, 0.25, cz], dist, 41, -5);
        return;
      }
    }

    eng.flyTo([0.25, 0, -0.25], 36.2, 37, -4);
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
      className={`relative flex w-full items-center justify-center overflow-hidden bg-sea-basin ${isFullscreen ? 'h-screen' : 'h-[520px] sm:h-[640px] lg:h-[720px]'
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

      {/* Conectores vectoriales ultralivianos actualizados directo en DOM a 60 fps */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      >
        {overlayDescriptors
          .filter((d) => d.kind === 'plant' || d.kind === 'caba')
          .map((d) => (
            <g key={`ldr-${d.key}`}>
              <line
                ref={(el) => {
                  if (el) leaderLineElsRef.current.set(d.key, el);
                  else leaderLineElsRef.current.delete(d.key);
                }}
                stroke={d.isSelected ? d.accent : '#111214'}
                strokeWidth={d.kind === 'plant' ? 1.35 : 1}
                strokeDasharray={d.kind === 'caba' ? '3 2.5' : undefined}
                opacity={0.75}
                style={{ display: 'none' }}
              />
              <circle
                ref={(el) => {
                  if (el) leaderDotElsRef.current.set(d.key, el);
                  else leaderDotElsRef.current.delete(d.key);
                }}
                r={d.kind === 'plant' ? 3.5 : 2.6}
                fill={d.accent}
                stroke="#FFFFFF"
                strokeWidth={1.5}
                style={{ display: 'none' }}
              />
            </g>
          ))}
      </svg>

      {/* Capa de emblemas y etiquetas proyectadas por GPU (translate3d) sin re-renders React */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {overlayDescriptors.map((lbl) => {
          const bindLabelRef = (el: HTMLElement | null) => {
            if (el) labelElsRef.current.set(lbl.key, el);
            else labelElsRef.current.delete(lbl.key);
          };

          if (lbl.kind === 'dept-context') {
            return (
              <div
                key={lbl.key}
                ref={bindLabelRef}
                style={{ visibility: 'hidden', willChange: 'transform' }}
                className="absolute left-0 top-0 inline-flex items-center gap-1 whitespace-nowrap rounded-sm bg-stone-surface/80 px-1.5 py-0.5 text-[10px] font-medium text-ink-muted/90"
              >
                <span className="h-1 w-1 rounded-full bg-ink-muted/60" />
                <span>{lbl.title}</span>
              </div>
            );
          }

          if (lbl.kind === 'plant' && lbl.planta) {
            return (
              <button
                key={lbl.key}
                ref={bindLabelRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPlanta(lbl.planta!);
                }}
                style={{ visibility: 'hidden', willChange: 'transform' }}
                className={`group pointer-events-auto absolute left-0 top-0 inline-flex cursor-pointer items-center gap-2 rounded-lg border p-1 pr-2.5 text-left transition-colors duration-150 ${lbl.isSelected
                  ? 'border-ink bg-ink text-white shadow-lg ring-2 ring-white'
                  : 'border-ink/20 bg-white/96 text-ink shadow-[0_3px_10px_rgba(17,18,20,0.12)] hover:border-ink hover:bg-ink hover:text-white'
                  }`}
              >
                {/* Emblema industrial vectorial limpio (cero mallas 3D en GPU) */}
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white shadow-2xs ring-1 ring-inset ring-white/25"
                  style={{ backgroundColor: lbl.accent }}
                >
                  {lbl.iconoId ? <ProductIcon iconId={lbl.iconoId} size={14} strokeWidth={1.9} /> : null}
                </span>
                <span className="flex items-baseline gap-1.5 whitespace-nowrap leading-none">
                  <span className="text-[11.5px] font-semibold tracking-[-0.01em]">{lbl.title}</span>
                  {lbl.specialty && (
                    <span
                      className={`text-[10px] font-medium ${lbl.isSelected ? 'text-white/75' : 'text-ink-muted group-hover:text-white/75'
                        }`}
                    >
                      · {lbl.specialty}
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
                ref={bindLabelRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (lbl.deptId) onSelectDepartamento(selectedDeptId === lbl.deptId ? null : lbl.deptId);
                }}
                style={{ visibility: 'hidden', willChange: 'transform' }}
                className={`pointer-events-auto absolute left-0 top-0 inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10.5px] font-semibold shadow-xs transition-colors duration-150 ${lbl.isSelected
                  ? 'border-white bg-ink text-white shadow-md'
                  : 'border-ink/25 bg-stone-surface/94 text-ink hover:border-ink hover:bg-ink hover:text-white'
                  }`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white"
                  style={{ backgroundColor: lbl.accent }}
                />
                <span className="whitespace-nowrap">{lbl.title}</span>
                {lbl.badgeCount !== undefined && lbl.badgeCount > 1 && (
                  <span
                    className="rounded-xs px-1 py-0.2 text-[9.5px] font-semibold text-white tabular-nums"
                    style={{ backgroundColor: lbl.accent }}
                  >
                    {lbl.badgeCount}
                  </span>
                )}
              </button>
            );
          }

          return (
            <button
              key={lbl.key}
              ref={bindLabelRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectProvincia(lbl.provId);
              }}
              style={{ visibility: 'hidden', willChange: 'transform' }}
              className="pointer-events-auto absolute left-0 top-0 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-ink/25 bg-stone-surface/95 px-2 py-0.5 text-[11px] font-medium text-ink shadow-xs transition-colors duration-150 hover:border-ink hover:bg-ink hover:text-white"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: lbl.accent }}
              />
              <span className="whitespace-nowrap">{lbl.title}</span>
              {lbl.badgeCount !== undefined && lbl.badgeCount > 0 && (
                <span className="rounded-xs bg-ink px-1 text-[9.5px] font-semibold text-white tabular-nums">
                  +{lbl.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {wheelHint && (
        <div className="pointer-events-none absolute bottom-14 left-1/2 z-30 -translate-x-1/2 rounded-md border border-ink bg-ink/94 px-3 py-1.5 text-[12px] font-medium text-white shadow-md">
          Usá Ctrl + rueda para acercar o activá Rueda libre (Z) a la derecha
        </div>
      )}

      {isCoarsePointer && selectedId === null && (
        <button
          type="button"
          onClick={() => setTouchFreeOrbit((v) => !v)}
          className={`bencho-press absolute bottom-3.5 left-3.5 z-20 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-medium shadow-xs ${touchFreeOrbit
            ? 'border-cobalt bg-cobalt text-white'
            : 'border-rule bg-stone-surface/95 text-ink'
            }`}
        >
          <MousePointerClick className="h-3.5 w-3.5" />
          <span>{touchFreeOrbit ? 'Órbita 3D activa' : 'Tocá provincia o usá 2 dedos'}</span>
        </button>
      )}

      <div className="absolute right-3.5 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1.5">
        <button
          type="button"
          onClick={() => engineRef.current?.zoomSmoothBy(1.42)}
          aria-label="Acercar cámara 3D"
          title="Acercar"
          className="bencho-press flex h-9 w-9 cursor-pointer items-center justify-center border border-rule bg-stone-surface/95 text-ink shadow-xs transition-colors duration-150 hover:bg-ink hover:text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => engineRef.current?.zoomSmoothBy(1 / 1.42)}
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
          <Compass ref={compassIconRef} className="h-4 w-4 transition-transform duration-100" />
        </button>
        {!isCoarsePointer && (
          <button
            type="button"
            aria-pressed={wheelUnlocked}
            onClick={() => setWheelUnlocked((v) => !v)}
            title={wheelUnlocked ? 'Rueda libre activa (click para liberar scroll)' : 'Activar zoom directo con rueda'}
            className={`bencho-press flex h-9 w-9 cursor-pointer items-center justify-center border text-[10px] font-semibold shadow-xs transition-colors duration-150 ${wheelUnlocked
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

      {/* Tooltip posicionado imperativamente con translate3d (0 re-renders al mover el puntero) */}
      <div
        ref={tooltipElRef}
        style={{
          left: 0,
          top: 0,
          willChange: 'transform',
          display: hoverCard && !isCoarsePointer ? undefined : 'none',
        }}
        className="pointer-events-none absolute z-30 hidden w-60 border border-ink bg-ink px-3.5 py-2.5 text-white shadow-lg sm:block"
      >
        {hoverCard && (
          <>
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: hoverCard.accent }}
              />
              <p className="truncate text-[13px] font-medium text-white">{hoverCard.title}</p>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-white/80 tabular-nums">
              {hoverCard.subtitle}
            </p>
          </>
        )}
      </div>

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
