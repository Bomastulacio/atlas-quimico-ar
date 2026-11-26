import {
  ATLAS_PHASE_HUES,
  D2R,
  mod,
  type CalloutAnchorDef,
  type InkworksKit,
} from '@/lib/inkworks-kit';
import type { MechanismModel3D, OverviewCameraDef3D, ProcessPhaseDef3D } from '../ProcessAnatomy3DPlayer';

export const SODA_SOLVAY_CYCLE_DEG = 360;

export const SODA_SOLVAY_PHASES: ProcessPhaseDef3D[] = [
  {
    index: 0,
    code: '01',
    name: 'Salmuera purificada y horno de cal',
    short: 'Salmuera y caliza',
    pasoId: 'solvay-p1-salmuera',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [-4.6, 1.35, 0.2],
    cameraDir: [2.8, 3.3, 7.6],
    cameraRadius: 3.1,
    summary:
      'En Punta Delgado (San Antonio Oeste), la salmuera saturada (1,50 t NaCl/t) se purifica removiendo calcio y magnesio mientras el horno vertical calcina caliza a 1.000 °C para generar CO2 y cal viva.',
    inputLabel: '1,50 t NaCl en salmuera + 1,25 t de piedra caliza (CaCO3)',
    machineAction: 'Purificador de salmuera + horno vertical de calcinación',
    outputLabel: 'Salmuera limpia + gas CO2 (0,55 t/t) + CaO',
    tempDisplay: '25 a 1.000 °C',
    tempC: 1000,
  },
  {
    index: 1,
    code: '02',
    name: 'Torre de absorción de amoníaco',
    short: 'Amoniacado NH3',
    pasoId: 'solvay-p2-amoniacado',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [-2.1, 1.5, 0.1],
    cameraDir: [2.5, 3.2, 7.2],
    cameraRadius: 2.9,
    summary:
      'La salmuera purificada ingresa a la torre de absorción enfriada con agua de mar, donde disuelve el gas amoníaco (NH3) reciclado del propio circuito Solvay.',
    inputLabel: 'Salmuera purificada + amoníaco (NH3) reciclado',
    machineAction: 'Torre empacada de absorción con intercambiadores de enfriamiento',
    outputLabel: 'Salmuera amoniacal fría lista para carbonatar',
    tempDisplay: '30-45 °C',
    tempC: 35,
  },
  {
    index: 2,
    code: '03',
    name: 'Torres Solvay de carbonatación',
    short: 'Carbonatación',
    pasoId: 'solvay-p3-carbonatacion',
    startDeg: 144,
    endDeg: 216,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [0.3, 1.6, 0.0],
    cameraDir: [2.6, 3.3, 7.4],
    cameraRadius: 3.1,
    summary:
      'El CO2 comprimido burbujea en contracorriente dentro de las torres Solvay precipitando cristales de bicarbonato de sodio (NaHCO3), que luego se separan en filtros rotativos al vacío.',
    inputLabel: 'Salmuera amoniacal + CO2 de caliza y calcinación',
    machineAction: 'Torres de carbonatación Solvay + filtros rotativos al vacío',
    outputLabel: '1,58 t torta NaHCO3 + 1,01 t licor madre NH4Cl',
    tempDisplay: '25-60 °C · 2 bar',
    tempC: 45,
  },
  {
    index: 3,
    code: '04',
    name: 'Calcinación a Soda Solvay (Na2CO3)',
    short: 'Calcinador',
    pasoId: 'solvay-p4-calcinacion',
    startDeg: 216,
    endDeg: 288,
    color: ATLAS_PHASE_HUES.red,
    cameraTarget: [2.8, 1.25, -0.35],
    cameraDir: [2.4, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'La torta de NaHCO3 se descompone en calcinadores rotativos a 180 °C produciendo carbonato de sodio anhidro (Na2CO3 >99,2%) y liberando CO2 concentrado que retorna a las torres.',
    inputLabel: '1,58 t torta húmeda de NaHCO3',
    machineAction: 'Calcinador rotativo a vapor + silos de soda densa',
    outputLabel: '1,00 t de Soda Solvay (Na2CO3) + 0,42 t CO2 reciclado',
    tempDisplay: '160-200 °C',
    tempC: 180,
  },
  {
    index: 4,
    code: '05',
    name: 'Destilación y reciclo cerrado de NH3',
    short: 'Reciclo NH3',
    pasoId: 'solvay-p5-recuperacion-nh3',
    startDeg: 288,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [4.8, 1.5, 0.3],
    cameraDir: [2.6, 3.2, 7.4],
    cameraRadius: 3.1,
    summary:
      'El licor madre de cloruro de amonio reacciona con lechada de cal Ca(OH)2 en la columna destiladora, recuperando más del 99% del amoníaco hacia la torre de absorción.',
    inputLabel: '1,01 t NH4Cl + 0,72 t lechada de cal Ca(OH)2',
    machineAction: 'Columna destiladora de NH3 + lazo aéreo de retorno cerrado',
    outputLabel: 'NH3 reciclado (>99%) + solución salina CaCl2',
    tempDisplay: '100-110 °C',
    tempC: 105,
  },
];

export const SODA_SOLVAY_OVERVIEW_CAMERA: OverviewCameraDef3D = {
  target: [0.1, 1.25, 0.0],
  dir: [3.2, 4.1, 9.6],
  radius: 6.9,
  worldBox: [
    [-6.0, 0.0, -2.2],
    [6.1, 3.6, 2.2],
  ],
};

export const SODA_SOLVAY_CALLOUT_META = [
  { n: 1, name: 'Horno vertical de caliza', description: 'Calcina 1,25 t de CaCO3 a 1.000 °C generando CO2 y cal viva.', phaseIndex: 0 },
  { n: 2, name: 'Purificador de salmuera NaCl', description: 'Remueve impurezas Ca/Mg de la salmuera saturada antes de absorción.', phaseIndex: 0 },
  { n: 3, name: 'Torre de absorción NH3', description: 'Disuelve el amoníaco reciclado en la salmuera purificada fría.', phaseIndex: 1 },
  { n: 4, name: 'Intercambiador agua de mar', description: 'Retira calor exotérmico de absorción usando agua del Golfo San Matías.', phaseIndex: 1 },
  { n: 5, name: 'Torres Solvay de carbonatación', description: 'Precipitan cristales de NaHCO3 mediante burbujeo de CO2 a 2 bar.', phaseIndex: 2 },
  { n: 6, name: 'Filtro rotativo de NaHCO3', description: 'Separa la torta sólida de bicarbonato del licor de cloruro de amonio.', phaseIndex: 2 },
  { n: 7, name: 'Calcinador rotativo a 180 °C', description: 'Convierte 2 NaHCO3 en Na2CO3 anhidro y recicla CO2 puro.', phaseIndex: 3 },
  { n: 8, name: 'Silos de Soda Solvay densa', description: 'Acopian Na2CO3 (>99,2%) para industria del vidrio y salares de litio.', phaseIndex: 3 },
  { n: 9, name: 'Destiladora de amoníaco NH3', description: 'Regenera >99% del NH3 reaccionando NH4Cl con lechada de cal.', phaseIndex: 4 },
  { n: 10, name: 'Ducto de reciclo cerrado NH3', description: 'Devuelve el gas NH3 hacia la torre de absorción cerrando el ciclo.', phaseIndex: 4 },
] as const;

export function buildSodaSolvayMechanism(kit: InkworksKit): MechanismModel3D {
  const { THREE: T, scene, M, part, ghost, ghostRings, stream } = kit;
  const root = new T.Group();
  scene.add(root);
  const casingsGroup = new T.Group();
  const flowsGroup = new T.Group();
  root.add(casingsGroup, flowsGroup);

  const deck = part(new T.BoxGeometry(12.6, 0.16, 4.4), M.concrete);
  deck.position.set(0.1, -0.08, 0);
  root.add(deck);

  // Fase 1: Horno caliza + tanque purificador de salmuera
  const kiln = part(new T.CylinderGeometry(0.52, 0.64, 2.7, 20), M.refractory);
  kiln.position.set(-4.8, 1.35, -0.55);
  root.add(kiln);
  const kilnTop = part(new T.CylinderGeometry(0.32, 0.52, 0.45, 18), M.dark);
  kilnTop.position.set(-4.8, 2.9, -0.55);
  root.add(kilnTop);
  const brineTank = part(new T.CylinderGeometry(0.72, 0.72, 1.45, 20), M.seaBed);
  brineTank.position.set(-4.3, 0.72, 0.8);
  root.add(brineTank);
  const brineSurface = part(new T.CylinderGeometry(0.68, 0.68, 0.08, 20), M.cobalt);
  brineSurface.position.set(-4.3, 1.44, 0.8);
  root.add(brineSurface);

  // Fase 2: Torre absorción NH3 + intercambiador agua de mar
  const absTower = part(new T.CylinderGeometry(0.45, 0.45, 2.85, 18), M.cobalt);
  absTower.position.set(-2.1, 1.42, 0.15);
  root.add(absTower);
  const cooler = part(new T.BoxGeometry(0.92, 0.56, 0.68), M.steel);
  cooler.position.set(-1.35, 0.36, 0.9);
  root.add(cooler);

  // Fase 3: Torres Solvay + filtro rotativo
  const towerA = part(new T.CylinderGeometry(0.42, 0.42, 3.1, 18), M.emerald);
  towerA.position.set(0.0, 1.55, -0.35);
  root.add(towerA);
  const towerB = part(new T.CylinderGeometry(0.42, 0.42, 3.1, 18), M.emerald);
  towerB.position.set(0.82, 1.55, -0.35);
  root.add(towerB);
  const filterDrum = part(new T.CylinderGeometry(0.42, 0.42, 1.0, 18), M.ceramic);
  filterDrum.rotation.z = Math.PI / 2;
  filterDrum.position.set(0.5, 0.75, 0.9);
  root.add(filterDrum);
  const filterCase = ghost(new T.BoxGeometry(1.3, 1.05, 0.95));
  filterCase.position.set(0.5, 0.75, 0.9);
  casingsGroup.add(filterCase);

  // Fase 4: Calcinador rotativo + silos de Soda Solvay densa
  const calciner = part(new T.CylinderGeometry(0.46, 0.46, 2.1, 20), M.ochreBath);
  calciner.rotation.z = Math.PI / 2;
  calciner.position.set(2.65, 0.95, -0.35);
  root.add(calciner);
  const calcCase = ghost(new T.BoxGeometry(2.35, 1.15, 1.15));
  calcCase.position.set(2.65, 0.95, -0.35);
  casingsGroup.add(calcCase);

  const silo = part(new T.CylinderGeometry(0.58, 0.58, 1.9, 20), M.ceramic);
  silo.position.set(4.15, 0.95, -0.75);
  root.add(silo);
  const siloCap = part(new T.ConeGeometry(0.6, 0.45, 20), M.steel);
  siloCap.position.set(4.15, 2.12, -0.75);
  root.add(siloCap);

  // Fase 5: Destiladora NH3
  const distiller = part(new T.CylinderGeometry(0.5, 0.5, 2.95, 20), M.steel);
  distiller.position.set(4.95, 1.48, 0.55);
  root.add(distiller);

  // Flujos animados
  const sBrine = stream(
    [
      new T.Vector3(-4.3, 1.1, 0.8),
      new T.Vector3(-3.1, 1.25, 0.5),
      new T.Vector3(-2.1, 1.4, 0.15),
      new T.Vector3(-0.4, 2.2, -0.2),
      new T.Vector3(0.4, 1.8, -0.35),
    ],
    ATLAS_PHASE_HUES.cobalt,
    { count: 22, size: 7.5, parent: flowsGroup }
  );
  const sBicarb = stream(
    [
      new T.Vector3(0.5, 0.75, 0.9),
      new T.Vector3(1.45, 0.95, 0.25),
      new T.Vector3(2.65, 0.95, -0.35),
      new T.Vector3(4.15, 1.45, -0.75),
    ],
    ATLAS_PHASE_HUES.ochre,
    { count: 18, size: 7.5, parent: flowsGroup }
  );
  const sNh3Loop = stream(
    [
      new T.Vector3(4.95, 2.85, 0.55),
      new T.Vector3(2.6, 3.25, 0.55),
      new T.Vector3(-0.2, 3.25, 0.4),
      new T.Vector3(-2.1, 2.75, 0.15),
    ],
    ATLAS_PHASE_HUES.emerald,
    { count: 22, size: 7.2, parent: flowsGroup }
  );
  casingsGroup.add(ghostRings(sNh3Loop.curve, 0.11, 7));

  const callouts: CalloutAnchorDef[] = [
    { ...SODA_SOLVAY_CALLOUT_META[0], at: (v) => v.set(-4.8, 2.55, -0.55) },
    { ...SODA_SOLVAY_CALLOUT_META[1], at: (v) => v.set(-4.3, 1.45, 0.8) },
    { ...SODA_SOLVAY_CALLOUT_META[2], at: (v) => v.set(-2.1, 2.7, 0.15) },
    { ...SODA_SOLVAY_CALLOUT_META[3], at: (v) => v.set(-1.35, 0.65, 0.9) },
    { ...SODA_SOLVAY_CALLOUT_META[4], at: (v) => v.set(0.4, 2.95, -0.35) },
    { ...SODA_SOLVAY_CALLOUT_META[5], at: (v) => v.set(0.5, 1.25, 0.9) },
    { ...SODA_SOLVAY_CALLOUT_META[6], at: (v) => v.set(2.65, 1.48, -0.35) },
    { ...SODA_SOLVAY_CALLOUT_META[7], at: (v) => v.set(4.15, 2.35, -0.75) },
    { ...SODA_SOLVAY_CALLOUT_META[8], at: (v) => v.set(4.95, 2.75, 0.55) },
    { ...SODA_SOLVAY_CALLOUT_META[9], at: (v) => v.set(1.2, 3.25, 0.5) },
  ];

  let lastTheta = 0;
  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dRaw) < 180 ? Math.max(0, dRaw) : 0;
    const phi = mod(thetaDeg, SODA_SOLVAY_CYCLE_DEG);
    const rad = phi * D2R;

    filterDrum.rotation.x = rad * 4;
    calciner.rotation.x = rad * 3;
    const rate = stepDeg * (0.0042 + 0.002 * loadFactor);
    sBrine.advance(rate * 1.1);
    sBicarb.advance(rate * 1.0);
    sNh3Loop.advance(rate * 1.15);

    const p = Math.min(4, Math.floor(phi / 72));
    sBrine.mat.opacity = p <= 2 ? 1.0 : 0.48;
    sBicarb.mat.opacity = p >= 2 && p <= 3 ? 1.0 : 0.48;
    sNh3Loop.mat.opacity = p === 1 || p === 4 ? 1.0 : 0.48;
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
