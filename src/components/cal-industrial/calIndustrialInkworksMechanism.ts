import {
  ATLAS_PHASE_HUES,
  D2R,
  mod,
  type CalloutAnchorDef,
  type InkworksKit,
} from '@/lib/inkworks-kit';
import type { MechanismModel3D, OverviewCameraDef3D, ProcessPhaseDef3D } from '../ProcessAnatomy3DPlayer';

export const CAL_INDUSTRIAL_CYCLE_DEG = 360;

export const CAL_INDUSTRIAL_PHASES: ProcessPhaseDef3D[] = [
  {
    index: 0,
    code: '01',
    name: 'Trituración y clasificación de caliza',
    short: 'Cantera y zaranda',
    pasoId: 'cal-p1-cantera',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [-4.6, 1.15, 0.15],
    cameraDir: [2.7, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'En Los Berros (Depto. Sarmiento, San Juan), la piedra caliza de alta ley (1,82 t CaCO3/t CaO) se tritura y zarandea a granulometría de 30 a 90 mm para permitir el paso uniforme de los gases en el horno.',
    inputLabel: '1,82 t de roca caliza precordillerana (CaCO3 >95%)',
    machineAction: 'Tolva de alimentación + trituradora de mandíbulas y zaranda',
    outputLabel: '1,80 t de caliza clasificada (30-90 mm) hacia skip de carga',
    tempDisplay: 'Ambiente',
    tempC: 25,
  },
  {
    index: 1,
    code: '02',
    name: 'Precalentamiento en doble cuba PFRK',
    short: 'Precalentamiento',
    pasoId: 'cal-p2-precalentamiento',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [-1.4, 2.0, -0.1],
    cameraDir: [2.6, 3.2, 7.5],
    cameraRadius: 3.1,
    summary:
      'El skip eleva la caliza hasta el tope del horno vertical regenerativo de flujo paralelo (PFRK). Mientras una cuba quema, los gases calientes atraviesan el canal de cruce y precalientan la piedra de la cuba vecina.',
    inputLabel: 'Caliza calibrada + gases calientes de cruce regenerativo',
    machineAction: 'Elevador skip + zona de precalentamiento en cuba regenerativa',
    outputLabel: 'Caliza precalentada a 750 °C antes de la zona de fuego',
    tempDisplay: '650-800 °C',
    tempC: 750,
  },
  {
    index: 2,
    code: '03',
    name: 'Calcinación térmica (CaCO3 -> CaO + CO2)',
    short: 'Calcinación PFRK',
    pasoId: 'cal-p3-calcinacion',
    startDeg: 144,
    endDeg: 216,
    color: ATLAS_PHASE_HUES.red,
    cameraTarget: [-0.2, 1.5, 0.0],
    cameraDir: [2.5, 3.1, 7.4],
    cameraRadius: 3.0,
    summary:
      'En la zona de calcinación a 950-1.100 °C, el carbonato de calcio se descompone en cal viva reactiva (CaO) liberando exactamente 0,785 t de CO2 estequiométrico por tonelada de CaO (IPCC Cap. 2.3).',
    inputLabel: '1,80 t caliza precalentada + gas natural en lanzas PFRK',
    machineAction: 'Cuba en fuego PFRK con alternancia cíclica cada 12 min',
    outputLabel: '1,00 t de cal viva (CaO) + 0,785 t CO2 de proceso',
    tempDisplay: '950-1.100 °C',
    tempC: 1050,
  },
  {
    index: 3,
    code: '04',
    name: 'Enfriamiento, filtros de mangas y molienda',
    short: 'Enfriamiento y filtro',
    pasoId: 'cal-p4-enfriamiento-molienda',
    startDeg: 216,
    endDeg: 288,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [2.3, 1.25, 0.25],
    cameraDir: [2.5, 3.2, 7.2],
    cameraRadius: 3.0,
    summary:
      'La cal viva se enfría recuperando calor hacia el aire de combustión, mientras los gases de chimenea pasan por filtros de mangas de alta eficiencia que retienen el polvo fino calcáreo.',
    inputLabel: 'Cal viva incandescente + gases de escape del horno',
    machineAction: 'Zona de enfriamiento inferior + filtro de mangas',
    outputLabel: 'Cal viva granulada/molida limpia + gases abatidos',
    tempDisplay: '60-140 °C',
    tempC: 90,
  },
  {
    index: 4,
    code: '05',
    name: 'Hidratación controlada y silos de despacho',
    short: 'Hidratación y silos',
    pasoId: 'cal-p5-hidratacion-despacho',
    startDeg: 288,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [4.6, 1.35, -0.1],
    cameraDir: [2.6, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'Parte de la cal viva ingresa al hidratador continuo (CaO + H2O -> Ca(OH)2) y el resto se almacena en silos herméticos para abastecer a la minería del litio, cobre y exportaciones a Chile (476 kt en 2024).',
    inputLabel: 'Cal viva (CaO) + agua desmineralizada',
    machineAction: 'Hidratador continuo + silos herméticos de despacho a granel',
    outputLabel: 'Cal viva (CaO) y cal hidratada (Ca(OH)2) grado minero',
    tempDisplay: '55-98 °C',
    tempC: 95,
  },
];

export const CAL_INDUSTRIAL_OVERVIEW_CAMERA: OverviewCameraDef3D = {
  target: [0.0, 1.4, 0.0],
  dir: [3.1, 4.0, 9.4],
  radius: 6.7,
  worldBox: [
    [-5.8, 0.0, -2.1],
    [5.9, 3.8, 2.1],
  ],
};

export const CAL_INDUSTRIAL_CALLOUT_META = [
  { n: 1, name: 'Trituradora y zaranda de caliza', description: 'Clasifica caliza precordillerana a 30-90 mm para el horno vertical.', phaseIndex: 0 },
  { n: 2, name: 'Cinta y skip de carga', description: 'Eleva 1,80 t de caliza clasificada hasta el tope de las cubas.', phaseIndex: 0 },
  { n: 3, name: 'Cuba regenerativa B (precalentamiento)', description: 'Recupera entalpía de los gases calientes para precalentar la caliza.', phaseIndex: 1 },
  { n: 4, name: 'Canal de cruce regenerativo', description: 'Conduce los gases a 950 °C desde la cuba en fuego hacia la vecina.', phaseIndex: 1 },
  { n: 5, name: 'Cuba en fuego A (1.050 °C)', description: 'Descompone CaCO3 -> CaO + CO2 en flujo paralelo con gas natural.', phaseIndex: 2 },
  { n: 6, name: 'Lanzas de quemadores PFRK', description: 'Alternan el ciclo térmico maximizando reactividad y eficiencia.', phaseIndex: 2 },
  { n: 7, name: 'Filtro de mangas de gases', description: 'Retiene partículas finas antes de liberar el CO2 de descarbonatación.', phaseIndex: 3 },
  { n: 8, name: 'Molino y clasificador de CaO', description: 'Ajusta granulometría de cal viva para minería e industria.', phaseIndex: 3 },
  { n: 9, name: 'Hidratador continuo Ca(OH)2', description: 'Apaga cal viva con agua controlada generando hidróxido fino.', phaseIndex: 4 },
  { n: 10, name: 'Silos herméticos de despacho', description: 'Acopian cal viva e hidratada (476 kt exportadas en 2024).', phaseIndex: 4 },
] as const;

export function buildCalIndustrialMechanism(kit: InkworksKit): MechanismModel3D {
  const { THREE: T, scene, M, part, ghost, ghostRings, stream } = kit;
  const root = new T.Group();
  scene.add(root);
  const casingsGroup = new T.Group();
  const flowsGroup = new T.Group();
  root.add(casingsGroup, flowsGroup);

  const deck = part(new T.BoxGeometry(12.2, 0.16, 4.2), M.concrete);
  deck.position.set(0.0, -0.08, 0);
  root.add(deck);

  // Fase 1: Trituradora + cinta inclinada
  const crusher = part(new T.BoxGeometry(1.3, 1.0, 1.2), M.ochreBath);
  crusher.position.set(-4.7, 0.5, 0.25);
  root.add(crusher);
  const crusherRotor = part(new T.CylinderGeometry(0.28, 0.28, 0.9, 12), M.steel);
  crusherRotor.rotation.x = Math.PI / 2;
  crusherRotor.position.set(-4.7, 0.65, 0.25);
  root.add(crusherRotor);
  const ramp = part(new T.BoxGeometry(2.7, 0.14, 0.55), M.steel);
  ramp.position.set(-3.1, 1.75, 0.0);
  ramp.rotation.z = 0.68;
  root.add(ramp);

  // Fase 2 y 3: Horno PFRK doble cuba + canal de cruce
  const shaftA = part(new T.CylinderGeometry(0.62, 0.68, 3.25, 20), M.refractory);
  shaftA.position.set(-0.95, 1.62, -0.2);
  root.add(shaftA);
  const shaftB = part(new T.CylinderGeometry(0.62, 0.68, 3.25, 20), M.ceramic);
  shaftB.position.set(0.65, 1.62, -0.2);
  root.add(shaftB);
  const crossover = part(new T.BoxGeometry(1.1, 0.42, 0.52), M.copper);
  crossover.position.set(-0.15, 1.25, -0.2);
  root.add(crossover);
  const kilnCase = ghost(new T.BoxGeometry(3.1, 3.45, 1.7));
  kilnCase.position.set(-0.15, 1.72, -0.2);
  casingsGroup.add(kilnCase);

  // Fase 4: Filtro de mangas + molino
  const baghouse = part(new T.BoxGeometry(1.1, 1.9, 0.95), M.cobalt);
  baghouse.position.set(2.35, 1.15, -0.85);
  root.add(baghouse);
  const mill = part(new T.CylinderGeometry(0.42, 0.42, 1.15, 16), M.steel);
  mill.rotation.z = Math.PI / 2;
  mill.position.set(2.4, 0.65, 0.65);
  root.add(mill);

  // Fase 5: Hidratador + silos
  const hydrator = part(new T.CylinderGeometry(0.36, 0.36, 1.35, 16), M.emerald);
  hydrator.rotation.z = Math.PI / 2;
  hydrator.position.set(4.15, 0.72, 0.72);
  root.add(hydrator);

  const silo1 = part(new T.CylinderGeometry(0.55, 0.55, 2.1, 20), M.ceramic);
  silo1.position.set(4.95, 1.05, -0.55);
  root.add(silo1);
  const cap1 = part(new T.ConeGeometry(0.58, 0.42, 20), M.steel);
  cap1.position.set(4.95, 2.3, -0.55);
  root.add(cap1);

  // Flujos animados
  const sLimestone = stream(
    [
      new T.Vector3(-4.7, 0.9, 0.25),
      new T.Vector3(-3.1, 1.9, 0.0),
      new T.Vector3(-0.95, 3.25, -0.2),
      new T.Vector3(-0.95, 1.5, -0.2),
    ],
    ATLAS_PHASE_HUES.ochre,
    { count: 20, size: 7.5, parent: flowsGroup }
  );
  const sGas = stream(
    [
      new T.Vector3(-0.95, 1.25, -0.2),
      new T.Vector3(0.65, 1.25, -0.2),
      new T.Vector3(0.65, 2.9, -0.2),
      new T.Vector3(2.35, 2.05, -0.85),
    ],
    ATLAS_PHASE_HUES.red,
    { count: 18, size: 7.2, parent: flowsGroup }
  );
  casingsGroup.add(ghostRings(sGas.curve, 0.11, 6));
  const sLime = stream(
    [
      new T.Vector3(-0.95, 0.45, 0.3),
      new T.Vector3(0.85, 0.55, 0.55),
      new T.Vector3(2.4, 0.65, 0.65),
      new T.Vector3(4.15, 0.72, 0.72),
      new T.Vector3(4.95, 1.55, -0.55),
    ],
    ATLAS_PHASE_HUES.emerald,
    { count: 22, size: 7.5, parent: flowsGroup }
  );

  const callouts: CalloutAnchorDef[] = [
    { ...CAL_INDUSTRIAL_CALLOUT_META[0], at: (v) => v.set(-4.7, 1.08, 0.25) },
    { ...CAL_INDUSTRIAL_CALLOUT_META[1], at: (v) => v.set(-3.1, 2.0, 0.0) },
    { ...CAL_INDUSTRIAL_CALLOUT_META[2], at: (v) => v.set(0.65, 3.15, -0.2) },
    { ...CAL_INDUSTRIAL_CALLOUT_META[3], at: (v) => v.set(-0.15, 1.5, -0.2) },
    { ...CAL_INDUSTRIAL_CALLOUT_META[4], at: (v) => v.set(-0.95, 3.15, -0.2) },
    { ...CAL_INDUSTRIAL_CALLOUT_META[5], at: (v) => v.set(-0.95, 1.85, 0.45) },
    { ...CAL_INDUSTRIAL_CALLOUT_META[6], at: (v) => v.set(2.35, 2.15, -0.85) },
    { ...CAL_INDUSTRIAL_CALLOUT_META[7], at: (v) => v.set(2.4, 1.15, 0.65) },
    { ...CAL_INDUSTRIAL_CALLOUT_META[8], at: (v) => v.set(4.15, 1.15, 0.72) },
    { ...CAL_INDUSTRIAL_CALLOUT_META[9], at: (v) => v.set(4.95, 2.55, -0.55) },
  ];

  let lastTheta = 0;
  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dRaw) < 180 ? Math.max(0, dRaw) : 0;
    const phi = mod(thetaDeg, CAL_INDUSTRIAL_CYCLE_DEG);
    const rad = phi * D2R;

    crusherRotor.rotation.z = -rad * 6;
    mill.rotation.x = rad * 4;
    const rate = stepDeg * (0.0042 + 0.002 * loadFactor);
    sLimestone.advance(rate * 1.05);
    sGas.advance(rate * 1.15);
    sLime.advance(rate * 1.0);

    const p = Math.min(4, Math.floor(phi / 72));
    sLimestone.mat.opacity = p <= 1 ? 1.0 : 0.48;
    sGas.mat.opacity = p >= 1 && p <= 3 ? 1.0 : 0.48;
    sLime.mat.opacity = p >= 3 ? 1.0 : 0.48;
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
