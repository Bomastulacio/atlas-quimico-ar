import {
  ATLAS_PHASE_HUES,
  D2R,
  mod,
  type CalloutAnchorDef,
  type InkworksKit,
} from '@/lib/inkworks-kit';
import type { MechanismModel3D, OverviewCameraDef3D, ProcessPhaseDef3D } from '../ProcessAnatomy3DPlayer';

export const GLP_CYCLE_DEG = 360;

export const GLP_PHASES: ProcessPhaseDef3D[] = [
  {
    index: 0,
    code: '01',
    name: 'Recepción offshore y slug catcher',
    short: 'Recepción 75 bar',
    pasoId: 'glp-p1-recepcion-separacion',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [-4.6, 1.05, 0.15],
    cameraDir: [2.7, 3.2, 7.4],
    cameraRadius: 3.0,
    summary:
      'En Río Cullen y Cañadón Alfa (Río Grande, Tierra del Fuego), el gas húmedo offshore de la Cuenca Austral ingresa a 75 bar al slug catcher donde se separan agua de formación y condensados pesados C5+.',
    inputLabel: 'Gas húmedo multifásico de plataformas Cuenca Marina Austral 1',
    machineAction: 'Slug catcher horizontal de alta presión + separador bifásico',
    outputLabel: 'Gas húmedo C1-C5 libre de baches líquidos + condensado C5+',
    tempDisplay: '10-25 °C · 75 bar',
    tempC: 18,
  },
  {
    index: 1,
    code: '02',
    name: 'Deshidratación con tamices moleculares 4A',
    short: 'Tamices 4A',
    pasoId: 'glp-p2-deshidratacion',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [-2.2, 1.45, 0.05],
    cameraDir: [2.6, 3.2, 7.2],
    cameraRadius: 3.0,
    summary:
      'Dos torres alternadas con lechos de zeolita 4A adsorben la humedad del gas por debajo de 0,1 ppmv para evitar formación de hielo o hidratos en la sección criogénica.',
    inputLabel: 'Gas húmedo C1-C5 a 70 bar',
    machineAction: 'Torres regenerables de tamices moleculares de zeolita 4A',
    outputLabel: 'Gas seco criogénico (<0,1 ppmv H2O)',
    tempDisplay: '20-30 °C · 70 bar',
    tempC: 25,
  },
  {
    index: 2,
    code: '03',
    name: 'Cold box y turbo-expansión criogénica (-95 °C)',
    short: 'Turbo-expansor',
    pasoId: 'glp-p3-turboexpansion',
    startDeg: 144,
    endDeg: 216,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [0.1, 1.15, 0.1],
    cameraDir: [2.5, 3.2, 7.2],
    cameraRadius: 2.9,
    summary:
      'El gas seco se expande en la turbina turbo-expansora cayendo de 70 a 30 bar y enfriándose a -95 °C: los hidrocarburos pesados condensan como LGN mientras el metano seco se recomprime hacia el Gasoducto San Martín.',
    inputLabel: 'Gas seco a 70 bar enfriado en caja fría (cold box)',
    machineAction: 'Turbo-expansor rotativo acoplado a compresor de gas residual',
    outputLabel: 'LGN líquido (C2-C5+) + metano seco CH4 al gasoducto',
    tempDisplay: '-95 a -40 °C · 30 bar',
    tempC: -95,
  },
  {
    index: 3,
    code: '04',
    name: 'Tren de fraccionamiento (C2, C3 y C4)',
    short: 'Columnas C3/C4',
    pasoId: 'glp-p4-fraccionamiento',
    startDeg: 216,
    endDeg: 288,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [2.5, 1.6, -0.15],
    cameraDir: [2.6, 3.3, 7.4],
    cameraRadius: 3.1,
    summary:
      'Tres torres de destilación en serie (desetanizadora, despropanizadora y desbutanizadora) separan propano comercial (C3H8 >95%), butano (C4H10) y gasolina natural estabilizada (C5+).',
    inputLabel: 'Corriente líquida LGN criogénica + aceite térmico',
    machineAction: 'Tren de 3 columnas fraccionadoras a presión escalonada',
    outputLabel: 'Propano C3H8 + Butano C4H10 + Gasolina natural C5+',
    tempDisplay: '40-135 °C · 8-26 bar',
    tempC: 95,
  },
  {
    index: 4,
    code: '05',
    name: 'Esferas presurizadas de GLP y despacho',
    short: 'Esferas GLP',
    pasoId: 'glp-p5-esferas-despacho',
    startDeg: 288,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.red,
    cameraTarget: [4.85, 1.25, 0.2],
    cameraDir: [2.6, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'El propano y el butano en especificación se almacenan en esferas presurizadas para despacho por monoboya costera y abastecimiento interno (Argentina exportó 716 kt combinadas de GLP en 2024).',
    inputLabel: 'Propano C3H8 (12 bar) y Butano C4H10 (6 bar)',
    machineAction: 'Esferas presurizadas de acero + línea de embarque marítimo',
    outputLabel: 'GLP licuado grado exportación y consumo nacional',
    tempDisplay: '5-20 °C · 6-14 bar',
    tempC: 12,
  },
];

export const GLP_OVERVIEW_CAMERA: OverviewCameraDef3D = {
  target: [0.1, 1.35, 0.0],
  dir: [3.2, 4.1, 9.6],
  radius: 6.9,
  worldBox: [
    [-6.0, 0.0, -2.2],
    [6.1, 3.6, 2.2],
  ],
};

export const GLP_CALLOUT_META = [
  { n: 1, name: 'Slug catcher offshore (75 bar)', description: 'Separa agua libre y condensado pesado del gas húmedo austral.', phaseIndex: 0 },
  { n: 2, name: 'Línea de condensado C5+', description: 'Conduce hidrocarburos pesados estables hacia fraccionamiento.', phaseIndex: 0 },
  { n: 3, name: 'Tamices moleculares 4A', description: 'Secan el gas debajo de 0,1 ppmv H2O evitando hidratos criogénicos.', phaseIndex: 1 },
  { n: 4, name: 'Intercambiador cold box', description: 'Pre-enfría el gas seco aprovechando el frío del metano residual.', phaseIndex: 1 },
  { n: 5, name: 'Turbo-expansor (-95 °C)', description: 'Expande el gas condensando LGN y recuperando energía de eje.', phaseIndex: 2 },
  { n: 6, name: 'Inyección Gasoducto San Martín', description: 'Devuelve el metano seco (CH4 >94%) al troncal nacional.', phaseIndex: 2 },
  { n: 7, name: 'Desetanizadora y torre de propano', description: 'Separa etano liviano y destila propano comercial C3H8 (>95%).', phaseIndex: 3 },
  { n: 8, name: 'Torre desbutanizadora C4/C5+', description: 'Aísla butano comercial por tope y gasolina natural por fondo.', phaseIndex: 3 },
  { n: 9, name: 'Esferas presurizadas de GLP', description: 'Acopian propano y butano licuados bajo presión controlada.', phaseIndex: 4 },
  { n: 10, name: 'Ducto de despacho marítimo', description: 'Envía GLP hacia monoboya costera y mercado interno (716 kt exp. 24).', phaseIndex: 4 },
] as const;

export function buildGlpGasNaturalMechanism(kit: InkworksKit): MechanismModel3D {
  const { THREE: T, scene, M, part, ghost, ghostRings, stream } = kit;
  const root = new T.Group();
  scene.add(root);
  const casingsGroup = new T.Group();
  const flowsGroup = new T.Group();
  root.add(casingsGroup, flowsGroup);

  const deck = part(new T.BoxGeometry(12.6, 0.16, 4.4), M.concrete);
  deck.position.set(0.1, -0.08, 0);
  root.add(deck);

  // Fase 1: Slug catcher horizontal + separador
  const slugCatcher = part(new T.CylinderGeometry(0.45, 0.45, 2.1, 20), M.steel);
  slugCatcher.rotation.z = Math.PI / 2;
  slugCatcher.position.set(-4.65, 0.72, 0.2);
  root.add(slugCatcher);
  const condDrum = part(new T.CylinderGeometry(0.32, 0.32, 1.25, 16), M.alloy);
  condDrum.position.set(-3.7, 0.65, -0.85);
  root.add(condDrum);

  // Fase 2: Torres tamices moleculares 4A + cold box
  const sieveA = part(new T.CylinderGeometry(0.36, 0.36, 2.35, 18), M.emerald);
  sieveA.position.set(-2.5, 1.18, 0.35);
  root.add(sieveA);
  const sieveB = part(new T.CylinderGeometry(0.36, 0.36, 2.35, 18), M.emerald);
  sieveB.position.set(-1.65, 1.18, 0.35);
  root.add(sieveB);
  const coldBox = part(new T.BoxGeometry(0.95, 1.85, 0.9), M.seaBed);
  coldBox.position.set(-1.1, 0.92, -0.75);
  root.add(coldBox);

  // Fase 3: Turbo-expansor con rotor visible en corte
  const expCase = ghost(new T.CylinderGeometry(0.48, 0.48, 1.35, 18));
  expCase.rotation.z = Math.PI / 2;
  expCase.position.set(0.25, 0.95, 0.15);
  casingsGroup.add(expCase);
  const expBase = part(new T.BoxGeometry(1.4, 0.42, 0.95), M.dark);
  expBase.position.set(0.25, 0.21, 0.15);
  root.add(expBase);
  const expRotor = new T.Group();
  expRotor.position.set(0.25, 0.95, 0.15);
  for (let i = 0; i < 3; i++) {
    const wheel = part(new T.CylinderGeometry(0.34 - i * 0.04, 0.34 - i * 0.04, 0.08, 16), M.cobalt);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.x = -0.35 + i * 0.35;
    expRotor.add(wheel);
  }
  root.add(expRotor);

  // Fase 4: Tren de 3 columnas fraccionadoras
  const colC2 = part(new T.CylinderGeometry(0.34, 0.34, 2.75, 18), M.steel);
  colC2.position.set(1.75, 1.38, -0.2);
  root.add(colC2);
  const colC3 = part(new T.CylinderGeometry(0.38, 0.38, 3.2, 18), M.ochreBath);
  colC3.position.set(2.6, 1.6, -0.2);
  root.add(colC3);
  const colC4 = part(new T.CylinderGeometry(0.36, 0.36, 2.85, 18), M.copper);
  colC4.position.set(3.45, 1.42, -0.2);
  root.add(colC4);

  // Fase 5: 2 esferas presurizadas de GLP
  const sphereC3 = part(new T.SphereGeometry(0.68, 22, 16), M.ceramic);
  sphereC3.position.set(4.75, 1.08, -0.58);
  root.add(sphereC3);
  const sphereC4 = part(new T.SphereGeometry(0.64, 22, 16), M.alloy);
  sphereC4.position.set(5.15, 1.02, 0.85);
  root.add(sphereC4);

  // Flujos animados
  const sWetGas = stream(
    [
      new T.Vector3(-5.7, 0.72, 0.2),
      new T.Vector3(-4.65, 0.72, 0.2),
      new T.Vector3(-2.5, 2.2, 0.35),
      new T.Vector3(-1.1, 1.7, -0.75),
      new T.Vector3(0.25, 0.95, 0.15),
    ],
    ATLAS_PHASE_HUES.cobalt,
    { count: 24, size: 7.5, parent: flowsGroup }
  );
  const sLgn = stream(
    [
      new T.Vector3(0.25, 0.85, 0.15),
      new T.Vector3(1.75, 1.4, -0.2),
      new T.Vector3(2.6, 2.8, -0.2),
      new T.Vector3(3.45, 2.5, -0.2),
      new T.Vector3(4.75, 1.45, -0.58),
      new T.Vector3(5.15, 1.35, 0.85),
    ],
    ATLAS_PHASE_HUES.ochre,
    { count: 24, size: 7.5, parent: flowsGroup }
  );
  const sSalesGas = stream(
    [
      new T.Vector3(0.25, 1.45, 0.15),
      new T.Vector3(0.25, 2.95, 1.15),
      new T.Vector3(3.2, 2.95, 1.35),
      new T.Vector3(5.8, 2.95, 1.35),
    ],
    ATLAS_PHASE_HUES.emerald,
    { count: 20, size: 7.2, parent: flowsGroup }
  );
  casingsGroup.add(ghostRings(sSalesGas.curve, 0.11, 7));

  const callouts: CalloutAnchorDef[] = [
    { ...GLP_CALLOUT_META[0], at: (v) => v.set(-4.65, 1.25, 0.2) },
    { ...GLP_CALLOUT_META[1], at: (v) => v.set(-3.7, 1.32, -0.85) },
    { ...GLP_CALLOUT_META[2], at: (v) => v.set(-2.05, 2.38, 0.35) },
    { ...GLP_CALLOUT_META[3], at: (v) => v.set(-1.1, 1.9, -0.75) },
    { ...GLP_CALLOUT_META[4], at: (v) => v.set(0.25, 1.48, 0.15) },
    { ...GLP_CALLOUT_META[5], at: (v) => v.set(1.6, 2.95, 1.25) },
    { ...GLP_CALLOUT_META[6], at: (v) => v.set(2.6, 3.22, -0.2) },
    { ...GLP_CALLOUT_META[7], at: (v) => v.set(3.45, 2.85, -0.2) },
    { ...GLP_CALLOUT_META[8], at: (v) => v.set(4.75, 1.8, -0.58) },
    { ...GLP_CALLOUT_META[9], at: (v) => v.set(5.15, 1.68, 0.85) },
  ];

  let lastTheta = 0;
  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dRaw) < 180 ? Math.max(0, dRaw) : 0;
    const phi = mod(thetaDeg, GLP_CYCLE_DEG);
    const rad = phi * D2R;

    expRotor.rotation.x = rad * 10;
    const rate = stepDeg * (0.0042 + 0.002 * loadFactor);
    sWetGas.advance(rate * 1.1);
    sLgn.advance(rate * 1.05);
    sSalesGas.advance(rate * 1.15);

    const p = Math.min(4, Math.floor(phi / 72));
    sWetGas.mat.opacity = p <= 2 ? 1.0 : 0.48;
    sLgn.mat.opacity = p >= 2 ? 1.0 : 0.48;
    sSalesGas.mat.opacity = p === 2 || p === 4 ? 1.0 : 0.48;
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
