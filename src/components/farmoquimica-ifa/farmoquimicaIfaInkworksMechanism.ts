import {
  ATLAS_PHASE_HUES,
  D2R,
  mod,
  type CalloutAnchorDef,
  type InkworksKit,
} from '@/lib/inkworks-kit';
import type { MechanismModel3D, OverviewCameraDef3D, ProcessPhaseDef3D } from '../ProcessAnatomy3DPlayer';

export const FARMA_CYCLE_DEG = 360;

export const FARMA_PHASES: ProcessPhaseDef3D[] = [
  {
    index: 0,
    code: '01',
    name: 'Síntesis orgánica fina en reactor batch vitrificado',
    short: 'Reactor GMP',
    pasoId: 'ifa-p1-sintesis-batch',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [-4.45, 1.2, 0.15],
    cameraDir: [2.7, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'En la planta química de Mataderos (Comuna 9, CABA), los intermedios orgánicos y solventes dosificados reaccionan en reactores batch vitrificados inertizados con N2 bajo normativa GMP.',
    inputLabel: 'Intermedios orgánicos (HS 2933.99) + reactivos + solventes',
    machineAction: 'Reactor batch multipropósito vitrificado (-20 a 140 °C)',
    outputLabel: 'Masa de reacción con Ingrediente Farmacéutico Activo crudo',
    tempDisplay: '20-120 °C · N2',
    tempC: 65,
  },
  {
    index: 1,
    code: '02',
    name: 'Clarificación y recuperación cerrada de solventes',
    short: 'Solventes',
    pasoId: 'ifa-p2-extraccion-solventes',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [-1.7, 1.35, 0.0],
    cameraDir: [2.6, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'La solución pasa por filtración pulidora con carbón activado mientras una columna al vacío recupera solventes orgánicos en circuito cerrado minimizando emisiones COV.',
    inputLabel: 'Masa de reacción cruda + aguas madres de proceso',
    machineAction: 'Filtro clarificante + columna destiladora de solventes al vacío',
    outputLabel: 'Solución purificada de IFA + solvente recuperado (reciclo)',
    tempDisplay: '45-85 °C · 0,5 bar',
    tempC: 65,
  },
  {
    index: 2,
    code: '03',
    name: 'Cristalización controlada de alta pureza',
    short: 'Cristalizador',
    pasoId: 'ifa-p3-cristalizacion',
    startDeg: 144,
    endDeg: 216,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [0.65, 1.15, 0.15],
    cameraDir: [2.5, 3.2, 7.2],
    cameraRadius: 2.9,
    summary:
      'El cristalizador con camisa de glicol ejecuta rampas de enfriamiento precisas con siembra controlada para obtener el polimorfo farmacéutico y pureza >= 99,5%.',
    inputLabel: 'Solución concentrada purificada + antisolvente USP',
    machineAction: 'Cristalizador agitado con rampa térmica controlada',
    outputLabel: 'Suspensión cristalina polimórfica de IFA',
    tempDisplay: '5-50 °C',
    tempC: 15,
  },
  {
    index: 3,
    code: '04',
    name: 'Aislamiento centrífugo / filtro-secador Nutsche',
    short: 'Aislamiento',
    pasoId: 'ifa-p4-centrifugacion-lavado',
    startDeg: 216,
    endDeg: 288,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [2.65, 1.05, 0.15],
    cameraDir: [2.6, 3.2, 7.2],
    cameraRadius: 2.9,
    summary:
      'En sala limpia inertizada con nitrógeno, la centrífuga o filtro Nutsche aísla la torta cristalina lavada y reenvía las aguas madres hacia recuperación de solventes.',
    inputLabel: 'Suspensión cristalina de IFA en solvente',
    machineAction: 'Centrífuga farmacéutica cerrada / filtro Nutsche inertizado',
    outputLabel: 'Torta húmeda de IFA purificado + aguas madres a reciclo',
    tempDisplay: '15-20 °C · N2',
    tempC: 18,
  },
  {
    index: 4,
    code: '05',
    name: 'Secado al vacío, micronización y liberación HPLC',
    short: 'Secado GMP',
    pasoId: 'ifa-p5-secado-micronizacion',
    startDeg: 288,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.red,
    cameraTarget: [4.65, 1.1, 0.1],
    cameraDir: [2.6, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'El secador al vacío a 50 mbar remueve solventes residuales bajo límites ICH Q3C; luego el micronizador ajusta el tamaño de partícula en sala ISO 8 antes del control HPLC/GC.',
    inputLabel: 'Torta húmeda de IFA + vacío 50 mbar + aire HEPA ISO 8',
    machineAction: 'Secador bicónico al vacío + micronizador + QC analítico',
    outputLabel: 'Ingrediente Farmacéutico Activo GMP (>=99,5%)',
    tempDisplay: '40-60 °C · 0,05 bar',
    tempC: 50,
  },
];

export const FARMA_OVERVIEW_CAMERA: OverviewCameraDef3D = {
  target: [0.05, 1.25, 0.05],
  dir: [3.2, 4.0, 9.5],
  radius: 6.8,
  worldBox: [
    [-5.9, 0.0, -2.1],
    [6.0, 3.5, 2.1],
  ],
};

export const FARMA_CALLOUT_META = [
  { n: 1, name: 'Tanques de dosificación N2', description: 'Almacenan solventes grado farma e intermedios bajo inertización.', phaseIndex: 0 },
  { n: 2, name: 'Reactor batch vitrificado', description: 'Ejecuta síntesis química multipaso con control térmico GMP.', phaseIndex: 0 },
  { n: 3, name: 'Filtro pulidor de carbón', description: 'Clarifica la solución removiendo trazas catalíticas y color.', phaseIndex: 1 },
  { n: 4, name: 'Columna recuperadora de solventes', description: 'Destila al vacío y recicla solventes en lazo cerrado.', phaseIndex: 1 },
  { n: 5, name: 'Cristalizador programado', description: 'Define polimorfismo y pureza química >=99,5%.', phaseIndex: 2 },
  { n: 6, name: 'Unidad de frío (glicol)', description: 'Controla la rampa de enfriamiento durante la precipitación.', phaseIndex: 2 },
  { n: 7, name: 'Centrífuga / filtro Nutsche', description: 'Separa torta cristalina en ambiente cerrado con N2.', phaseIndex: 3 },
  { n: 8, name: 'Retorno de aguas madres', description: 'Conduce solventes usados hacia la columna destiladora.', phaseIndex: 3 },
  { n: 9, name: 'Secador bicónico al vacío', description: 'Elimina solventes residuales a 50 mbar sin degradar el IFA.', phaseIndex: 4 },
  { n: 10, name: 'Sala ISO 8: micronización y QC', description: 'Envasa principios activos liberados tras análisis HPLC/GC.', phaseIndex: 4 },
] as const;

export function buildFarmoquimicaIfaMechanism(kit: InkworksKit): MechanismModel3D {
  const { THREE: T, scene, M, part, ghost, ghostRings, stream } = kit;
  const root = new T.Group();
  scene.add(root);
  const casingsGroup = new T.Group();
  const flowsGroup = new T.Group();
  root.add(casingsGroup, flowsGroup);

  const deck = part(new T.BoxGeometry(12.4, 0.16, 4.3), M.concrete);
  deck.position.set(0.05, -0.08, 0);
  root.add(deck);

  // Fase 1: Tanques dosificadores + reactor batch
  const doseTank = part(new T.CylinderGeometry(0.36, 0.36, 1.35, 16), M.alloy);
  doseTank.position.set(-5.1, 0.68, 0.2);
  root.add(doseTank);
  const reactor = part(new T.CylinderGeometry(0.54, 0.54, 1.65, 20), M.cobalt);
  reactor.position.set(-3.7, 0.85, 0.2);
  root.add(reactor);
  const reactorShaft = part(new T.CylinderGeometry(0.06, 0.06, 1.95, 10), M.dark);
  reactorShaft.position.set(-3.7, 1.05, 0.2);
  root.add(reactorShaft);

  // Fase 2: Filtro carbón + columna recuperadora de solventes atrás
  const carbonFilter = part(new T.CylinderGeometry(0.32, 0.32, 1.15, 16), M.steel);
  carbonFilter.position.set(-2.15, 0.62, 0.25);
  root.add(carbonFilter);
  const solvCol = part(new T.CylinderGeometry(0.34, 0.34, 2.85, 18), M.emerald);
  solvCol.position.set(-1.35, 1.45, -1.05);
  root.add(solvCol);

  // Fase 3: Cristalizador + chiller de glicol
  const cryst = part(new T.CylinderGeometry(0.52, 0.52, 1.55, 20), M.cobalt);
  cryst.position.set(0.45, 0.8, 0.2);
  root.add(cryst);
  const crystShaft = part(new T.CylinderGeometry(0.06, 0.06, 1.8, 10), M.dark);
  crystShaft.position.set(0.45, 0.98, 0.2);
  root.add(crystShaft);
  const chiller = part(new T.BoxGeometry(0.95, 0.72, 0.72), M.alloy);
  chiller.position.set(0.65, 0.38, -1.05);
  root.add(chiller);

  // Fase 4: Centrífuga / Nutsche
  const nutsche = part(new T.CylinderGeometry(0.48, 0.48, 1.08, 18), M.ochreBath);
  nutsche.position.set(2.45, 0.62, 0.2);
  root.add(nutsche);
  const nutscheCase = ghost(new T.BoxGeometry(1.45, 1.6, 1.45));
  nutscheCase.position.set(2.45, 0.8, 0.2);
  casingsGroup.add(nutscheCase);

  // Fase 5: Secador bicónico al vacío + sala limpia ISO 8
  const vacDryer = part(new T.CylinderGeometry(0.38, 0.38, 0.92, 16), M.ceramic);
  vacDryer.rotation.z = Math.PI / 4;
  vacDryer.position.set(4.15, 0.92, 0.15);
  root.add(vacDryer);
  const cleanRoom = part(new T.BoxGeometry(1.25, 1.35, 1.35), M.steel);
  cleanRoom.position.set(5.45, 0.68, 0.15);
  root.add(cleanRoom);
  const cleanGlass = ghost(new T.BoxGeometry(1.38, 1.48, 1.48));
  cleanGlass.position.set(5.45, 0.74, 0.15);
  casingsGroup.add(cleanGlass);

  // Flujos animados
  const sApi = stream(
    [
      new T.Vector3(-5.1, 1.05, 0.2),
      new T.Vector3(-3.7, 1.35, 0.2),
      new T.Vector3(-2.15, 1.05, 0.25),
      new T.Vector3(0.45, 1.25, 0.2),
      new T.Vector3(2.45, 1.02, 0.2),
      new T.Vector3(4.15, 1.15, 0.15),
      new T.Vector3(5.45, 0.95, 0.15),
    ],
    ATLAS_PHASE_HUES.cobalt,
    { count: 26, size: 7.4, parent: flowsGroup }
  );
  const sSolvLoop = stream(
    [
      new T.Vector3(2.45, 0.45, 0.2),
      new T.Vector3(2.45, 0.45, -1.05),
      new T.Vector3(-1.35, 1.85, -1.05),
      new T.Vector3(-5.1, 1.05, -1.05),
      new T.Vector3(-5.1, 1.05, 0.2),
    ],
    ATLAS_PHASE_HUES.emerald,
    { count: 20, size: 6.8, parent: flowsGroup }
  );
  casingsGroup.add(ghostRings(sSolvLoop.curve, 0.09, 7));

  const callouts: CalloutAnchorDef[] = [
    { ...FARMA_CALLOUT_META[0], at: (v) => v.set(-5.1, 1.48, 0.2) },
    { ...FARMA_CALLOUT_META[1], at: (v) => v.set(-3.7, 1.92, 0.2) },
    { ...FARMA_CALLOUT_META[2], at: (v) => v.set(-2.15, 1.32, 0.25) },
    { ...FARMA_CALLOUT_META[3], at: (v) => v.set(-1.35, 2.95, -1.05) },
    { ...FARMA_CALLOUT_META[4], at: (v) => v.set(0.45, 1.82, 0.2) },
    { ...FARMA_CALLOUT_META[5], at: (v) => v.set(0.65, 0.88, -1.05) },
    { ...FARMA_CALLOUT_META[6], at: (v) => v.set(2.45, 1.32, 0.2) },
    { ...FARMA_CALLOUT_META[7], at: (v) => v.set(1.2, 0.55, -1.05) },
    { ...FARMA_CALLOUT_META[8], at: (v) => v.set(4.15, 1.52, 0.15) },
    { ...FARMA_CALLOUT_META[9], at: (v) => v.set(5.45, 1.52, 0.15) },
  ];

  let lastTheta = 0;
  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dRaw) < 180 ? Math.max(0, dRaw) : 0;
    const phi = mod(thetaDeg, FARMA_CYCLE_DEG);
    const rad = phi * D2R;

    reactorShaft.rotation.y = rad * 9;
    crystShaft.rotation.y = -rad * 6;
    vacDryer.rotation.z = Math.PI / 4 + rad * 3;
    const rate = stepDeg * (0.0042 + 0.002 * loadFactor);
    sApi.advance(rate * 1.05);
    sSolvLoop.advance(rate * 0.98);

    const p = Math.min(4, Math.floor(phi / 72));
    sApi.mat.opacity = 1.0;
    sSolvLoop.mat.opacity = p === 1 || p === 3 ? 1.0 : 0.48;
  }

  return {
    root,
    callouts,
    compactCalloutIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    pose,
    setLayer(key, visible) {
      if (key === 'casings') casingsGroup.visible = visible;
      if (key === 'flows') flowsGroup.visible = visible;
    },
  };
}
