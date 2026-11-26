/**
 * Inkworks 3D Rendering Kit adaptado al Atlas Químico Argentino (MIT, basado en Moh4696/inkworks-skill).
 *
 * Provee sombreado técnico de 3 tonos (MeshToonMaterial), bordes de tinta precisos (EdgesGeometry),
 * silueta de grosor constante en pantalla (inverted hull shader), carcasas fantasma en línea punteada,
 * flujos de partículas deterministas acoplados a `theta` y proyección de etiquetas en 2 columnas sin solapamiento.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export { THREE, OrbitControls };

export const D2R = Math.PI / 180;
export const mod = (a: number, n: number): number => ((a % n) + n) % n;
export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
export const smooth = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const INK_HEX = '#14171f';
export const PAPER_HEX = '#f7f7f5';

export const ATLAS_PHASE_HUES = {
  cobalt: '#0a42e0',
  ochre: '#c86a11',
  emerald: '#0b7a53',
  red: '#d93025',
  slate: '#52555e',
} as const;

export interface StreamHandle {
  points: THREE.Points;
  curve: THREE.CatmullRomCurve3;
  mat: THREE.PointsMaterial;
  advance: (dFraction: number) => void;
}

export interface CalloutAnchorDef {
  n: number;
  name: string;
  description: string;
  phaseIndex: number;
  at: (target: THREE.Vector3) => void;
}

export interface PlacedCallout {
  n: number;
  name: string;
  description: string;
  phaseIndex: number;
  side: 'L' | 'R';
  ax: number;
  ay: number;
  colX: number;
  ly: number;
  elbowX: number;
  maxWidth: number;
}

export function makeInkworksKit(canvas: HTMLCanvasElement) {
  const INK = new THREE.Color(INK_HEX);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 240);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.panSpeed = 0.65;
  controls.maxPolarAngle = Math.PI * 0.485;
  controls.minPolarAngle = Math.PI * 0.08;
  controls.autoRotateSpeed = 0.55;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8d97a8, 1.55));
  const sun = new THREE.DirectionalLight(0xffffff, 2.15);
  sun.position.set(6, 11, 8);
  scene.add(sun);

  // Rampa toon de 3 escalones nítidos (estilo lámina técnica coloreada a mano)
  const ramp = new THREE.DataTexture(
    new Uint8Array([156, 156, 156, 255, 208, 208, 208, 255, 255, 255, 255, 255]),
    3,
    1
  );
  ramp.minFilter = THREE.NearestFilter;
  ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;

  const toon = (hex: string | number, extra: THREE.MeshToonMaterialParameters = {}) =>
    new THREE.MeshToonMaterial({
      color: hex,
      gradientMap: ramp,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      ...extra,
    });

  // Paleta calibrada sobre papel piedra claro (nada más oscuro que #858e9e para no empastar líneas de tinta)
  const M = {
    steel: toon('#c5ceda'),
    alloy: toon('#edf0f4'),
    dark: toon('#9ba6b6'),
    ceramic: toon('#ffffff'),
    carbon: toon('#8790a0'),
    concrete: toon('#e4e2da'),
    concreteDark: toon('#cbc8be'),
    copper: toon('#d79a61'),
    refractory: toon('#deb083'),
    cobalt: toon('#3a6fe2'),
    ochreBath: toon('#eb9f38'),
    moltenAl: toon('#e6eef8'),
    emerald: toon('#57b38e'),
    shipHull: toon('#8d9bb0'),
    shipBoot: toon('#cf5a49'),
    sea: toon('#6ca6dc', {
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      polygonOffset: false,
    }),
    seaBed: toon('#cad9e8'),
    glass: toon('#93bdf0', {
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      polygonOffset: false,
    }),
    glassEmerald: toon('#6cc9a3', {
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      polygonOffset: false,
    }),
  };

  const lineMat = new THREE.LineBasicMaterial({
    color: INK,
    transparent: true,
    opacity: 0.86,
  });

  const seaWaveMat = new THREE.LineBasicMaterial({
    color: 0x2b5d8c,
    transparent: true,
    opacity: 0.45,
  });

  const ghostLine = new THREE.LineDashedMaterial({
    color: INK,
    transparent: true,
    opacity: 0.44,
    dashSize: 0.12,
    gapSize: 0.09,
  });

  const ghostFill = new THREE.MeshBasicMaterial({
    color: 0x6b8ab0,
    transparent: true,
    opacity: 0.04,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const outlineMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: INK.clone() },
      uPx: { value: 0.0022 },
    },
    vertexShader: /* glsl */ `
      uniform float uPx;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        mv.xyz += n * uPx * max(-mv.z, 0.1);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      void main() {
        gl_FragColor = vec4(uColor, 1.0);
      }
    `,
    side: THREE.BackSide,
  });

  function part(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    { edges = 28, outline = true }: { edges?: number | false; outline?: boolean } = {}
  ): THREE.Group {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, mat));
    if (edges !== false) {
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, edges), lineMat));
    }
    if (outline) {
      g.add(new THREE.Mesh(geo, outlineMat));
    }
    return g;
  }

  function ghost(geo: THREE.BufferGeometry, threshold = 28): THREE.Group {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, ghostFill));
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, threshold), ghostLine);
    l.computeLineDistances();
    g.add(l);
    return g;
  }

  function ghostRings(curve: THREE.Curve<THREE.Vector3>, r: number, count = 6): THREE.Group {
    const g = new THREE.Group();
    const frames = curve.computeFrenetFrames(32, false);
    for (let i = 0; i < count; i++) {
      const k = Math.round((i / Math.max(1, count - 1)) * 32);
      const c = curve.getPointAt(k / 32);
      const n = frames.normals[k]!;
      const b = frames.binormals[k]!;
      const ring: THREE.Vector3[] = [];
      for (let j = 0; j <= 24; j++) {
        const a = (j / 24) * Math.PI * 2;
        ring.push(
          c
            .clone()
            .addScaledVector(n, Math.cos(a) * r)
            .addScaledVector(b, Math.sin(a) * r)
        );
      }
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), ghostLine);
      l.computeLineDistances();
      g.add(l);
    }
    return g;
  }

  function inkRing(r: number, y = 0, mat: THREE.Material = lineMat, seg = 48): THREE.LineLoop {
    const pts = Array.from(
      { length: seg },
      (_, k) =>
        new THREE.Vector3(
          Math.cos((k / seg) * Math.PI * 2) * r,
          y,
          Math.sin((k / seg) * Math.PI * 2) * r
        )
    );
    return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat);
  }

  // Textura nítida circular con borde de tinta suave para que las partículas se lean sobre blanco/piedra
  const dotTex = (() => {
    const cv = document.createElement('canvas');
    cv.width = 32;
    cv.height = 32;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, 16, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(20,23,31,0.45)';
    ctx.stroke();
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();

  const tmpVec = new THREE.Vector3();

  function stream(
    points: THREE.Vector3[],
    color: string | number | THREE.Color,
    {
      count = 28,
      size = 7,
      parent = null,
    }: { count?: number; size?: number; parent?: THREE.Object3D | null } = {}
  ): StreamHandle {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
    const mat = new THREE.PointsMaterial({
      color,
      size,
      sizeAttenuation: false,
      map: dotTex,
      alphaTest: 0.02,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.renderOrder = 4;
    if (parent) parent.add(pts);

    const t = Array.from({ length: count }, (_, k) => (k + 0.35) / count);

    const handle: StreamHandle = {
      points: pts,
      curve,
      mat,
      advance(dFraction: number) {
        const pos = geo.attributes.position as THREE.BufferAttribute;
        for (let k = 0; k < count; k++) {
          t[k] = mod(t[k]! + dFraction, 1);
          curve.getPointAt(t[k]!, tmpVec);
          pos.setXYZ(k, tmpVec.x, tmpVec.y, tmpVec.z);
        }
        pos.needsUpdate = true;
      },
    };
    handle.advance(0);
    return handle;
  }

  function dispose() {
    controls.dispose();
    ramp.dispose();
    dotTex.dispose();
    renderer.dispose();
  }

  return {
    THREE,
    renderer,
    scene,
    camera,
    controls,
    INK,
    toon,
    M,
    lineMat,
    seaWaveMat,
    ghostLine,
    ghostFill,
    outlineMat,
    part,
    ghost,
    ghostRings,
    inkRing,
    stream,
    dispose,
  };
}

export type InkworksKit = ReturnType<typeof makeInkworksKit>;

/**
 * Proyecta los puntos de anclaje 3D y distribuye los globos numerados en 2 columnas
 * laterales sin superposiciones (algoritmo de Inkworks adaptado a viewport responsive).
 */
export function projectCallouts2Columns(
  callouts: CalloutAnchorDef[],
  camera: THREE.Camera,
  width: number,
  height: number,
  worldBox: [[number, number, number], [number, number, number]],
  compactIds?: number[]
): PlacedCallout[] {
  if (width < 260 || height < 180) return [];

  const compact = width < 760;
  const filtered =
    compact && compactIds
      ? callouts.filter((c) => compactIds.includes(c.n))
      : callouts;

  const v = new THREE.Vector3();
  const toScreen = (vec: THREE.Vector3): [number, number] => [
    (vec.x * 0.5 + 0.5) * width,
    (-vec.y * 0.5 + 0.5) * height,
  ];

  // Caja proyectada del modelo completo para colocar las dos columnas por fuera o en márgenes limpios
  let minX = Infinity;
  let maxX = -Infinity;
  const [bmin, bmax] = worldBox;
  for (const x of [bmin[0], bmax[0]]) {
    for (const y of [bmin[1], bmax[1]]) {
      for (const z of [bmin[2], bmax[2]]) {
        v.set(x, y, z).project(camera);
        const [sx] = toScreen(v);
        minX = Math.min(minX, sx);
        maxX = Math.max(maxX, sx);
      }
    }
  }

  const raw: Array<CalloutAnchorDef & { ax: number; ay: number }> = [];
  for (const c of filtered) {
    c.at(v);
    v.project(camera);
    if (v.z >= 1 || v.z <= -1) continue;
    const [rawAx, rawAy] = toScreen(v);
    if (rawAx < -120 || rawAx > width + 120 || rawAy < -80 || rawAy > height + 80) continue;
    // Mantiene el punto guía dentro del borde visible si el usuario acerca mucho la cámara
    const ax = Math.max(8, Math.min(width - 8, rawAx));
    const ay = Math.max(8, Math.min(height - 8, rawAy));
    raw.push({ ...c, ax, ay });
  }

  raw.sort((a, b) => a.ax - b.ax || a.n - b.n);
  const half = Math.ceil(raw.length / 2);
  const sides: Record<'L' | 'R', typeof raw> = {
    L: raw.slice(0, half),
    R: raw.slice(half),
  };

  // Ancho máximo y márgenes adaptados al tamaño real del lienzo para que ninguna etiqueta se recorte ni desborde
  const outerPad = compact ? 10 : 14;
  const maxLabelW =
    width < 520
      ? Math.max(116, Math.floor((width - outerPad * 2 - 20) * 0.44))
      : compact
        ? Math.min(184, Math.floor(width * 0.29))
        : Math.min(208, Math.floor(width * 0.255));
  const labelPadX = outerPad + maxLabelW;

  const colL = Math.max(labelPadX, Math.min(width * 0.3, minX - 16));
  const colR = Math.min(width - labelPadX, Math.max(width * 0.7, maxX + 16));
  const gap = compact ? 48 : 54;
  const yTop = 26;
  const yBot = Math.max(yTop + gap, height - 58);

  const result: PlacedCallout[] = [];

  for (const side of ['L', 'R'] as const) {
    const list = sides[side];
    list.sort((a, b) => a.ay - b.ay);
    const ys: number[] = [];
    let cursor = -Infinity;
    for (const item of list) {
      const ly = Math.max(item.ay, cursor + gap, yTop);
      ys.push(ly);
      cursor = ly;
    }
    const overflow = (ys[ys.length - 1] ?? 0) - yBot;
    if (overflow > 0) {
      for (let i = 0; i < ys.length; i++) ys[i] = ys[i]! - overflow;
    }
    for (let i = ys.length - 2; i >= 0; i--) {
      ys[i] = Math.min(ys[i]!, ys[i + 1]! - gap);
    }
    for (let i = 0; i < ys.length; i++) {
      ys[i] = Math.max(yTop, Math.min(yBot, ys[i]!));
    }

    list.forEach((item, idx) => {
      const colX = side === 'L' ? colL : colR;
      const ly = ys[idx]!;
      const elbowX = side === 'L' ? colX + 10 : colX - 10;
      result.push({
        n: item.n,
        name: item.name,
        description: item.description,
        phaseIndex: item.phaseIndex,
        side,
        ax: item.ax,
        ay: item.ay,
        colX,
        ly,
        elbowX,
        maxWidth: maxLabelW,
      });
    });
  }

  return result;
}
