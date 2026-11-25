import {
  axisVector,
  boxCorners,
  corners,
  cylinder,
  depthOf,
  fitProjection,
  haloOf,
  insetPlan,
  iso,
  knurl,
  lineOnTop,
  pathOf,
  planOutline,
  radialTicks,
  ring,
  segment,
  sideArc,
  sideSeam,
  slabOf,
  topMatrix,
  topTicks,
  type Flat,
  type Plan,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from '@/lib/iso-kit';
import {
  arcOf,
  disc,
  fillet,
  frameAlong,
  prismOf,
  ringBand,
  solidOf,
} from '@/lib/iso-lathe.js';
import { tubePieces, type TubePiece } from '@/lib/iso-tube.js';

export type AluarAssemblyId = 'silo' | 'anodos' | 'cuba' | 'gtc' | 'fundicion';

export interface DrawnSolid {
  id: string;
  paths: SolidPaths;
  tone?: Tone;
  crease?: Tone | 'none';
  lit?: boolean;
  flat?: boolean;
  className?: string;
  innerLines?: Array<{ d: string; tone?: Tone }>;
  innerDots?: Array<{ points: Flat[]; size?: number; tone?: Tone }>;
}

export interface DrawnTube {
  id: string;
  pieces: TubePiece[];
  tone?: Tone;
  className?: string;
}

export interface DrawnLine {
  id: string;
  d: string;
  tone?: Tone | 'lit' | 'red' | 'green' | 'blue' | 'ochre';
  dashed?: boolean;
  flow?: boolean;
  className?: string;
}

export interface DrawnDots {
  id: string;
  points: Flat[];
  size?: number;
  tone?: Tone;
  pulse?: boolean;
}

export interface StageCameraBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StagePin {
  id: AluarAssemblyId;
  code: string;
  label: string;
  x: number;
  y: number;
}

export interface AluarAnatomyScene {
  width: number;
  height: number;
  projection: Projection;
  baseHalo: string;
  terrainSolids: DrawnSolid[];
  terrainLines: DrawnLine[];
  terrainDots: DrawnDots[];
  plateLabelTransform: string;
  pierSolids: DrawnSolid[];
  pierTubes: DrawnTube[];
  pierLines: DrawnLine[];
  pierDots: DrawnDots[];
  anodosPlantSolids: DrawnSolid[];
  anodosPlantLines: DrawnLine[];
  anodosPlantDots: DrawnDots[];
  gtcSolids: DrawnSolid[];
  gtcTubes: DrawnTube[];
  gtcLines: DrawnLine[];
  gtcDots: DrawnDots[];
  cubaBackSolids: DrawnSolid[];
  cubaBackLines: DrawnLine[];
  cubaCathodeSolids: DrawnSolid[];
  cubaMetalSolids: DrawnSolid[];
  cubaBathSolids: DrawnSolid[];
  cubaBathDots: DrawnDots[];
  cubaAnodesSolids: DrawnSolid[];
  cubaAnodesDots: DrawnDots[];
  cubaFrontSolids: DrawnSolid[];
  cubaHoodSolids: DrawnSolid[];
  cubaHoodLines: DrawnLine[];
  fundicionSolids: DrawnSolid[];
  fundicionTubes: DrawnTube[];
  fundicionLines: DrawnLine[];
  fundicionDots: DrawnDots[];
  dialSolids: DrawnSolid[];
  dialLines: DrawnLine[];
  dialDots: DrawnDots[];
  flowPaths: {
    aluminaFeed: string;
    dcBusbar: string;
    gasToGtc: string;
    gtcRecycle: string;
    metalTap: string;
  };
  explodeVectors: {
    metal: Flat;
    bath: Flat;
    anodos: Flat;
    hood: Flat;
  };
  pins: StagePin[];
  cameraViews: Record<'all' | AluarAssemblyId, StageCameraBox>;
  dialCenter: [number, number, number];
  dialRadius: number;
}

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 560;
const AZIMUTH = 48;
const ELEVATION = 32;

// Costa en L realista: bahía del Golfo Nuevo en el frente-izquierdo y terraza industrial rodeando por atrás y derecha
const SEA_PLAN: Plan = { x: -232, y: -10, w: 118, d: 132, r: 4 };
const LAND_BACK_WEST: Plan = { x: -232, y: -112, w: 124, d: 106, r: 4 };
const LAND_MAIN: Plan = { x: -114, y: -112, w: 308, d: 234, r: 5 };
const FULL_BASE_PLAN: Plan = { x: -232, y: -112, w: 426, d: 234, r: 6 };

function sortByDepth<T>(items: T[], pointOf: (item: T) => Point3, P: Projection): T[] {
  return [...items].sort((a, b) => depthOf(pointOf(a), P) - depthOf(pointOf(b), P));
}

function makePipe(
  id: string,
  waypoints: Point3[],
  radius: number,
  P: Projection,
  className?: string,
  tone: Tone = 'hi',
  bendFactor = 2.4
): DrawnTube {
  const routed = fillet(waypoints, radius * bendFactor, 6, { P, tube: radius });
  const pieces = tubePieces(routed, radius, P, { maxLength: 36, spacing: 2.2, caps: true });
  return { id, pieces, tone, className };
}

function makeFlow(waypoints: Point3[], P: Projection): string {
  const routed = fillet(waypoints, 5, 5);
  return pathOf(routed.map((pt) => iso(pt, P)));
}

export function buildDialNeedlePath(
  tempC: number,
  scene: Pick<AluarAnatomyScene, 'dialCenter' | 'dialRadius' | 'projection'>
): string {
  const [cx, cy, cz] = scene.dialCenter;
  const clamped = Math.max(0, Math.min(1250, tempC));
  const ratio = clamped / 1250;
  const angle = (-130 + ratio * 260) * (Math.PI / 180);
  const sinA = Math.sin(angle);
  const cosA = -Math.cos(angle);
  const tailLen = scene.dialRadius * 0.24;
  const tipLen = scene.dialRadius * 0.74;
  return lineOnTop(
    [cx - sinA * tailLen, cy - cosA * tailLen],
    [cx + sinA * tipLen, cy + cosA * tipLen],
    cz + 0.35,
    scene.projection
  );
}

function cameraForPoints(points: Point3[], P: Projection, padX = 48, padY = 40): StageCameraBox {
  const projected = points.map((pt) => iso(pt, P));
  const xs = projected.map((p) => p[0]);
  const ys = projected.map((p) => p[1]);
  const minX = Math.min(...xs) - padX;
  const maxX = Math.max(...xs) + padX;
  const minY = Math.min(...ys) - padY;
  const maxY = Math.max(...ys) + padY;
  const rawW = Math.max(330, maxX - minX);
  const rawH = Math.max(195, maxY - minY);
  const aspect = VIEW_WIDTH / VIEW_HEIGHT;
  let w = rawW;
  let h = rawH;
  if (w / h > aspect) {
    h = w / aspect;
  } else {
    w = h * aspect;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const clampedX = Math.max(0, Math.min(VIEW_WIDTH - w, cx - w / 2));
  const clampedY = Math.max(0, Math.min(VIEW_HEIGHT - h, cy - h / 2));
  return {
    x: Math.round(clampedX * 10) / 10,
    y: Math.round(clampedY * 10) / 10,
    w: Math.round(Math.min(VIEW_WIDTH, w) * 10) / 10,
    h: Math.round(Math.min(VIEW_HEIGHT, h) * 10) / 10,
  };
}

export function buildAluarAnatomyScene(): AluarAnatomyScene {
  const bounds: Point3[] = [
    ...boxCorners(FULL_BASE_PLAN, -20, 48),
    [-168, -68, 62],
    [-86, 20, 92],
    [138, -74, 110],
    [10, 12, 134],
  ];

  const P = fitProjection(bounds, VIEW_WIDTH, VIEW_HEIGHT, {
    pad: 18,
    headroom: 28,
    azimuth: AZIMUTH,
    elevation: ELEVATION,
  });

  // ---------------------------------------------------------------------------
  // 1. TERRENO COSTERO PUERTO MADRYN: GOLFO NUEVO + TERRAZA EN L
  // ---------------------------------------------------------------------------
  const baseHalo = haloOf(FULL_BASE_PLAN, -22, 10, P);
  const terrainSolids: DrawnSolid[] = [];
  const terrainLines: DrawnLine[] = [];
  const terrainDots: DrawnDots[] = [];

  const feet = sortByDepth(
    [
      [-210, -92],
      [-210, 102],
      [174, -92],
      [174, 102],
    ] as Array<[number, number]>,
    ([fx, fy]) => [fx, fy, -19],
    P
  );
  feet.forEach(([fx, fy], idx) => {
    terrainSolids.push({
      id: `base-foot-${idx}`,
      paths: cylinder(fx, fy, 6.2, -22, 6, P, 20),
      tone: 'lo',
      crease: 'faint',
    });
  });

  // Sector terrestre noroeste (donde se ubica la Planta de Ánodos, completamente despejada!)
  terrainSolids.push({
    id: 'terrain-land-nw',
    paths: slabOf(LAND_BACK_WEST, -16, 16, P, 5, 1.2),
    tone: 'mid',
    crease: 'lo',
    className: 'iso-terrain-stone',
    innerLines: [{ d: sideSeam(LAND_BACK_WEST, -8, P, 5), tone: 'faint' }],
  });

  // Terraza industrial principal de Puerto Madryn
  terrainSolids.push({
    id: 'terrain-land-main',
    paths: slabOf(LAND_MAIN, -16, 16, P, 6, 1.4),
    tone: 'mid',
    crease: 'lo',
    className: 'iso-terrain-stone',
    innerLines: [{ d: sideSeam(LAND_MAIN, -8, P, 6), tone: 'faint' }],
  });

  // Muros costeros en L delimitando la bahía del Golfo Nuevo
  terrainSolids.push(
    {
      id: 'terrain-seawall-north',
      paths: slabOf({ x: -232, y: -14, w: 118, d: 6, r: 0.8 }, -16, 17.4, P, 3, 0.45),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-concrete',
    },
    {
      id: 'terrain-seawall-east',
      paths: slabOf({ x: -118, y: -14, w: 6, d: 136, r: 0.8 }, -16, 17.4, P, 3, 0.45),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-concrete',
    }
  );

  // Cuenca marina del Golfo Nuevo
  terrainSolids.push({
    id: 'terrain-golfo-nuevo',
    paths: slabOf(SEA_PLAN, -16, 9, P, 5, 0.8),
    tone: 'mid',
    crease: 'lo',
    className: 'iso-water',
    innerLines: [{ d: sideSeam(SEA_PLAN, -11.5, P, 5), tone: 'faint' }],
  });

  [
    [[-218, 108], [-186, 108]],
    [[-222, 86], [-198, 86]],
    [[-156, 106], [-128, 106]],
    [[-158, 14], [-130, 14]],
    [[-216, 6], [-188, 6]],
  ].forEach(([a, b], idx) => {
    terrainLines.push({
      id: `water-ripple-${idx}`,
      d: lineOnTop(a as [number, number], b as [number, number], -6.8, P),
      tone: 'blue',
      className: 'iso-water-ripple',
    });
  });

  // Ranura fresada perimetral + regla graduada + placa grabada
  terrainLines.push({
    id: 'land-groove',
    d: planOutline(insetPlan(LAND_MAIN, 6), 0.1, P, 6),
    tone: 'faint',
  });

  const rulerPlan: Plan = { x: -34, y: 110, w: 146, d: 6.5, r: 1 };
  terrainSolids.push({
    id: 'base-ruler',
    paths: slabOf(rulerPlan, 0, 0.7, P, 3),
    tone: 'lo',
    crease: 'none',
  });
  const ticks = topTicks(
    rulerPlan.x + 4,
    rulerPlan.x + rulerPlan.w - 4,
    4,
    5,
    rulerPlan.y + 0.8,
    0.7,
    [1.8, 3.3],
    P,
    'x'
  );
  terrainLines.push(
    { id: 'base-ruler-minor', d: ticks.minor, tone: 'lo' },
    { id: 'base-ruler-major', d: ticks.major, tone: 'mid' }
  );

  const labelPlan: Plan = { x: -104, y: 108, w: 62, d: 9.5, r: 1.2 };
  terrainSolids.push({
    id: 'base-label-plate',
    paths: slabOf(labelPlan, 0, 0.9, P, 4),
    tone: 'mid',
    crease: 'faint',
  });
  terrainLines.push({
    id: 'base-label-border',
    d: planOutline(insetPlan(labelPlan, 1.3), 0.9, P, 4),
    tone: 'faint',
  });
  terrainDots.push({
    id: 'base-label-rivets',
    points: [
      iso([labelPlan.x + 3, labelPlan.y + 4.8, 0.9], P),
      iso([labelPlan.x + labelPlan.w - 3, labelPlan.y + 4.8, 0.9], P),
    ],
    size: 0.5,
    tone: 'hi',
  });
  const plateLabelTransform = topMatrix([labelPlan.x + 7, labelPlan.y + 6.5], 0.95, P, 'x');

  // ---------------------------------------------------------------------------
  // 2. ENSAMBLE 02 (ATRÁS-OESTE, 100% DESPEJADO): PLANTA DE ÁNODOS Y HORNO 1.150 °C
  // ---------------------------------------------------------------------------
  const anodosPlantSolids: DrawnSolid[] = [];
  const anodosPlantLines: DrawnLine[] = [];
  const anodosPlantDots: DrawnDots[] = [];

  const furnacePlan: Plan = { x: -214, y: -96, w: 86, d: 52, r: 2.5 };
  anodosPlantSolids.push({
    id: 'anode-furnace-base',
    paths: slabOf(furnacePlan, 0, 5.5, P, 4, 0.6),
    tone: 'mid',
    crease: 'faint',
    className: 'iso-concrete',
  });
  // Bloque refractario del horno de cocción de ánodos (ring-pit furnace 1.100-1.200 °C)
  anodosPlantSolids.push({
    id: 'anode-furnace-body',
    paths: slabOf(insetPlan(furnacePlan, 3), 5.5, 19, P, 4, 0.8),
    tone: 'hi',
    crease: 'lo',
    className: 'iso-refractory',
    innerLines: [{ d: sideSeam(insetPlan(furnacePlan, 3), 15, P, 4), tone: 'mid' }],
  });
  // 3 fosas incandescentes de cocción visibles en la parte superior
  [-202, -178, -154].forEach((px, idx) => {
    anodosPlantSolids.push({
      id: `anode-pit-glow-${idx}`,
      paths: slabOf({ x: px, y: -86, w: 16, d: 30, r: 1 }, 24.5, 1.5, P, 3),
      tone: 'hi',
      crease: 'none',
      className: 'iso-cryolite',
    });
  });
  // Puente quemador y chimenea del horno de ánodos
  anodosPlantSolids.push({
    id: 'anode-burner-bridge',
    paths: slabOf({ x: -186, y: -94, w: 26, d: 48, r: 1.5 }, 26, 7.5, P, 4, 0.5),
    tone: 'hi',
    crease: 'lo',
    className: 'iso-steel-mid',
  });
  anodosPlantSolids.push({
    id: 'anode-burner-stack',
    paths: cylinder(-173, -70, 4.4, 33.5, 15, P, 22, 0.35),
    tone: 'hi',
    crease: 'faint',
    className: 'iso-steel-bright',
  });

  // Estación de envarillado (rodding rack) al frente del horno con 3 ánodos precocidos listos
  anodosPlantSolids.push({
    id: 'rodding-bench',
    paths: slabOf({ x: -206, y: -38, w: 72, d: 20, r: 1.5 }, 0, 4.5, P, 3, 0.5),
    tone: 'mid',
    crease: 'faint',
    className: 'iso-concrete',
  });
  [-198, -176, -154].forEach((ax, idx) => {
    anodosPlantSolids.push({
      id: `fresh-anode-${idx}`,
      paths: slabOf({ x: ax, y: -35, w: 14, d: 13, r: 1 }, 4.5, 9.5, P, 3, 0.4),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-carbon',
    });
    anodosPlantSolids.push({
      id: `fresh-anode-rod-${idx}`,
      paths: slabOf({ x: ax + 5.5, y: -30, w: 3, d: 3, r: 0.4 }, 14, 13, P, 2),
      tone: 'hi',
      crease: 'none',
      className: 'iso-dc-busbar',
    });
  });

  // ---------------------------------------------------------------------------
  // 3. ENSAMBLE 04 (ATRÁS-DERECHA): CENTRO DE TRATAMIENTO DE GASES (GTC)
  // ---------------------------------------------------------------------------
  const gtcSolids: DrawnSolid[] = [];
  const gtcTubes: DrawnTube[] = [];
  const gtcLines: DrawnLine[] = [];
  const gtcDots: DrawnDots[] = [];

  const gtcPlinth: Plan = { x: 64, y: -100, w: 98, d: 56, r: 3 };
  gtcSolids.push({
    id: 'gtc-plinth',
    paths: slabOf(gtcPlinth, 0, 6.5, P, 5, 0.7),
    tone: 'mid',
    crease: 'faint',
    className: 'iso-concrete',
  });

  const cyclones = sortByDepth(
    [
      { id: 'cyc-a', x: 82, y: -76 },
      { id: 'cyc-b', x: 108, y: -76 },
    ],
    (c) => [c.x, c.y, 35],
    P
  );
  cyclones.forEach((cy) => {
    const cf = frameAlong([cy.x, cy.y, 6.5], [0, 0, 1]);
    gtcSolids.push({
      id: `${cy.id}-body`,
      paths: solidOf(
        [
          [0, 3.2],
          [16, 11.5],
          [42, 11.5],
          [46, 5.2],
          [50, 5.2],
        ],
        cf,
        P,
        { bevel: 0.35 }
      ),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-gtc-emerald',
      innerLines: [{ d: arcOf(cf, 28, 11.5, P), tone: 'mid' }],
    });
  });

  const bagPlan: Plan = { x: 124, y: -92, w: 32, d: 38, r: 2 };
  gtcSolids.push({
    id: 'gtc-baghouse',
    paths: slabOf(bagPlan, 6.5, 48, P, 4, 0.8),
    tone: 'hi',
    crease: 'lo',
    className: 'iso-steel-bright',
    innerLines: [
      { d: sideSeam(bagPlan, 22, P, 4), tone: 'mid' },
      { d: sideSeam(bagPlan, 38, P, 4), tone: 'mid' },
    ],
  });
  const bagVentRaw = [
    [bagPlan.x + 5, bagPlan.y + 6],
    [bagPlan.x + 11.5, bagPlan.y + 6],
    [bagPlan.x + 18, bagPlan.y + 6],
    [bagPlan.x + 24.5, bagPlan.y + 6],
    [bagPlan.x + 5, bagPlan.y + 30],
    [bagPlan.x + 11.5, bagPlan.y + 30],
    [bagPlan.x + 18, bagPlan.y + 30],
    [bagPlan.x + 24.5, bagPlan.y + 30],
  ];
  gtcDots.push({
    id: 'gtc-baghouse-vents',
    points: bagVentRaw.map(([vx, vy]) => iso([vx, vy, 54.5], P)),
    size: 0.55,
    tone: 'mid',
  });

  // Chimenea industrial limpia en 2 segmentos escalonados (sin artefactos de silueta)
  gtcSolids.push(
    {
      id: 'gtc-stack-collar',
      paths: cylinder(140, -73, 7.2, 54.5, 5, P, 28, 0.4),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-steel-mid',
    },
    {
      id: 'gtc-stack-lower',
      paths: cylinder(140, -73, 5.4, 59.5, 22, P, 28, 0.35),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-steel-mid',
    },
    {
      id: 'gtc-stack-upper',
      paths: cylinder(140, -73, 4.4, 81.5, 20, P, 24, 0.35),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-steel-bright',
    }
  );
  gtcLines.push({
    id: 'gtc-stack-bore',
    d: ring(140, -73, 3.0, 101.5, P, 20),
    tone: 'hi',
  });

  gtcTubes.push(
    makePipe(
      'gtc-suction-duct',
      [
        [24, -18, 86],
        [24, -76, 86],
        [82, -76, 56],
      ],
      3.3,
      P,
      'iso-pipe-gas'
    )
  );
  gtcTubes.push(
    makePipe(
      'gtc-recycle-duct',
      [
        [82, -76, 15],
        [44, -56, 15],
        [44, -16, 84],
        [16, -4, 88],
      ],
      2.3,
      P,
      'iso-pipe-recycle'
    )
  );

  // ---------------------------------------------------------------------------
  // 4. ENSAMBLE 01 (FRENTE-IZQUIERDA COSTERA): MUELLE STORNI, BUQUE, GRÚA Y SILOS
  // ---------------------------------------------------------------------------
  const pierSolids: DrawnSolid[] = [];
  const pierTubes: DrawnTube[] = [];
  const pierLines: DrawnLine[] = [];
  const pierDots: DrawnDots[] = [];

  const pierPilings = sortByDepth(
    [
      [-164, 24],
      [-138, 24],
      [-164, 54],
      [-138, 54],
      [-164, 84],
      [-138, 84],
    ] as Array<[number, number]>,
    ([px, py]) => [px, py, -4],
    P
  );
  pierPilings.forEach(([px, py], idx) => {
    pierSolids.push({
      id: `pier-piling-${idx}`,
      paths: cylinder(px, py, 2.8, -7, 8, P, 16),
      tone: 'hi',
      crease: 'none',
      className: 'iso-concrete',
    });
  });

  const pierDeck: Plan = { x: -170, y: 18, w: 54, d: 72, r: 1.8 };
  pierSolids.push({
    id: 'pier-deck',
    paths: slabOf(pierDeck, 0.5, 4.2, P, 4, 0.6),
    tone: 'hi',
    crease: 'lo',
    className: 'iso-concrete',
    innerLines: [{ d: sideSeam(pierDeck, 2.6, P, 4), tone: 'faint' }],
  });

  [26, 45, 64, 82].forEach((by, idx) => {
    pierSolids.push({
      id: `pier-bollard-${idx}`,
      paths: cylinder(-167.5, by, 1.6, 4.7, 2.6, P, 12),
      tone: 'hi',
      crease: 'none',
      className: 'iso-carbon',
    });
  });

  // Buque granelero alúminero amarrado en Sitio 1
  const shipF = frameAlong([-196, 54, -7], [0, 0, 1]);
  const hullPolygon: Array<[number, number]> = [
    [-46, 0],
    [-34, 13],
    [40, 13],
    [45, 9],
    [45, -9],
    [40, -13],
    [-34, -13],
  ];
  pierSolids.push({
    id: 'ship-waterline',
    paths: prismOf(shipF, hullPolygon, 0, 3.2, P),
    tone: 'hi',
    crease: 'none',
    className: 'iso-ship-boot',
  });
  pierSolids.push({
    id: 'ship-hull',
    paths: prismOf(shipF, hullPolygon, 3.2, 12.2, P),
    tone: 'hi',
    crease: 'lo',
    className: 'iso-ship-hull',
  });
  const deckInset: Array<[number, number]> = [
    [-39, 0],
    [-30, 10.5],
    [37, 10.5],
    [41, 7],
    [41, -7],
    [37, -10.5],
    [-30, -10.5],
  ];
  pierSolids.push({
    id: 'ship-deck',
    paths: prismOf(shipF, deckInset, 12.2, 13.4, P),
    tone: 'mid',
    crease: 'faint',
  });

  const shipHolds = sortByDepth([36, 56, 76], (hy) => [-196, hy, 7], P);
  shipHolds.forEach((hy, idx) => {
    pierSolids.push({
      id: `ship-hatch-rim-${idx}`,
      paths: slabOf({ x: -204, y: hy - 8, w: 16, d: 15, r: 1 }, 6.4, 2.2, P, 3, 0.3),
      tone: 'hi',
      crease: 'faint',
      className: 'iso-ship-hull',
    });
    pierSolids.push({
      id: `ship-alumina-heap-${idx}`,
      paths: solidOf(
        [
          [0, 6.2],
          [3.6, 2.4],
          [4.2, 0.4],
        ],
        frameAlong([-196, hy - 0.5, 8.2], [0, 0, 1]),
        P
      ),
      tone: 'lo',
      crease: 'none',
      className: 'iso-alumina-powder',
    });
  });

  pierSolids.push(
    {
      id: 'ship-bridge-lower',
      paths: slabOf({ x: -205, y: 12, w: 18, d: 12, r: 1.2 }, 6.4, 11, P, 3, 0.5),
      tone: 'hi',
      crease: 'lo',
    },
    {
      id: 'ship-bridge-upper',
      paths: slabOf({ x: -206.5, y: 13.5, w: 21, d: 8.5, r: 1 }, 17.4, 6.2, P, 3, 0.4),
      tone: 'hi',
      crease: 'lo',
    },
    {
      id: 'ship-funnel',
      paths: cylinder(-196, 16, 2.8, 23.6, 6.5, P, 18, 0.3),
      tone: 'hi',
      crease: 'faint',
      className: 'iso-ship-boot',
    }
  );

  // Grúa pórtico descargadora neumática sobre rieles en Muelle Storni
  pierSolids.push(
    {
      id: 'crane-rail-l',
      paths: slabOf({ x: -163, y: 22, w: 2.2, d: 62, r: 0.4 }, 4.7, 1, P, 2),
      tone: 'mid',
      crease: 'none',
    },
    {
      id: 'crane-rail-r',
      paths: slabOf({ x: -143, y: 22, w: 2.2, d: 62, r: 0.4 }, 4.7, 1, P, 2),
      tone: 'mid',
      crease: 'none',
    }
  );
  const craneLegs = sortByDepth(
    [
      [-163, 45],
      [-144, 45],
      [-163, 61],
      [-144, 61],
    ] as Array<[number, number]>,
    ([cx, cy]) => [cx, cy, 16],
    P
  );
  craneLegs.forEach(([cx, cy], idx) => {
    pierSolids.push({
      id: `crane-leg-${idx}`,
      paths: slabOf({ x: cx, y: cy, w: 3.4, d: 3.4, r: 0.5 }, 5.7, 22, P, 2),
      tone: 'hi',
      crease: 'faint',
      className: 'iso-crane-cobalt',
    });
  });
  pierSolids.push(
    {
      id: 'crane-machinery-house',
      paths: slabOf({ x: -165, y: 44, w: 26, d: 21, r: 1.5 }, 27.7, 13, P, 4, 0.6),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-crane-cobalt',
    },
    {
      id: 'crane-boom',
      paths: slabOf({ x: -201, y: 52, w: 42, d: 5.5, r: 0.8 }, 36.5, 4.2, P, 3, 0.35),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-crane-cobalt',
    }
  );
  pierTubes.push(
    makePipe(
      'crane-suction-pipe',
      [
        [-196, 54.8, 36.5],
        [-196, 54.8, 11],
      ],
      2.2,
      P,
      'iso-pipe-alumina'
    )
  );

  // Silos costeros de alúmina calcinada con holgura respecto al dial y la cuba
  const siloSpecs = sortByDepth(
    [
      { id: 'silo-back', x: -88, y: 2 },
      { id: 'silo-front', x: -88, y: 44 },
    ],
    (s) => [s.x, s.y, 40],
    P
  );

  siloSpecs.forEach((sp) => {
    const sf = frameAlong([sp.x, sp.y, 0], [0, 0, 1]);
    pierSolids.push({
      id: `${sp.id}-base`,
      paths: cylinder(sp.x, sp.y, 19.5, 0, 5, P, 28, 0.6),
      tone: 'mid',
      crease: 'faint',
      className: 'iso-concrete',
    });
    pierSolids.push({
      id: `${sp.id}-vessel`,
      paths: solidOf(
        [
          [5, 6.2],
          [17, 17],
          [64, 17],
          [73, 4.4],
          [77, 4.4],
        ],
        sf,
        P,
        { bevel: 0.4 }
      ),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-steel-bright',
      innerLines: [
        { d: arcOf(sf, 33, 17, P), tone: 'mid' },
        { d: arcOf(sf, 49, 17, P), tone: 'mid' },
      ],
    });
  });

  // Galería cubierta saliendo a ras de la cabina de la grúa hasta el silo frontal
  pierTubes.push(
    makePipe(
      'storni-conveyor-gallery',
      [
        [-139, 54, 34],
        [-114, 54, 58],
        [-88, 44, 73],
      ],
      3.6,
      P,
      'iso-pipe-steel',
      'hi',
      1.8
    )
  );
  // Ducto de transferencia desde los silos entrando a ras de la tolva central de la cuba
  pierTubes.push(
    makePipe(
      'silo-to-pot-duct',
      [
        [-88, 44, 73],
        [-88, 2, 73],
        [-62, 2, 73],
        [-24, 2, 90],
      ],
      2.5,
      P,
      'iso-pipe-alumina'
    )
  );

  // ---------------------------------------------------------------------------
  // 5. ENSAMBLE 03 (CENTRO HERO): CUBA HALL-HÉROULT EN CORTE ABIERTO
  // ---------------------------------------------------------------------------
  const cubaBackSolids: DrawnSolid[] = [];
  const cubaBackLines: DrawnLine[] = [];
  const cubaCathodeSolids: DrawnSolid[] = [];
  const cubaMetalSolids: DrawnSolid[] = [];
  const cubaBathSolids: DrawnSolid[] = [];
  const cubaBathDots: DrawnDots[] = [];
  const cubaAnodesSolids: DrawnSolid[] = [];
  const cubaAnodesDots: DrawnDots[] = [];
  const cubaFrontSolids: DrawnSolid[] = [];
  const cubaHoodSolids: DrawnSolid[] = [];
  const cubaHoodLines: DrawnLine[] = [];

  const CELL_OUTER: Plan = { x: -46, y: -22, w: 118, d: 68, r: 3 };
  const CELL_INNER: Plan = { x: -38, y: -14, w: 102, d: 52, r: 1.5 };

  const cellPiers = sortByDepth(
    [
      { x: -40, y: -18, w: 18, d: 14, r: 1.4 },
      { x: 46, y: -18, w: 18, d: 14, r: 1.4 },
      { x: -40, y: 28, w: 18, d: 14, r: 1.4 },
      { x: 46, y: 28, w: 18, d: 14, r: 1.4 },
    ],
    (pl) => [pl.x + pl.w / 2, pl.y + pl.d / 2, 5],
    P
  );
  cellPiers.forEach((pl, idx) => {
    cubaBackSolids.push({
      id: `cell-pier-${idx}`,
      paths: slabOf(pl, 0, 10, P, 3, 0.5),
      tone: 'mid',
      crease: 'faint',
      className: 'iso-steel-mid',
    });
  });

  cubaBackSolids.push(
    {
      id: 'cell-shell-floor',
      paths: slabOf(CELL_OUTER, 10, 6, P, 4, 0.7),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-steel-mid',
    },
    {
      id: 'cell-wall-back-x',
      paths: slabOf({ x: CELL_OUTER.x, y: CELL_OUTER.y, w: 8, d: CELL_OUTER.d, r: 1.4 }, 16, 28, P, 3, 0.6),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-steel-mid',
    },
    {
      id: 'cell-wall-back-y',
      paths: slabOf({ x: CELL_OUTER.x, y: CELL_OUTER.y, w: CELL_OUTER.w, d: 8, r: 1.4 }, 16, 28, P, 3, 0.6),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-steel-mid',
    },
    {
      id: 'gantry-post-bl',
      paths: slabOf({ x: -46, y: -22, w: 8, d: 8, r: 1 }, 44, 38, P, 3, 0.4),
      tone: 'hi',
      crease: 'faint',
      className: 'iso-steel-bright',
    },
    {
      id: 'gantry-post-br',
      paths: slabOf({ x: 64, y: -22, w: 8, d: 8, r: 1 }, 44, 38, P, 3, 0.4),
      tone: 'hi',
      crease: 'faint',
      className: 'iso-steel-bright',
    }
  );

  // Interior estratificado de la cuba Hall-Héroult
  cubaCathodeSolids.push(
    {
      id: 'cell-refractory',
      paths: slabOf(CELL_INNER, 16, 5, P, 3, 0.35),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-refractory',
    },
    {
      id: 'cell-cathode-carbon',
      paths: slabOf(insetPlan(CELL_INNER, 1.4), 21, 6, P, 3, 0.4),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-carbon',
      innerLines: [
        { d: lineOnTop([-12, -12.6], [-12, 36.6], 27, P), tone: 'mid' },
        { d: lineOnTop([13, -12.6], [13, 36.6], 27, P), tone: 'mid' },
        { d: lineOnTop([38, -12.6], [38, 36.6], 27, P), tone: 'mid' },
      ],
    }
  );

  cubaMetalSolids.push({
    id: 'cell-molten-al',
    paths: slabOf(insetPlan(CELL_INNER, 2), 27, 6.5, P, 3, 0.4),
    tone: 'hi',
    crease: 'mid',
    className: 'iso-molten-al',
  });

  cubaBathSolids.push({
    id: 'cell-cryolite-bath',
    paths: slabOf(insetPlan(CELL_INNER, 2), 33.5, 9, P, 3, 0.4),
    tone: 'hi',
    crease: 'lo',
    className: 'iso-cryolite',
  });
  cubaBathDots.push({
    id: 'cell-bath-bubbles',
    points: [
      iso([-22, 6, 42.7], P),
      iso([2, 24, 42.7], P),
      iso([26, 2, 42.7], P),
      iso([44, 22, 42.7], P),
      iso([-6, 18, 42.7], P),
    ],
    size: 0.85,
    tone: 'hi',
    pulse: true,
  });

  // 4 ánodos precocidos centrados simétricamente dentro del baño + viga CC ajustada dentro del pórtico
  const cellAnodes = sortByDepth(
    [
      { id: 'ca1', x: -30, y: -7 },
      { id: 'ca2', x: -6, y: -7 },
      { id: 'ca3', x: 18, y: -7 },
      { id: 'ca4', x: 42, y: -7 },
    ],
    (a) => [a.x + 8.5, a.y + 18, 46],
    P
  );

  cellAnodes.forEach((an) => {
    const bp: Plan = { x: an.x, y: an.y, w: 17.5, d: 35, r: 1.6 };
    cubaAnodesSolids.push(
      {
        id: `anode-block-${an.id}`,
        paths: slabOf(bp, 38.5, 14.5, P, 4, 0.6),
        tone: 'hi',
        crease: 'lo',
        className: 'iso-carbon',
        innerLines: [{ d: sideSeam(bp, 45.8, P, 4), tone: 'mid' }],
      },
      {
        id: `anode-yoke-${an.id}`,
        paths: slabOf({ x: an.x + 3.8, y: an.y + 10.5, w: 10, d: 14, r: 1 }, 53, 4.2, P, 3, 0.3),
        tone: 'hi',
        crease: 'faint',
        className: 'iso-steel-bright',
      },
      {
        id: `anode-rod-${an.id}`,
        paths: slabOf({ x: an.x + 6.8, y: an.y + 15.5, w: 4, d: 4, r: 0.5 }, 57.2, 18.5, P, 2),
        tone: 'hi',
        crease: 'none',
        className: 'iso-dc-busbar',
      },
      {
        id: `anode-clamp-${an.id}`,
        paths: slabOf({ x: an.x + 5, y: an.y + 13, w: 7.6, d: 9, r: 0.9 }, 68.5, 6.8, P, 3, 0.35),
        tone: 'hi',
        crease: 'lo',
        className: 'iso-steel-bright',
      }
    );
    cubaAnodesDots.push({
      id: `anode-bolt-${an.id}`,
      points: [iso([an.x + 8.8, an.y + 17.5, 75.3], P)],
      size: 0.65,
      tone: 'hi',
    });
  });

  // Viga CC terminando a ras dentro de las columnas del pórtico
  const busPlan: Plan = { x: -42, y: 7, w: 108, d: 8.5, r: 1.5 };
  cubaAnodesSolids.push({
    id: 'anode-dc-busbar',
    paths: slabOf(busPlan, 66.5, 8, P, 4, 0.6),
    tone: 'hi',
    crease: 'lo',
    className: 'iso-dc-busbar',
    innerLines: [{ d: sideSeam(busPlan, 70.5, P, 4), tone: 'mid' }],
  });

  // Labio cortado frontal + 5 barras colectoras de cátodo + columnas frontales
  cubaFrontSolids.push(
    {
      id: 'cell-lip-y',
      paths: slabOf({ x: CELL_OUTER.x, y: CELL_OUTER.y + CELL_OUTER.d - 6, w: CELL_OUTER.w, d: 6, r: 1 }, 16, 5.5, P, 3, 0.4),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-steel-mid',
    },
    {
      id: 'cell-lip-x',
      paths: slabOf({ x: CELL_OUTER.x + CELL_OUTER.w - 6, y: CELL_OUTER.y, w: 6, d: CELL_OUTER.d, r: 1 }, 16, 5.5, P, 3, 0.4),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-steel-mid',
    }
  );
  const cathodeBars = sortByDepth([-30, -8, 14, 36, 54], (bx) => [bx, 50, 18], P);
  cathodeBars.forEach((bx, idx) => {
    cubaFrontSolids.push({
      id: `cathode-bar-${idx}`,
      paths: slabOf({ x: bx, y: 44, w: 7.5, d: 11, r: 0.9 }, 15.5, 4.4, P, 3, 0.35),
      tone: 'hi',
      crease: 'faint',
      className: 'iso-dc-busbar',
    });
  });

  cubaFrontSolids.push(
    {
      id: 'gantry-post-fl',
      paths: slabOf({ x: -46, y: 38, w: 8, d: 8, r: 1 }, 21.5, 60.5, P, 3, 0.4),
      tone: 'hi',
      crease: 'faint',
      className: 'iso-steel-bright',
    },
    {
      id: 'gantry-post-fr',
      paths: slabOf({ x: 64, y: 38, w: 8, d: 8, r: 1 }, 21.5, 60.5, P, 3, 0.4),
      tone: 'hi',
      crease: 'faint',
      className: 'iso-steel-bright',
    }
  );

  // Superestructura: tolva dosificadora puntual + brida de acople del ducto de alúmina (sin líneas flotantes!)
  cubaHoodSolids.push(
    {
      id: 'cell-hood-back',
      paths: slabOf({ x: -46, y: -22, w: 118, d: 18, r: 1.8 }, 82, 8, P, 4, 0.6),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-steel-mid',
    },
    {
      id: 'cell-alumina-hopper-flange',
      paths: disc(-1.8, 1.8, 4.2, frameAlong([-28, 2, 90], [1, 0, 0]), P),
      tone: 'hi',
      crease: 'faint',
      className: 'iso-steel-mid',
    },
    {
      id: 'cell-alumina-hopper',
      paths: slabOf({ x: -28, y: -12, w: 74, d: 24, r: 2.2 }, 84, 13, P, 4, 0.8),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-steel-bright',
      innerLines: [{ d: sideSeam({ x: -28, y: -12, w: 74, d: 24, r: 2.2 }, 90.5, P, 4), tone: 'mid' }],
    },
    {
      id: 'cell-point-feeder',
      paths: cylinder(9, 0, 5.5, 97, 6.5, P, 24, 0.4),
      tone: 'hi',
      crease: 'faint',
      className: 'iso-crane-cobalt',
    },
    {
      id: 'cell-hood-front-rail',
      paths: slabOf({ x: -46, y: 38, w: 118, d: 8, r: 1.2 }, 82, 5.5, P, 3, 0.45),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-steel-mid',
    }
  );

  // ---------------------------------------------------------------------------
  // 6. ENSAMBLE 05 (FRENTE-DERECHA): CRISOL, HORNO 720 °C, LINGOTES, BARROTES Y ALAMBRÓN
  // ---------------------------------------------------------------------------
  const fundicionSolids: DrawnSolid[] = [];
  const fundicionTubes: DrawnTube[] = [];
  const fundicionLines: DrawnLine[] = [];
  const fundicionDots: DrawnDots[] = [];

  fundicionTubes.push(
    makePipe(
      'molten-siphon-tube',
      [
        [66, 12, 30],
        [94, 12, 30],
        [94, 12, 42],
        [112, 12, 42],
        [112, 12, 33],
      ],
      2.4,
      P,
      'iso-pipe-alumina'
    )
  );

  const crucF = frameAlong([112, 12, 0], [0, 0, 1]);
  fundicionSolids.push(
    {
      id: 'cast-crucible-stand',
      paths: slabOf({ x: 94, y: -6, w: 36, d: 36, r: 3 }, 0, 4.5, P, 4, 0.5),
      tone: 'mid',
      crease: 'faint',
      className: 'iso-concrete',
    },
    {
      id: 'cast-crucible-lathe',
      paths: solidOf(
        [
          [4.5, 11.5],
          [27, 15],
          [30, 16],
          [33, 16],
          [33, 12.5],
        ],
        crucF,
        P,
        { bevel: 0.35 }
      ),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-steel-mid',
      innerLines: [{ d: arcOf(crucF, 16, 13.3, P), tone: 'mid' }],
    }
  );

  const holdPlan: Plan = { x: 138, y: -6, w: 42, d: 38, r: 2.5 };
  fundicionSolids.push(
    {
      id: 'cast-holding-furnace',
      paths: slabOf(holdPlan, 0, 28, P, 4, 0.8),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-refractory',
      innerLines: [{ d: sideSeam(holdPlan, 14, P, 4), tone: 'mid' }],
    },
    {
      id: 'cast-furnace-glow-door',
      paths: slabOf({ x: 148, y: 29, w: 20, d: 4.5, r: 0.8 }, 7, 11, P, 3),
      tone: 'hi',
      crease: 'none',
      className: 'iso-cryolite',
    },
    {
      id: 'cast-furnace-chimney',
      paths: cylinder(159, 10, 4.6, 28, 16, P, 22, 0.35),
      tone: 'hi',
      crease: 'faint',
      className: 'iso-steel-mid',
    }
  );

  const castDeck: Plan = { x: 96, y: 42, w: 86, d: 52, r: 2.5 };
  fundicionSolids.push({
    id: 'cast-product-deck',
    paths: slabOf(castDeck, 0, 4.5, P, 4, 0.6),
    tone: 'mid',
    crease: 'faint',
    className: 'iso-concrete',
  });

  [
    { id: 't1', x: 102, y: 48, z: 4.5 },
    { id: 't2', x: 102, y: 63, z: 4.5 },
    { id: 't3', x: 105, y: 55.5, z: 12 },
  ].forEach((ing) => {
    fundicionSolids.push({
      id: `cast-ingot-${ing.id}`,
      paths: slabOf({ x: ing.x, y: ing.y, w: 36, d: 11, r: 1.5 }, ing.z, 7.5, P, 4, 0.7),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-molten-al',
    });
  });

  const billets = sortByDepth(
    [
      { id: 'b1', y: 49, z: 8.2 },
      { id: 'b2', y: 58.5, z: 8.2 },
      { id: 'b3', y: 53.8, z: 15.6 },
    ],
    (b) => [160, b.y, b.z],
    P
  );
  billets.forEach((b) => {
    const bf = frameAlong([144, b.y, b.z], [1, 0, 0]);
    fundicionSolids.push({
      id: `cast-billet-${b.id}`,
      paths: solidOf(
        [
          [0, 3.8],
          [32, 3.8],
        ],
        bf,
        P,
        { bevel: 0.35 }
      ),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-molten-al',
    });
  });

  // Bobina hueca de alambrón con centro oscuro profundo (para que se lea al instante como rollo!)
  const coilF = frameAlong([158, 78, 4.5], [0, 0, 1]);
  fundicionSolids.push(
    {
      id: 'cast-wire-rod-coil',
      paths: ringBand(0, 11, 5.2, 11.5, coilF, P),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-molten-al',
      innerLines: [
        { d: arcOf(coilF, 3.6, 11.5, P), tone: 'mid' },
        { d: arcOf(coilF, 7.2, 11.5, P), tone: 'mid' },
      ],
    },
    {
      id: 'cast-wire-rod-bore',
      paths: cylinder(158, 78, 5.2, 14.8, 0.8, P, 24),
      tone: 'hi',
      crease: 'none',
      className: 'iso-carbon',
    }
  );

  fundicionDots.push({
    id: 'cast-deck-bolts',
    points: corners(castDeck, 4.5).map(([px, py]) => iso([px, py, 4.5], P)),
    size: 0.55,
    tone: 'hi',
  });

  // ---------------------------------------------------------------------------
  // 7. DIAL TÉRMICO CALIBRADO (0-1.250 °C)
  // ---------------------------------------------------------------------------
  const dialSolids: DrawnSolid[] = [];
  const dialLines: DrawnLine[] = [];
  const dialDots: DrawnDots[] = [];

  const dialCx = -76;
  const dialCy = 88;
  const dialR = 15.5;
  const dialTop = 8.5;

  dialSolids.push({
    id: 'dial-puck',
    paths: cylinder(dialCx, dialCy, dialR, 0, dialTop, P, 48, 0.7),
    tone: 'hi',
    crease: 'lo',
    className: 'iso-steel-bright',
    innerLines: [
      { d: knurl(dialCx, dialCy, dialR, dialTop - 3, dialTop, 56, P, 0.3), tone: 'mid' },
      { d: sideArc(dialCx, dialCy, dialR, dialTop - 3, P, 28), tone: 'faint' },
    ],
  });
  dialLines.push({
    id: 'dial-bezel',
    d: ring(dialCx, dialCy, dialR - 2.2, dialTop, P, 44),
    tone: 'mid',
  });
  const dticks = radialTicks(
    dialCx,
    dialCy,
    dialR - 3,
    25,
    5,
    dialTop,
    [1.2, 2.6],
    P,
    -130 * (Math.PI / 180),
    260 * (Math.PI / 180)
  );
  dialLines.push(
    { id: 'dial-ticks-minor', d: dticks.minor, tone: 'lo' },
    { id: 'dial-ticks-major', d: dticks.major, tone: 'hi' },
    { id: 'dial-hub', d: ring(dialCx, dialCy, 1.8, dialTop + 0.1, P, 16), tone: 'hi' }
  );
  dialDots.push({
    id: 'dial-hub-dot',
    points: [iso([dialCx, dialCy, dialTop + 0.4], P)],
    size: 0.85,
    tone: 'hi',
  });

  // ---------------------------------------------------------------------------
  // 8. CORRIENTES DE PROCESO + PINS SEPARADOS + VISTAS DE CÁMARA POR ETAPA
  // ---------------------------------------------------------------------------
  const flowPaths = {
    aluminaFeed: makeFlow(
      [
        [-196, 54.8, 22],
        [-196, 54.8, 38],
        [-139, 54, 34],
        [-88, 44, 75],
        [-88, 2, 75],
        [-24, 2, 90],
      ],
      P
    ),
    dcBusbar: segment([-42, 11, 70.5], [66, 11, 70.5], P),
    gasToGtc: makeFlow(
      [
        [24, -18, 86],
        [24, -76, 86],
        [82, -76, 56],
      ],
      P
    ),
    gtcRecycle: makeFlow(
      [
        [82, -64, 16],
        [42, -52, 16],
        [42, -16, 84],
        [16, -4, 88],
      ],
      P
    ),
    metalTap: makeFlow(
      [
        [66, 12, 30],
        [94, 12, 30],
        [94, 12, 42],
        [112, 12, 42],
        [112, 12, 33],
      ],
      P
    ),
  };

  const explodeVectors = {
    metal: axisVector(P, [0, 0, 8]),
    bath: axisVector(P, [0, 0, 17]),
    anodos: axisVector(P, [0, 0, 29]),
    hood: axisVector(P, [0, 0, 44]),
  };

  const pinPt = (pt: Point3): { x: number; y: number } => {
    const [x, y] = iso(pt, P);
    return { x, y };
  };
  const pins: StagePin[] = [
    { id: 'silo', code: '01', label: 'Muelle Storni y silos', ...pinPt([-152, 54, 54]) },
    { id: 'anodos', code: '02', label: 'Horno de ánodos', ...pinPt([-173, -70, 62]) },
    { id: 'cuba', code: '03', label: 'Cuba Hall-Héroult', ...pinPt([9, 0, 116]) },
    { id: 'gtc', code: '04', label: 'GTC y reciclo HF', ...pinPt([104, -76, 70]) },
    { id: 'fundicion', code: '05', label: 'Fundición y colada', ...pinPt([156, 14, 56]) },
  ];

  const cameraViews: Record<'all' | AluarAssemblyId, StageCameraBox> = {
    all: { x: 0, y: 0, w: VIEW_WIDTH, h: VIEW_HEIGHT },
    silo: cameraForPoints(
      [
        [-218, 0, -10],
        [-218, 108, 28],
        [-68, -6, 80],
        [-68, 66, 80],
      ],
      P,
      34,
      28
    ),
    anodos: cameraForPoints(
      [
        [-222, -100, 0],
        [-124, -14, 56],
      ],
      P,
      44,
      36
    ),
    cuba: cameraForPoints(
      [
        [-52, -26, 0],
        [76, 56, 138],
      ],
      P,
      34,
      26
    ),
    gtc: cameraForPoints(
      [
        [36, -104, 0],
        [164, -22, 106],
      ],
      P,
      40,
      28
    ),
    fundicion: cameraForPoints(
      [
        [82, -12, 0],
        [188, 98, 48],
      ],
      P,
      40,
      30
    ),
  };

  return {
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    projection: P,
    baseHalo,
    terrainSolids,
    terrainLines,
    terrainDots,
    plateLabelTransform,
    pierSolids,
    pierTubes,
    pierLines,
    pierDots,
    anodosPlantSolids,
    anodosPlantLines,
    anodosPlantDots,
    gtcSolids,
    gtcTubes,
    gtcLines,
    gtcDots,
    cubaBackSolids,
    cubaBackLines,
    cubaCathodeSolids,
    cubaMetalSolids,
    cubaBathSolids,
    cubaBathDots,
    cubaAnodesSolids,
    cubaAnodesDots,
    cubaFrontSolids,
    cubaHoodSolids,
    cubaHoodLines,
    fundicionSolids,
    fundicionTubes,
    fundicionLines,
    fundicionDots,
    dialSolids,
    dialLines,
    dialDots,
    flowPaths,
    explodeVectors,
    pins,
    cameraViews,
    dialCenter: [dialCx, dialCy, dialTop],
    dialRadius: dialR,
  };
}
