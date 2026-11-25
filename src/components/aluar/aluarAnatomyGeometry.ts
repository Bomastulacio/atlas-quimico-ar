import {
  axisVector,
  boxCorners,
  corners,
  cylinder,
  depthOf,
  dotGrid,
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

export type AluarAssemblyId = 'silo' | 'anodos' | 'cuba' | 'gtc' | 'fundicion';

export interface DrawnSolid {
  id: string;
  paths: SolidPaths;
  tone?: Tone;
  crease?: Tone | 'none';
  lit?: boolean;
  flat?: boolean;
  className?: string;
  innerLines?: Array<{ d: string; tone?: Tone; free?: boolean }>;
  innerDots?: Array<{ points: Flat[]; size?: number; tone?: Tone }>;
}

export interface DrawnLine {
  id: string;
  d: string;
  tone?: Tone | 'lit' | 'red' | 'green' | 'blue';
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

export interface AluarAnatomyScene {
  width: number;
  height: number;
  projection: Projection;
  baseHalo: string;
  baseSolids: DrawnSolid[];
  baseLines: DrawnLine[];
  baseDots: DrawnDots[];
  plateLabelTransform: string;
  // Ensambles en orden estricto back-to-front
  siloSolids: DrawnSolid[];
  siloLines: DrawnLine[];
  siloDots: DrawnDots[];
  gtcSolids: DrawnSolid[];
  gtcLines: DrawnLine[];
  gtcDots: DrawnDots[];
  // Cuba dividida para orden correcto con despiece vertical
  cubaBackSolids: DrawnSolid[];
  cubaBackLines: DrawnLine[];
  cubaCathodeSolids: DrawnSolid[];
  cubaMetalSolids: DrawnSolid[];
  cubaBathSolids: DrawnSolid[];
  cubaBathDots: DrawnDots[];
  anodosSolids: DrawnSolid[];
  anodosLines: DrawnLine[];
  anodosDots: DrawnDots[];
  cubaFrontSolids: DrawnSolid[];
  cubaFrontLines: DrawnLine[];
  cubaHoodSolids: DrawnSolid[];
  cubaHoodLines: DrawnLine[];
  fundicionSolids: DrawnSolid[];
  fundicionLines: DrawnLine[];
  fundicionDots: DrawnDots[];
  dialSolids: DrawnSolid[];
  dialLines: DrawnLine[];
  dialDots: DrawnDots[];
  // Corrientes animadas de proceso
  flowPaths: {
    aluminaFeed: string;
    dcBusbar: string;
    gasToGtc: string;
    gtcRecycle: string;
    metalTap: string;
  };
  // Vectores de desplazamiento isométrico para el modo Despiece vertical
  explodeVectors: {
    metal: Flat;
    bath: Flat;
    anodos: Flat;
    hood: Flat;
  };
  // Datos geométricos del dial para recalcular la aguja en tiempo real
  dialCenter: [number, number, number];
  dialRadius: number;
}

const VIEW_WIDTH = 760;
const VIEW_HEIGHT = 496;
const AZIMUTH = 50;
const ELEVATION = 33;

const BASE_PLAN: Plan = { x: -160, y: -102, w: 316, d: 178, r: 7 };

function sortByDepth<T>(items: T[], pointOf: (item: T) => Point3, P: Projection): T[] {
  return [...items].sort((a, b) => depthOf(pointOf(a), P) - depthOf(pointOf(b), P));
}

function makeWirePath(points: Point3[], P: Projection): string {
  return pathOf(points.map((pt) => iso(pt, P)));
}

export function buildDialNeedlePath(
  tempC: number,
  scene: Pick<AluarAnatomyScene, 'dialCenter' | 'dialRadius' | 'projection'>
): string {
  const [cx, cy, cz] = scene.dialCenter;
  const clamped = Math.max(0, Math.min(1250, tempC));
  // Barrido calibrado de -130° a +130° (0 °C a 1250 °C)
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

export function buildAluarAnatomyScene(): AluarAnatomyScene {
  // Puntos envolventes reales del conjunto (con margen vertical para Despiece sobre la cuba central)
  const bounds: Point3[] = [
    ...boxCorners(BASE_PLAN, -18, 12),
    [-118, -38, 92],
    [77, -68, 92],
    [-40, -12, 146],
    [32, 12, 146],
    [136, 62, 42],
  ];

  const P = fitProjection(bounds, VIEW_WIDTH, VIEW_HEIGHT, {
    pad: 18,
    headroom: 54,
    azimuth: AZIMUTH,
    elevation: ELEVATION,
  });

  // ---------------------------------------------------------------------------
  // 1. BASE MAQUINADA, PATAS, REGLA CALIBRADA Y PLACA GRABADA
  // ---------------------------------------------------------------------------
  const baseHalo = haloOf(BASE_PLAN, -18, 12, P);
  const baseSolids: DrawnSolid[] = [];
  const baseLines: DrawnLine[] = [];
  const baseDots: DrawnDots[] = [];

  const feetPositions = sortByDepth(corners(BASE_PLAN, 22), ([fx, fy]) => [fx, fy, -15], P);
  feetPositions.forEach(([fx, fy], idx) => {
    baseSolids.push({
      id: `base-foot-flange-${idx}`,
      paths: cylinder(fx, fy, 7.2, -18, 2, P, 24),
      tone: 'lo',
      crease: 'faint',
    });
    baseSolids.push({
      id: `base-foot-pad-${idx}`,
      paths: cylinder(fx, fy, 5.4, -16, 4, P, 24),
      tone: 'mid',
      crease: 'faint',
    });
  });

  baseSolids.push({
    id: 'base-plate',
    paths: slabOf(BASE_PLAN, -12, 12, P, 8, 1.5),
    tone: 'mid',
    crease: 'faint',
    innerLines: [
      { d: sideSeam(BASE_PLAN, -6, P, 8), tone: 'faint' },
    ],
  });

  // Ranura perimetral fresada y tornillos en las 4 esquinas
  baseLines.push({
    id: 'base-groove',
    d: planOutline(insetPlan(BASE_PLAN, 5.5), 0, P, 8),
    tone: 'faint',
  });

  const screwPts = corners(BASE_PLAN, 11);
  screwPts.forEach(([sx, sy], idx) => {
    baseLines.push({
      id: `base-screw-ring-${idx}`,
      d: ring(sx, sy, 2.3, 0, P, 16),
      tone: 'lo',
    });
  });
  baseDots.push({
    id: 'base-screw-dots',
    points: screwPts.map(([sx, sy]) => iso([sx, sy, 0], P)),
    size: 0.65,
    tone: 'mid',
  });

  // Regla graduada frontal sobre la base (escala de proceso)
  const rulerPlan: Plan = { x: -72, y: 63, w: 154, d: 7, r: 1 };
  baseSolids.push({
    id: 'base-ruler',
    paths: slabOf(rulerPlan, 0, 0.7, P, 3),
    tone: 'lo',
    crease: 'none',
  });
  const rulerTicks = topTicks(rulerPlan.x + 4, rulerPlan.x + rulerPlan.w - 4, 4, 5, rulerPlan.y + 0.8, 0.7, [1.8, 3.4], P, 'x');
  baseLines.push(
    { id: 'base-ruler-minor', d: rulerTicks.minor, tone: 'lo' },
    { id: 'base-ruler-major', d: rulerTicks.major, tone: 'mid' }
  );

  // Placa grabada de identificación industrial (ALUAR · CHUBUT)
  const labelPlan: Plan = { x: -146, y: 61, w: 60, d: 10, r: 1.4 };
  baseSolids.push({
    id: 'base-label-plate',
    paths: slabOf(labelPlan, 0, 0.9, P, 4),
    tone: 'mid',
    crease: 'faint',
  });
  baseLines.push({
    id: 'base-label-border',
    d: planOutline(insetPlan(labelPlan, 1.4), 0.9, P, 4),
    tone: 'faint',
  });
  baseDots.push({
    id: 'base-label-rivets',
    points: [
      iso([labelPlan.x + 3.2, labelPlan.y + 5, 0.9], P),
      iso([labelPlan.x + labelPlan.w - 3.2, labelPlan.y + 5, 0.9], P),
    ],
    size: 0.5,
    tone: 'mid',
  });
  const plateLabelTransform = topMatrix([labelPlan.x + 8, labelPlan.y + 6.8], 0.95, P, 'x');

  // ---------------------------------------------------------------------------
  // 2. ENSAMBLE 01 (ATRÁS-IZQUIERDA): SILO DE ALÚMINA Y CINTA MUELLE STORNI
  // ---------------------------------------------------------------------------
  const siloSolids: DrawnSolid[] = [];
  const siloLines: DrawnLine[] = [];
  const siloDots: DrawnDots[] = [];

  const siloCx = -118;
  const siloCy = -38;
  const siloPlinth: Plan = { x: siloCx - 26, y: siloCy - 26, w: 52, d: 52, r: 4 };

  siloSolids.push({
    id: 'silo-plinth',
    paths: slabOf(siloPlinth, 0, 8, P, 6, 0.8),
    tone: 'lo',
    crease: 'faint',
  });

  // 4 patas de apoyo del silo ordenadas por profundidad
  const siloLegs = sortByDepth(corners(insetPlan(siloPlinth, 6), 3), ([lx, ly]) => [lx, ly, 12], P);
  siloLegs.forEach(([lx, ly], idx) => {
    siloSolids.push({
      id: `silo-leg-${idx}`,
      paths: cylinder(lx, ly, 2.8, 8, 12, P, 16),
      tone: 'mid',
      crease: 'faint',
    });
  });

  // Tolva inferior y cuerpo cilíndrico del silo en 2 bandas con anillo rigidizador
  siloSolids.push({
    id: 'silo-hopper-lower',
    paths: cylinder(siloCx, siloCy, 15, 16, 8, P, 32),
    tone: 'mid',
    crease: 'faint',
  });
  siloSolids.push({
    id: 'silo-body-lower',
    paths: cylinder(siloCx, siloCy, 21, 24, 28, P, 36, 0.6),
    tone: 'hi',
    crease: 'lo',
    innerLines: [
      { d: sideArc(siloCx, siloCy, 21, 38, P, 24), tone: 'faint' },
    ],
  });
  siloSolids.push({
    id: 'silo-stiffener-ring',
    paths: cylinder(siloCx, siloCy, 22.4, 52, 3.2, P, 36, 0.4),
    tone: 'mid',
    crease: 'faint',
  });
  siloSolids.push({
    id: 'silo-body-upper',
    paths: cylinder(siloCx, siloCy, 21, 55.2, 26, P, 36, 0.6),
    tone: 'hi',
    crease: 'lo',
    innerLines: [
      { d: sideArc(siloCx, siloCy, 21, 68, P, 24), tone: 'faint' },
    ],
  });
  siloSolids.push({
    id: 'silo-roof-flange',
    paths: cylinder(siloCx, siloCy, 22.8, 81.2, 3.4, P, 36, 0.5),
    tone: 'mid',
    crease: 'lo',
  });
  siloSolids.push({
    id: 'silo-vent-cap',
    paths: cylinder(siloCx, siloCy, 8.5, 84.6, 5.5, P, 24, 0.4),
    tone: 'hi',
    crease: 'faint',
  });

  // Pernos en la brida superior del silo
  const siloBoltPts: Flat[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    siloBoltPts.push(iso([siloCx + 19.2 * Math.cos(a), siloCy + 19.2 * Math.sin(a), 84.6], P));
  }
  siloDots.push({ id: 'silo-roof-bolts', points: siloBoltPts, size: 0.55, tone: 'mid' });

  // Estación de descarga y columna soporte del ducto hacia la cuba
  siloSolids.push({
    id: 'silo-feeder-valve',
    paths: slabOf({ x: siloCx + 14, y: siloCy - 7, w: 15, d: 14, r: 2 }, 16, 12, P, 4, 0.5),
    tone: 'mid',
    crease: 'faint',
  });
  siloSolids.push({
    id: 'silo-duct-post-collar',
    paths: cylinder(-80, -24, 4.6, 0, 3.5, P, 20),
    tone: 'lo',
    crease: 'faint',
  });
  siloSolids.push({
    id: 'silo-duct-post',
    paths: cylinder(-80, -24, 2.6, 3.5, 68, P, 20),
    tone: 'mid',
    crease: 'none',
    innerLines: [
      { d: sideArc(-80, -24, 2.6, 26, P, 14), tone: 'faint' },
      { d: sideArc(-80, -24, 2.6, 48, P, 14), tone: 'faint' },
    ],
  });
  // Puente aéreo transportador de alúmina hacia la tolva central
  siloSolids.push({
    id: 'silo-conveyor-bridge',
    paths: slabOf({ x: -102, y: -29, w: 62, d: 10, r: 1.5 }, 71, 6.5, P, 4, 0.5),
    tone: 'mid',
    crease: 'faint',
    innerLines: [{ d: sideSeam({ x: -102, y: -29, w: 62, d: 10, r: 1.5 }, 74.2, P, 4), tone: 'faint' }],
  });

  // ---------------------------------------------------------------------------
  // 3. ENSAMBLE 04 (ATRÁS-DERECHA): CENTRO DE TRATAMIENTO DE GASES (GTC)
  // ---------------------------------------------------------------------------
  const gtcSolids: DrawnSolid[] = [];
  const gtcLines: DrawnLine[] = [];
  const gtcDots: DrawnDots[] = [];

  const gtcCx = 56;
  const gtcCy = -68;
  const gtcPlinth: Plan = { x: gtcCx - 28, y: gtcCy - 22, w: 62, d: 44, r: 3.5 };

  gtcSolids.push({
    id: 'gtc-plinth',
    paths: slabOf(gtcPlinth, 0, 7, P, 6, 0.7),
    tone: 'lo',
    crease: 'faint',
  });
  // Reactor seco cilíndrico GTC (captura de HF sobre alúmina fresca)
  gtcSolids.push({
    id: 'gtc-reactor-lower',
    paths: cylinder(gtcCx - 8, gtcCy, 15.5, 7, 26, P, 32, 0.5),
    tone: 'hi',
    crease: 'lo',
    innerLines: [{ d: sideArc(gtcCx - 8, gtcCy, 15.5, 20, P, 20), tone: 'faint' }],
  });
  gtcSolids.push({
    id: 'gtc-reactor-collar',
    paths: cylinder(gtcCx - 8, gtcCy, 17, 33, 3, P, 32, 0.4),
    tone: 'mid',
    crease: 'faint',
  });
  gtcSolids.push({
    id: 'gtc-reactor-upper',
    paths: cylinder(gtcCx - 8, gtcCy, 15.5, 36, 22, P, 32, 0.5),
    tone: 'hi',
    crease: 'lo',
  });
  // Casa de filtros de mangas (baghouse) contigua
  const bagPlan: Plan = { x: gtcCx + 10, y: gtcCy - 14, w: 22, d: 28, r: 2.5 };
  gtcSolids.push({
    id: 'gtc-baghouse',
    paths: slabOf(bagPlan, 7, 50, P, 5, 0.8),
    tone: 'mid',
    crease: 'faint',
    innerLines: [
      { d: sideSeam(bagPlan, 24, P, 5), tone: 'faint' },
      { d: sideSeam(bagPlan, 41, P, 5), tone: 'faint' },
    ],
  });
  // Chimenea de descarga limpia (CO2 tratado)
  gtcSolids.push({
    id: 'gtc-stack-base',
    paths: cylinder(gtcCx + 21, gtcCy, 6.2, 57, 4, P, 24, 0.4),
    tone: 'mid',
    crease: 'faint',
  });
  gtcSolids.push({
    id: 'gtc-stack',
    paths: cylinder(gtcCx + 21, gtcCy, 4.6, 61, 28, P, 24, 0.4),
    tone: 'hi',
    crease: 'lo',
    innerLines: [{ d: sideArc(gtcCx + 21, gtcCy, 4.6, 76, P, 18), tone: 'faint' }],
  });
  gtcLines.push({
    id: 'gtc-stack-rim',
    d: ring(gtcCx + 21, gtcCy, 3.2, 89, P, 20),
    tone: 'lo',
  });

  // Válvula rotativa de reciclo de alúmina fluorada con perilla moleteada
  gtcSolids.push({
    id: 'gtc-valve-body',
    paths: slabOf({ x: gtcCx - 26, y: gtcCy + 10, w: 12, d: 12, r: 2 }, 14, 10, P, 4, 0.4),
    tone: 'mid',
    crease: 'faint',
  });
  gtcSolids.push({
    id: 'gtc-valve-knob',
    paths: cylinder(gtcCx - 20, gtcCy + 16, 4.2, 24, 3.6, P, 24),
    tone: 'hi',
    crease: 'faint',
    innerLines: [{ d: knurl(gtcCx - 20, gtcCy + 16, 4.2, 24, 27.6, 20, P, 0.3), tone: 'lo' }],
  });
  gtcDots.push({
    id: 'gtc-baghouse-vents',
    points: dotGrid(bagPlan.x + 4, bagPlan.y + 5, 3, 4, 5, 57, P),
    size: 0.48,
    tone: 'lo',
  });

  // ---------------------------------------------------------------------------
  // 4. ENSAMBLE 03 (CENTRO HERO): CUBA ELECTROLÍTICA HALL-HÉROULT EN CORTE
  // ---------------------------------------------------------------------------
  const cubaBackSolids: DrawnSolid[] = [];
  const cubaBackLines: DrawnLine[] = [];
  const cubaCathodeSolids: DrawnSolid[] = [];
  const cubaMetalSolids: DrawnSolid[] = [];
  const cubaBathSolids: DrawnSolid[] = [];
  const cubaBathDots: DrawnDots[] = [];
  const anodosSolids: DrawnSolid[] = [];
  const anodosLines: DrawnLine[] = [];
  const anodosDots: DrawnDots[] = [];
  const cubaFrontSolids: DrawnSolid[] = [];
  const cubaFrontLines: DrawnLine[] = [];
  const cubaHoodSolids: DrawnSolid[] = [];
  const cubaHoodLines: DrawnLine[] = [];

  const CELL_OUTER: Plan = { x: -64, y: -22, w: 118, d: 66, r: 3 };
  const CELL_INNER: Plan = { x: -56, y: -14, w: 102, d: 50, r: 1.5 };

  // 4 pilotes estructurales de apoyo de la cuba
  const piers = sortByDepth(
    [
      { x: -58, y: -18, w: 16, d: 14, r: 1.5 },
      { x: 30, y: -18, w: 16, d: 14, r: 1.5 },
      { x: -58, y: 26, w: 16, d: 14, r: 1.5 },
      { x: 30, y: 26, w: 16, d: 14, r: 1.5 },
    ],
    (pl) => [pl.x + pl.w / 2, pl.y + pl.d / 2, 5],
    P
  );
  piers.forEach((pier, idx) => {
    cubaBackSolids.push({
      id: `cell-pier-${idx}`,
      paths: slabOf(pier, 0, 10, P, 4, 0.5),
      tone: 'lo',
      crease: 'faint',
    });
  });

  // Piso metálico de la carcasa de acero (potshell)
  cubaBackSolids.push({
    id: 'cell-shell-floor',
    paths: slabOf(CELL_OUTER, 10, 6, P, 5, 0.7),
    tone: 'mid',
    crease: 'faint',
  });

  // Paredes traseras de la cuba (izquierda trasera y derecha trasera intactas para el corte)
  const backWallX: Plan = { x: CELL_OUTER.x, y: CELL_OUTER.y, w: 8, d: CELL_OUTER.d, r: 1.5 };
  const backWallY: Plan = { x: CELL_OUTER.x, y: CELL_OUTER.y, w: CELL_OUTER.w, d: 8, r: 1.5 };

  cubaBackSolids.push(
    {
      id: 'cell-wall-back-x',
      paths: slabOf(backWallX, 16, 26, P, 4, 0.6),
      tone: 'hi',
      crease: 'lo',
      innerLines: [{ d: sideSeam(backWallX, 29, P, 4), tone: 'faint' }],
    },
    {
      id: 'cell-wall-back-y',
      paths: slabOf(backWallY, 16, 26, P, 4, 0.6),
      tone: 'hi',
      crease: 'lo',
      innerLines: [{ d: sideSeam(backWallY, 29, P, 4), tone: 'faint' }],
    }
  );

  // Columnas traseras del pórtico anódico (dibujadas ANTES de las capas internas y ánodos)
  cubaBackSolids.push(
    {
      id: 'gantry-post-back-left',
      paths: slabOf({ x: -64, y: -22, w: 8, d: 8, r: 1.2 }, 42, 42, P, 3, 0.4),
      tone: 'mid',
      crease: 'faint',
    },
    {
      id: 'gantry-post-back-right',
      paths: slabOf({ x: 46, y: -22, w: 8, d: 8, r: 1.2 }, 42, 42, P, 3, 0.4),
      tone: 'mid',
      crease: 'faint',
    }
  );

  // --- CAPA 1 INTERNA: LADRILLO REFRACTARIO Y CÁTODO DE CARBONO ---
  cubaCathodeSolids.push({
    id: 'cell-refractory-lining',
    paths: slabOf(CELL_INNER, 16, 4.5, P, 3, 0.3),
    tone: 'lo',
    crease: 'faint',
    className: 'iso-cavity-refractory',
  });
  cubaCathodeSolids.push({
    id: 'cell-carbon-cathode',
    paths: slabOf(insetPlan(CELL_INNER, 1.5), 20.5, 5.5, P, 3, 0.4),
    tone: 'hi',
    crease: 'lo',
    className: 'iso-cavity-carbon',
    innerLines: [
      { d: lineOnTop([-28, -12.5], [-28, 34.5], 26, P), tone: 'faint' },
      { d: lineOnTop([-4, -12.5], [-4, 34.5], 26, P), tone: 'faint' },
      { d: lineOnTop([20, -12.5], [20, 34.5], 26, P), tone: 'faint' },
    ],
  });

  // --- CAPA 2 INTERNA: COLCHÓN DE ALUMINIO LÍQUIDO (Al, 950-970 °C) ---
  cubaMetalSolids.push({
    id: 'cell-molten-aluminum',
    paths: slabOf(insetPlan(CELL_INNER, 2), 26, 6, P, 3, 0.35),
    tone: 'hi',
    crease: 'mid',
    className: 'iso-layer-al',
  });

  // --- CAPA 3 INTERNA: BAÑO ELECTROLÍTICO DE CRIOLITA (Na3AlF6 + Al2O3) ---
  cubaBathSolids.push({
    id: 'cell-cryolite-bath',
    paths: slabOf(insetPlan(CELL_INNER, 2), 32, 8.5, P, 3, 0.35),
    tone: 'hi',
    crease: 'lo',
    className: 'iso-layer-bath',
  });
  cubaBathDots.push({
    id: 'cell-bath-bubbles',
    points: [
      iso([-42, 4, 40.7], P),
      iso([-18, 22, 40.7], P),
      iso([6, -2, 40.7], P),
      iso([26, 20, 40.7], P),
      iso([-6, 12, 40.7], P),
    ],
    size: 0.75,
    tone: 'mid',
    pulse: true,
  });

  // --- ENSAMBLE 02: 4 ÁNODOS PRECOCIDOS DE CARBONO + BARRA ÓMNIBUS CC ---
  const anodeSpecs = sortByDepth(
    [
      { id: 'a1', x: -46, y: -7 },
      { id: 'a2', x: -20, y: -7 },
      { id: 'a3', x: 6, y: -7 },
      { id: 'a4', x: 30, y: -7 },
    ],
    (a) => [a.x + 8, a.y + 18, 44],
    P
  );

  anodeSpecs.forEach((an) => {
    const blockPlan: Plan = { x: an.x, y: an.y, w: 18, d: 34, r: 1.8 };
    // Bloque de carbono precocido sumergido parcialmente en el baño
    anodosSolids.push({
      id: `anode-block-${an.id}`,
      paths: slabOf(blockPlan, 36.5, 14, P, 4, 0.6),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-anode-carbon',
      innerLines: [{ d: sideSeam(blockPlan, 43.5, P, 4), tone: 'faint' }],
    });
    // Yugo de hierro colado (stub yoke)
    anodosSolids.push({
      id: `anode-yoke-${an.id}`,
      paths: slabOf({ x: an.x + 4, y: an.y + 10, w: 10, d: 14, r: 1.2 }, 50.5, 4.2, P, 3, 0.3),
      tone: 'mid',
      crease: 'faint',
    });
    // Vástago vertical conductor de aluminio/cobre
    anodosSolids.push({
      id: `anode-rod-${an.id}`,
      paths: slabOf({ x: an.x + 7, y: an.y + 15, w: 4, d: 4, r: 0.6 }, 54.7, 21, P, 2),
      tone: 'hi',
      crease: 'none',
    });
    // Grampa de fijación sobre la viga anódica CC
    anodosSolids.push({
      id: `anode-clamp-${an.id}`,
      paths: slabOf({ x: an.x + 5.2, y: an.y + 12.5, w: 7.6, d: 9, r: 1 }, 69, 6.5, P, 3, 0.35),
      tone: 'hi',
      crease: 'faint',
    });
    anodosDots.push({
      id: `anode-clamp-bolt-${an.id}`,
      points: [iso([an.x + 9, an.y + 17, 75.5], P)],
      size: 0.6,
      tone: 'hi',
    });
  });

  // Viga colectora de corriente continua (DC Anode Busbar: 14,20 MWh/t Al)
  const busbarPlan: Plan = { x: -64, y: 7, w: 118, d: 8, r: 1.5 };
  anodosSolids.push({
    id: 'anode-dc-busbar',
    paths: slabOf(busbarPlan, 67, 7.5, P, 4, 0.6),
    tone: 'hi',
    crease: 'lo',
    className: 'iso-dc-busbar',
    innerLines: [{ d: sideSeam(busbarPlan, 70.8, P, 4), tone: 'faint' }],
  });
  // Gatos elevadores de la viga anódica en ambos extremos (con perilla moleteada)
  [-58, 48].forEach((jx, idx) => {
    anodosSolids.push({
      id: `anode-jack-${idx}`,
      paths: cylinder(jx, 11, 3.6, 74.5, 7, P, 20),
      tone: 'mid',
      crease: 'faint',
      innerLines: [{ d: knurl(jx, 11, 3.6, 74.5, 81.5, 16, P, 0.3), tone: 'lo' }],
    });
  });

  // --- BORDE FRONTAL CORTADO DE LA CUBA Y BARRAS COLECTORAS DE CÁTODO ---
  cubaFrontSolids.push(
    {
      id: 'cell-cutaway-lip-y',
      paths: slabOf({ x: CELL_OUTER.x, y: CELL_OUTER.y + CELL_OUTER.d - 6, w: CELL_OUTER.w, d: 6, r: 1.2 }, 16, 5.2, P, 3, 0.4),
      tone: 'hi',
      crease: 'lo',
    },
    {
      id: 'cell-cutaway-lip-x',
      paths: slabOf({ x: CELL_OUTER.x + CELL_OUTER.w - 6, y: CELL_OUTER.y, w: 6, d: CELL_OUTER.d, r: 1.2 }, 16, 5.2, P, 3, 0.4),
      tone: 'hi',
      crease: 'lo',
    }
  );

  // 4 barras colectoras de cátodo saliendo por el frente-izquierdo (típicas de cubas Prebake)
  const cathodeBars = sortByDepth([-44, -18, 8, 32], (bx) => [bx, 48, 17], P);
  cathodeBars.forEach((bx, idx) => {
    cubaFrontSolids.push({
      id: `cell-cathode-bar-${idx}`,
      paths: slabOf({ x: bx, y: 42, w: 8, d: 11, r: 1 }, 15.5, 4.2, P, 3, 0.35),
      tone: 'mid',
      crease: 'faint',
    });
  });

  // Columnas frontales del pórtico (dibujadas DESPUÉS de la cuba y ánodos)
  cubaFrontSolids.push(
    {
      id: 'gantry-post-front-left',
      paths: slabOf({ x: -64, y: 36, w: 8, d: 8, r: 1.2 }, 21.2, 62.8, P, 3, 0.4),
      tone: 'mid',
      crease: 'faint',
    },
    {
      id: 'gantry-post-front-right',
      paths: slabOf({ x: 46, y: 36, w: 8, d: 8, r: 1.2 }, 21.2, 62.8, P, 3, 0.4),
      tone: 'mid',
      crease: 'faint',
    }
  );

  // --- SUPERESTRUCTURA: TOLVA DOSIFICADORA DE ALÚMINA Y CAMPANA EXTRACTORA ---
  const hoodFrame: Plan = { x: -64, y: -22, w: 118, d: 66, r: 2.5 };
  cubaHoodSolids.push({
    id: 'cell-hood-beam-back',
    paths: slabOf({ x: -64, y: -22, w: 118, d: 18, r: 2 }, 84, 8, P, 4, 0.6),
    tone: 'mid',
    crease: 'faint',
  });
  // Tolva central de alúmina fresca (alimentador puntual sobre el baño)
  const hopperPlan: Plan = { x: -40, y: -12, w: 72, d: 24, r: 2.5 };
  cubaHoodSolids.push({
    id: 'cell-alumina-hopper',
    paths: slabOf(hopperPlan, 85, 13, P, 5, 0.8),
    tone: 'hi',
    crease: 'lo',
    innerLines: [{ d: sideSeam(hopperPlan, 91.5, P, 5), tone: 'faint' }],
  });
  // Pistón dosificador puntual (point-feeder crust breaker)
  cubaHoodSolids.push({
    id: 'cell-point-feeder-cap',
    paths: cylinder(-4, 0, 5.2, 98, 6.5, P, 24, 0.4),
    tone: 'hi',
    crease: 'faint',
  });
  cubaHoodSolids.push({
    id: 'cell-hood-rail-front',
    paths: slabOf({ x: -64, y: 36, w: 118, d: 8, r: 1.5 }, 84, 5.5, P, 4, 0.45),
    tone: 'mid',
    crease: 'faint',
  });
  cubaHoodLines.push({
    id: 'cell-hood-cutline',
    d: planOutline(insetPlan(hoodFrame, 3.5), 89.5, P, 5),
    tone: 'faint',
  });

  // ---------------------------------------------------------------------------
  // 5. ENSAMBLE 05 (FRENTE-DERECHA): CRISOL DE SIFONADO Y LINGOTES DE COLADA
  // ---------------------------------------------------------------------------
  const fundicionSolids: DrawnSolid[] = [];
  const fundicionLines: DrawnLine[] = [];
  const fundicionDots: DrawnDots[] = [];

  // Crisol de vacío (tapping crucible) sobre base con rieles
  const crucibleCx = 94;
  const crucibleCy = -2;
  fundicionSolids.push({
    id: 'cast-crucible-base',
    paths: slabOf({ x: crucibleCx - 20, y: crucibleCy - 20, w: 40, d: 40, r: 3.5 }, 0, 5, P, 5, 0.6),
    tone: 'lo',
    crease: 'faint',
  });
  fundicionSolids.push({
    id: 'cast-crucible-body',
    paths: cylinder(crucibleCx, crucibleCy, 15.5, 5, 25, P, 32, 0.6),
    tone: 'hi',
    crease: 'lo',
    innerLines: [
      { d: sideArc(crucibleCx, crucibleCy, 15.5, 16, P, 20), tone: 'faint' },
      { d: sideArc(crucibleCx, crucibleCy, 15.5, 24, P, 20), tone: 'faint' },
    ],
  });
  fundicionSolids.push({
    id: 'cast-crucible-lid',
    paths: cylinder(crucibleCx, crucibleCy, 16.5, 30, 3.4, P, 32, 0.45),
    tone: 'mid',
    crease: 'faint',
  });
  fundicionSolids.push({
    id: 'cast-crucible-siphon',
    paths: cylinder(crucibleCx - 6, crucibleCy, 3.2, 33.4, 9, P, 18),
    tone: 'hi',
    crease: 'none',
  });
  fundicionLines.push({
    id: 'cast-crucible-rim',
    d: ring(crucibleCx, crucibleCy, 12.2, 33.4, P, 24),
    tone: 'lo',
  });

  // Mesa de colada y pila de 3 lingotes T / barrotes solidificados (FY 2024-25: 425.409 t)
  const palletPlan: Plan = { x: 82, y: 28, w: 58, d: 34, r: 2.5 };
  fundicionSolids.push({
    id: 'cast-pallet',
    paths: slabOf(palletPlan, 0, 5.5, P, 4, 0.6),
    tone: 'lo',
    crease: 'faint',
  });

  const ingots = [
    { id: 'i1', x: 88, y: 32, z: 5.5 },
    { id: 'i2', x: 88, y: 46, z: 5.5 },
    { id: 'i3', x: 91, y: 39, z: 12.5 },
  ];
  ingots.forEach((ing) => {
    fundicionSolids.push({
      id: `cast-ingot-${ing.id}`,
      paths: slabOf({ x: ing.x, y: ing.y, w: 44, d: 11, r: 1.6 }, ing.z, 7, P, 4, 0.7),
      tone: 'hi',
      crease: 'lo',
      className: 'iso-ingot-al',
    });
  });

  fundicionDots.push({
    id: 'cast-pallet-bolts',
    points: corners(palletPlan, 4).map(([px, py]) => iso([px, py, 5.5], P)),
    size: 0.5,
    tone: 'mid',
  });

  // ---------------------------------------------------------------------------
  // 6. DIAL DE TELEMETRÍA ISOMÉTRICO (TEMPERATURA DE ETAPA 0-1250 °C)
  // ---------------------------------------------------------------------------
  const dialSolids: DrawnSolid[] = [];
  const dialLines: DrawnLine[] = [];
  const dialDots: DrawnDots[] = [];

  const dialCx = -114;
  const dialCy = 30;
  const dialR = 20;
  const dialZ = 0;
  const dialH = 9.5;
  const dialTop = dialZ + dialH;

  dialSolids.push({
    id: 'dial-puck',
    paths: cylinder(dialCx, dialCy, dialR, dialZ, dialH, P, 56, 0.8),
    tone: 'hi',
    crease: 'lo',
    innerLines: [
      { d: knurl(dialCx, dialCy, dialR, dialTop - 3.4, dialTop, 64, P, 0.35), tone: 'lo' },
      { d: sideArc(dialCx, dialCy, dialR, dialTop - 3.4, P, 32), tone: 'faint' },
    ],
  });
  dialLines.push({
    id: 'dial-bezel-ring',
    d: ring(dialCx, dialCy, dialR - 2.4, dialTop, P, 48),
    tone: 'lo',
  });
  const dialTicks = radialTicks(
    dialCx,
    dialCy,
    dialR - 3.2,
    25,
    5,
    dialTop,
    [1.4, 3.0],
    P,
    -130 * (Math.PI / 180),
    260 * (Math.PI / 180)
  );
  dialLines.push(
    { id: 'dial-ticks-minor', d: dialTicks.minor, tone: 'lo' },
    { id: 'dial-ticks-major', d: dialTicks.major, tone: 'hi' },
    { id: 'dial-hub', d: ring(dialCx, dialCy, 2.0, dialTop + 0.1, P, 16), tone: 'hi' }
  );
  dialDots.push({
    id: 'dial-hub-dot',
    points: [iso([dialCx, dialCy, dialTop + 0.4], P)],
    size: 0.9,
    tone: 'hi',
  });

  // ---------------------------------------------------------------------------
  // 7. CORRIENTES DE PROCESO (CONECTADAS DE BRIDA A BRIDA)
  // ---------------------------------------------------------------------------
  const flowPaths = {
    // Alúmina calcinada desde el silo hacia la tolva dosificadora de la cuba
    aluminaFeed: makeWirePath(
      [
        [siloCx + 21, siloCy + 14, 74.5],
        [-80, -24, 74.5],
        [-40, -24, 74.5],
        [-40, -4, 91],
      ],
      P
    ),
    // Corriente continua hacia la viga anódica
    dcBusbar: makeWirePath(
      [
        [-64, 11, 71],
        [54, 11, 71],
      ],
      P
    ),
    // Gases fluorados + CO2 desde la campana hacia el scrubber GTC
    gasToGtc: makeWirePath(
      [
        [18, -22, 88],
        [18, -68, 88],
        [gtcCx - 8, gtcCy, 58],
      ],
      P
    ),
    // Reciclo cerrado de alúmina enriquecida en HF desde GTC hacia la tolva
    gtcRecycle: makeWirePath(
      [
        [gtcCx - 20, gtcCy + 16, 19],
        [24, -52, 19],
        [24, -22, 88],
        [12, -12, 91],
      ],
      P
    ),
    // Sifonado de aluminio líquido desde la cuba hacia el crisol y colada
    metalTap: makeWirePath(
      [
        [46, 12, 29],
        [68, 12, 29],
        [68, -2, 38],
        [crucibleCx - 6, crucibleCy, 42.4],
      ],
      P
    ),
  };

  const explodeVectors = {
    metal: axisVector(P, [0, 0, 8]),
    bath: axisVector(P, [0, 0, 17]),
    anodos: axisVector(P, [0, 0, 28]),
    hood: axisVector(P, [0, 0, 44]),
  };

  return {
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    projection: P,
    baseHalo,
    baseSolids,
    baseLines,
    baseDots,
    plateLabelTransform,
    siloSolids,
    siloLines,
    siloDots,
    gtcSolids,
    gtcLines,
    gtcDots,
    cubaBackSolids,
    cubaBackLines,
    cubaCathodeSolids,
    cubaMetalSolids,
    cubaBathSolids,
    cubaBathDots,
    anodosSolids,
    anodosLines,
    anodosDots,
    cubaFrontSolids,
    cubaFrontLines,
    cubaHoodSolids,
    cubaHoodLines,
    fundicionSolids,
    fundicionLines,
    fundicionDots,
    dialSolids,
    dialLines,
    dialDots,
    flowPaths,
    explodeVectors,
    dialCenter: [dialCx, dialCy, dialTop],
    dialRadius: dialR,
  };
}
