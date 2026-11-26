import {
  ATLAS_PHASE_HUES,
  D2R,
  mod,
  type CalloutAnchorDef,
  type InkworksKit,
} from '@/lib/inkworks-kit';
import type { MechanismModel3D, OverviewCameraDef3D, ProcessPhaseDef3D } from '../ProcessAnatomy3DPlayer';

export const SAL_CYCLE_DEG = 360;

export const SAL_PHASES: ProcessPhaseDef3D[] = [
  {
    index: 0,
    code: '01',
    name: 'Cristalización solar y cosecha en salina',
    short: 'Cosecha salina',
    pasoId: 'sal-p1-cosecha',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [-4.6, 0.95, 0.15],
    cameraDir: [2.7, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'En Salinas Grandes de Hidalgo (Depto. Atreucó, La Pampa), la evaporación solar cristaliza la costra anual de cloruro de sodio (1,15 t bruta/t refinada), que se cosecha y escurre en parvas.',
    inputLabel: '1,18 t de costra evaporítica de NaCl en salina pampeana',
    machineAction: 'Cosecha superficial estacional + tolva de molienda húmeda',
    outputLabel: '1,15 t de sal bruta (~96-97% NaCl) hacia planta de lavado',
    tempDisplay: 'Ambiente (5-35 °C)',
    tempC: 25,
  },
  {
    index: 1,
    code: '02',
    name: 'Lavado contracorriente en salmuera saturada',
    short: 'Lavado salmuera',
    pasoId: 'sal-p2-molienda-lavado',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [-1.8, 1.35, 0.05],
    cameraDir: [2.6, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'La sal molida se lava en contracorriente con salmuera saturada de NaCl: como está saturada no disuelve los cristales de sal, pero arrastra arcillas insolubles, yeso (CaSO4) y sales de magnesio.',
    inputLabel: '1,15 t sal bruta + salmuera saturada reciclada',
    machineAction: 'Columna lavadora contracorriente + hidrociclón clasificador',
    outputLabel: '1,02 t cristales lavados (>99,3% NaCl) + purga CaSO4/Mg',
    tempDisplay: '15-25 °C',
    tempC: 20,
  },
  {
    index: 2,
    code: '03',
    name: 'Centrifugación continua y reciclo de salmuera',
    short: 'Centrífuga',
    pasoId: 'sal-p3-centrifugacion',
    startDeg: 144,
    endDeg: 216,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [0.65, 1.05, 0.15],
    cameraDir: [2.5, 3.2, 7.2],
    cameraRadius: 2.9,
    summary:
      'Centrífugas continuas de empuje (pusher) reducen la humedad desde el 25% hasta menos del 3%, mientras el espesador clarifica y devuelve la salmuera limpia al circuito cerrado de lavado.',
    inputLabel: 'Suspensión de cristales purificados de NaCl',
    machineAction: 'Centrífuga continua pusher + espesador clarificador cerrado',
    outputLabel: '1,01 t de sal centrifugada (3% H2O) + salmuera reciclada',
    tempDisplay: '20 °C',
    tempC: 20,
  },
  {
    index: 3,
    code: '04',
    name: 'Secado térmico en lecho fluidizado',
    short: 'Lecho fluido',
    pasoId: 'sal-p4-secado-lecho-fluido',
    startDeg: 216,
    endDeg: 288,
    color: ATLAS_PHASE_HUES.red,
    cameraTarget: [2.75, 1.1, -0.15],
    cameraDir: [2.5, 3.2, 7.2],
    cameraRadius: 3.0,
    summary:
      'Un secador de lecho fluido con aire caliente por gas natural lleva la humedad final por debajo de 0,15%, evitando apelmazamiento y logrando cristales cúbicos de alta fluidez.',
    inputLabel: '1,01 t sal centrifugada + aire caliente',
    machineAction: 'Secador-enfriador de lecho fluido + ciclón de finos',
    outputLabel: '1,00 t de NaCl anhidro (<0,15% H2O)',
    tempDisplay: '120-160 °C',
    tempC: 140,
  },
  {
    index: 4,
    code: '05',
    name: 'Tamizado granulométrico, yodado y silos',
    short: 'Silos NaCl',
    pasoId: 'sal-p5-clasificacion-despacho',
    startDeg: 288,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [4.8, 1.35, -0.1],
    cameraDir: [2.6, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'Zarandas clasifican fracciones gruesa, entrefina y fina; el NaCl industrial abastece plantas químicas (cloro-soda y carbonato de sodio), y la línea alimentaria recibe yodato de potasio (KIO3).',
    inputLabel: '1,00 t de NaCl seco + KIO3 (línea alimentaria)',
    machineAction: 'Zarandas clasificadoras + silos herméticos de despacho',
    outputLabel: '1,00 t de sal industrial (>99,3%) y refinada (97,5 kt exp. 24)',
    tempDisplay: '35-45 °C',
    tempC: 38,
  },
];

export const SAL_OVERVIEW_CAMERA: OverviewCameraDef3D = {
  target: [0.05, 1.2, 0.05],
  dir: [3.2, 4.0, 9.5],
  radius: 6.8,
  worldBox: [
    [-5.9, 0.0, -2.1],
    [6.0, 3.4, 2.2],
  ],
};

export const SAL_CALLOUT_META = [
  { n: 1, name: 'Parva de cosecha en salina', description: 'Acopio estacional de costra evaporítica de NaCl en La Pampa.', phaseIndex: 0 },
  { n: 2, name: 'Molino húmedo de sal bruta', description: 'Tritura terrones en salmuera exponiendo arcillas y sulfatos.', phaseIndex: 0 },
  { n: 3, name: 'Lavador contracorriente NaCl', description: 'Remueve CaSO4 y sales de Mg elevando la pureza sobre 99,3%.', phaseIndex: 1 },
  { n: 4, name: 'Hidrociclón deslamador', description: 'Separa finos insolubles de la pulpa cristalina saturada.', phaseIndex: 1 },
  { n: 5, name: 'Centrífuga continua pusher', description: 'Escurre mecánicamente los cristales hasta 3% de humedad.', phaseIndex: 2 },
  { n: 6, name: 'Espesador de salmuera cerrada', description: 'Clarifica y retorna salmuera saturada al lavador sin pérdidas.', phaseIndex: 2 },
  { n: 7, name: 'Secador de lecho fluido (140 °C)', description: 'Reduce la humedad debajo de 0,15% manteniendo fluidez.', phaseIndex: 3 },
  { n: 8, name: 'Ciclón recuperador de polvos', description: 'Retiene finos de NaCl del aire húmedo antes de chimenea.', phaseIndex: 3 },
  { n: 9, name: 'Zarandas y dosificación KIO3', description: 'Separa grados industrial (cloro-soda) y alimentario yodado.', phaseIndex: 4 },
  { n: 10, name: 'Silos de sal industrial NaCl', description: 'Despacho a química básica, curtiembres y mercado externo.', phaseIndex: 4 },
] as const;

export function buildSalIndustrialMechanism(kit: InkworksKit): MechanismModel3D {
  const { THREE: T, scene, M, part, ghost, ghostRings, stream } = kit;
  const root = new T.Group();
  scene.add(root);
  const casingsGroup = new T.Group();
  const flowsGroup = new T.Group();
  root.add(casingsGroup, flowsGroup);

  const deck = part(new T.BoxGeometry(12.4, 0.16, 4.3), M.concrete);
  deck.position.set(0.05, -0.08, 0);
  root.add(deck);

  // Fase 1: Parva evaporítica de sal + molino húmedo
  const saltPile = part(new T.ConeGeometry(0.95, 1.15, 6), M.ceramic);
  saltPile.position.set(-4.85, 0.58, 0.25);
  root.add(saltPile);
  const wetMill = part(new T.BoxGeometry(0.95, 0.85, 0.85), M.steel);
  wetMill.position.set(-3.4, 0.45, 0.15);
  root.add(wetMill);

  // Fase 2: Lavador contracorriente + hidrociclón
  const washer = part(new T.CylinderGeometry(0.48, 0.48, 2.35, 18), M.cobalt);
  washer.position.set(-1.95, 1.18, -0.15);
  root.add(washer);
  const hydrocyclone = part(new T.CylinderGeometry(0.24, 0.09, 1.05, 14), M.alloy);
  hydrocyclone.position.set(-0.95, 1.65, -0.15);
  root.add(hydrocyclone);

  // Fase 3: Centrífuga pusher + espesador de salmuera
  const centrifuge = part(new T.CylinderGeometry(0.42, 0.42, 1.15, 18), M.emerald);
  centrifuge.rotation.z = Math.PI / 2;
  centrifuge.position.set(0.55, 0.85, -0.15);
  root.add(centrifuge);
  const centCase = ghost(new T.BoxGeometry(1.35, 1.0, 1.0));
  centCase.position.set(0.55, 0.85, -0.15);
  casingsGroup.add(centCase);
  const clarifier = part(new T.CylinderGeometry(0.82, 0.72, 0.65, 22), M.seaBed);
  clarifier.position.set(-0.35, 0.35, 1.15);
  root.add(clarifier);

  // Fase 4: Secador lecho fluido + ciclón
  const dryer = part(new T.BoxGeometry(2.0, 0.95, 0.95), M.refractory);
  dryer.position.set(2.65, 0.62, -0.2);
  root.add(dryer);
  const dryerCase = ghost(new T.BoxGeometry(2.2, 1.18, 1.15));
  dryerCase.position.set(2.65, 0.62, -0.2);
  casingsGroup.add(dryerCase);
  const dustCyclone = part(new T.CylinderGeometry(0.26, 0.1, 1.15, 14), M.steel);
  dustCyclone.position.set(3.25, 1.85, 0.75);
  root.add(dustCyclone);

  // Fase 5: Zarandas + silos blancos NaCl
  const screenBox = part(new T.BoxGeometry(0.95, 0.85, 0.85), M.ochreBath);
  screenBox.position.set(4.15, 0.55, 0.35);
  root.add(screenBox);
  const silo = part(new T.CylinderGeometry(0.56, 0.56, 2.05, 20), M.ceramic);
  silo.position.set(5.15, 1.02, -0.5);
  root.add(silo);
  const siloCap = part(new T.ConeGeometry(0.58, 0.42, 20), M.steel);
  siloCap.position.set(5.15, 2.25, -0.5);
  root.add(siloCap);

  // Flujos animados
  const sSaltMain = stream(
    [
      new T.Vector3(-4.85, 0.95, 0.25),
      new T.Vector3(-3.4, 0.85, 0.15),
      new T.Vector3(-1.95, 2.0, -0.15),
      new T.Vector3(-0.95, 1.65, -0.15),
      new T.Vector3(0.55, 0.85, -0.15),
      new T.Vector3(2.65, 0.85, -0.2),
      new T.Vector3(4.15, 0.85, 0.35),
      new T.Vector3(5.15, 1.75, -0.5),
    ],
    ATLAS_PHASE_HUES.cobalt,
    { count: 28, size: 7.5, parent: flowsGroup }
  );
  const sBrineLoop = stream(
    [
      new T.Vector3(0.55, 0.45, 0.35),
      new T.Vector3(-0.35, 0.65, 1.15),
      new T.Vector3(-1.95, 0.65, 1.15),
      new T.Vector3(-1.95, 1.1, -0.15),
    ],
    ATLAS_PHASE_HUES.emerald,
    { count: 18, size: 7.0, parent: flowsGroup }
  );
  casingsGroup.add(ghostRings(sBrineLoop.curve, 0.1, 6));

  const callouts: CalloutAnchorDef[] = [
    { ...SAL_CALLOUT_META[0], at: (v) => v.set(-4.85, 1.22, 0.25) },
    { ...SAL_CALLOUT_META[1], at: (v) => v.set(-3.4, 0.95, 0.15) },
    { ...SAL_CALLOUT_META[2], at: (v) => v.set(-1.95, 2.38, -0.15) },
    { ...SAL_CALLOUT_META[3], at: (v) => v.set(-0.95, 2.18, -0.15) },
    { ...SAL_CALLOUT_META[4], at: (v) => v.set(0.55, 1.38, -0.15) },
    { ...SAL_CALLOUT_META[5], at: (v) => v.set(-0.35, 0.78, 1.15) },
    { ...SAL_CALLOUT_META[6], at: (v) => v.set(2.65, 1.22, -0.2) },
    { ...SAL_CALLOUT_META[7], at: (v) => v.set(3.25, 2.45, 0.75) },
    { ...SAL_CALLOUT_META[8], at: (v) => v.set(4.15, 1.05, 0.35) },
    { ...SAL_CALLOUT_META[9], at: (v) => v.set(5.15, 2.48, -0.5) },
  ];

  let lastTheta = 0;
  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dRaw) < 180 ? Math.max(0, dRaw) : 0;
    const phi = mod(thetaDeg, SAL_CYCLE_DEG);
    const rad = phi * D2R;

    centrifuge.rotation.x = rad * 10;
    const rate = stepDeg * (0.0042 + 0.002 * loadFactor);
    sSaltMain.advance(rate * 1.1);
    sBrineLoop.advance(rate * 1.05);

    const p = Math.min(4, Math.floor(phi / 72));
    sSaltMain.mat.opacity = 1.0;
    sBrineLoop.mat.opacity = p === 1 || p === 2 ? 1.0 : 0.48;
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
