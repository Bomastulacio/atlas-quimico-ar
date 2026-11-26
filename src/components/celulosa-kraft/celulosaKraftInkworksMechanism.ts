import {
  ATLAS_PHASE_HUES,
  D2R,
  mod,
  type CalloutAnchorDef,
  type InkworksKit,
} from '@/lib/inkworks-kit';
import type { MechanismModel3D, OverviewCameraDef3D, ProcessPhaseDef3D } from '../ProcessAnatomy3DPlayer';

export const CELULOSA_KRAFT_CYCLE_DEG = 360;

export const CELULOSA_KRAFT_PHASES: ProcessPhaseDef3D[] = [
  {
    index: 0,
    code: '01',
    name: 'Patio de rollizos y chipeado de pino',
    short: 'Chipeado pino',
    pasoId: 'kraft-p1-chipeado',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [-4.6, 1.0, 0.15],
    cameraDir: [2.7, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'En Puerto Esperanza (Misiones), los rollizos de pino (4,5 m3/t ADt) pasan por el tambor descortezador y la chipeadora generando astillas calibradas; la corteza alimenta la caldera de biomasa.',
    inputLabel: '4,5 m3 de rollizos de pino forestal por tonelada de pulpa',
    machineAction: 'Tambor descortezador + chipeadora + cinta cerrada de chips',
    outputLabel: '2,10 t secas de chips calibrados + 0,35 t de corteza combustible',
    tempDisplay: 'Ambiente',
    tempC: 25,
  },
  {
    index: 1,
    code: '02',
    name: 'Digestor continuo Kraft (NaOH + Na2S)',
    short: 'Digestor Kraft',
    pasoId: 'kraft-p2-digestion',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.red,
    cameraTarget: [-1.8, 1.85, -0.2],
    cameraDir: [2.6, 3.2, 7.5],
    cameraRadius: 3.1,
    summary:
      'Dentro del digestor continuo a 168 °C y 9 bar, el licor blanco alcalino (hidróxido y sulfuro de sodio) disuelve la lignina separando intactas las fibras largas de celulosa del licor negro.',
    inputLabel: '2,10 t secas de chips + licor blanco alcalino regenerado',
    machineAction: 'Torre de digestión continua a presión y vapor',
    outputLabel: '1,05 t pulpa marrón cruda + 1,50 t sólidos en licor negro',
    tempDisplay: '165-170 °C · 9 bar',
    tempC: 168,
  },
  {
    index: 2,
    code: '03',
    name: 'Deslignificación O2 y blanqueo ECF',
    short: 'Blanqueo ECF',
    pasoId: 'kraft-p3-blanqueo-ecf',
    startDeg: 144,
    endDeg: 216,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [0.85, 1.45, -0.35],
    cameraDir: [2.5, 3.2, 7.2],
    cameraRadius: 3.0,
    summary:
      'La pulpa marrón se lava y atraviesa torres de deslignificación con oxígeno y blanqueo libre de cloro elemental (ECF con ClO2 y H2O2) alcanzando blancura superior al 89% ISO.',
    inputLabel: '1,05 t pulpa marrón lavada + O2 + ClO2 + H2O2',
    machineAction: 'Torres secuenciales de lavado y blanqueo ECF',
    outputLabel: '1,00 t ADt de pulpa Kraft fibra larga blanqueada',
    tempDisplay: '70-95 °C · 4 bar',
    tempC: 85,
  },
  {
    index: 3,
    code: '04',
    name: 'Secado de hoja y enfardado ADt',
    short: 'Secado y fardos',
    pasoId: 'kraft-p4-secado-fardos',
    startDeg: 216,
    endDeg: 288,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [3.65, 1.05, -0.55],
    cameraDir: [2.5, 3.1, 7.2],
    cameraRadius: 3.0,
    summary:
      'La suspensión blanqueada se drena en mesa formadora, se prensa y seca en túnel de aire caliente hasta 90% de sequedad comercial, cortándose en fardos de fibra larga listos para papeleras.',
    inputLabel: 'Suspensión acuosa de celulosa blanqueada ECF',
    machineAction: 'Mesa formadora + túnel secador + prensa enfardadora',
    outputLabel: '1,00 t ADt en fardos de celulosa Kraft blanqueada',
    tempDisplay: '110-130 °C',
    tempC: 120,
  },
  {
    index: 4,
    code: '05',
    name: 'Caldera recuperadora y ciclo de cal',
    short: 'Recuperación',
    pasoId: 'kraft-p5-recuperacion-caustificacion',
    startDeg: 288,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [3.6, 1.45, 0.95],
    cameraDir: [2.7, 3.3, 7.5],
    cameraRadius: 3.2,
    summary:
      'El licor negro concentrado se quema en la caldera recuperadora generando energía eléctrica y vapor renovables, mientras la caustificación (Na2CO3 + Ca(OH)2 -> 2 NaOH + CaCO3) cierra el reciclo de licor blanco (>96%).',
    inputLabel: '1,50 t sólidos de licor negro + cal del horno cerrado',
    machineAction: 'Caldera recuperadora + caustificador + horno rotativo de cal',
    outputLabel: 'Licor blanco reciclado (>96%) + vapor y electricidad renovable',
    tempDisplay: '900-1.050 °C · 65 bar',
    tempC: 980,
  },
];

export const CELULOSA_KRAFT_OVERVIEW_CAMERA: OverviewCameraDef3D = {
  target: [0.0, 1.35, 0.05],
  dir: [3.2, 4.1, 9.6],
  radius: 6.9,
  worldBox: [
    [-5.9, 0.0, -2.1],
    [5.9, 3.7, 2.2],
  ],
};

export const CELULOSA_KRAFT_CALLOUT_META = [
  { n: 1, name: 'Tambor descortezador de pino', description: 'Retira la corteza de los rollizos forestales (4,5 m3/t ADt).', phaseIndex: 0 },
  { n: 2, name: 'Chipeadora y cinta cerrada', description: 'Produce chips uniformes de fibra larga hacia el digestor.', phaseIndex: 0 },
  { n: 3, name: 'Digestor continuo Kraft (168 °C)', description: 'Disuelve la lignina en licor blanco alcalino liberando la celulosa.', phaseIndex: 1 },
  { n: 4, name: 'Línea de extracción de licor negro', description: 'Envía la lignina disuelta y sales de sodio a la caldera recuperadora.', phaseIndex: 1 },
  { n: 5, name: 'Torres de blanqueo ECF', description: 'Secuencia O2 + ClO2 + H2O2 sin cloro elemental hasta >89% ISO.', phaseIndex: 2 },
  { n: 6, name: 'Lavador de pulpa blanqueada', description: 'Purifica las fibras blancas antes de la mesa formadora.', phaseIndex: 2 },
  { n: 7, name: 'Túnel secador de hoja de pulpa', description: 'Evapora el agua hasta 90% de sequedad comercial (ADt).', phaseIndex: 3 },
  { n: 8, name: 'Fardos de celulosa Kraft', description: 'Fibra larga de alta resistencia mecánica lista para papeleras.', phaseIndex: 3 },
  { n: 9, name: 'Caldera recuperadora (cogeneración)', description: 'Quema lignina generando vapor a 65 bar y electricidad renovable.', phaseIndex: 4 },
  { n: 10, name: 'Caustificador y horno de cal', description: 'Regenera >96% del licor blanco (NaOH + Na2S) en ciclo cerrado.', phaseIndex: 4 },
] as const;

export function buildCelulosaKraftMechanism(kit: InkworksKit): MechanismModel3D {
  const { THREE: T, scene, M, part, ghost, ghostRings, stream } = kit;
  const root = new T.Group();
  scene.add(root);
  const casingsGroup = new T.Group();
  const flowsGroup = new T.Group();
  root.add(casingsGroup, flowsGroup);

  const deck = part(new T.BoxGeometry(12.4, 0.16, 4.3), M.concrete);
  deck.position.set(0.0, -0.08, 0);
  root.add(deck);

  // Fase 1: Descortezador + chipeadora
  const debarker = part(new T.CylinderGeometry(0.45, 0.45, 1.6, 18), M.ochreBath);
  debarker.rotation.z = Math.PI / 2;
  debarker.position.set(-4.85, 0.65, 0.2);
  root.add(debarker);
  const chipper = part(new T.BoxGeometry(0.85, 0.85, 0.85), M.steel);
  chipper.position.set(-3.45, 0.48, 0.2);
  root.add(chipper);

  // Fase 2: Digestor continuo alto
  const digester = part(new T.CylinderGeometry(0.55, 0.62, 3.35, 22), M.refractory);
  digester.position.set(-1.75, 1.68, -0.25);
  root.add(digester);

  // Fase 3: Torres de blanqueo ECF
  const b1 = part(new T.CylinderGeometry(0.38, 0.38, 2.5, 18), M.cobalt);
  b1.position.set(0.35, 1.25, -0.45);
  root.add(b1);
  const b2 = part(new T.CylinderGeometry(0.38, 0.38, 2.5, 18), M.cobalt);
  b2.position.set(1.25, 1.25, -0.45);
  root.add(b2);

  // Fase 4: Túnel secador + fardos blancos
  const dryer = part(new T.BoxGeometry(1.9, 1.05, 0.95), M.ceramic);
  dryer.position.set(3.35, 0.65, -0.65);
  root.add(dryer);
  const dryerCase = ghost(new T.BoxGeometry(2.15, 1.25, 1.15));
  dryerCase.position.set(3.35, 0.65, -0.65);
  casingsGroup.add(dryerCase);
  const bale1 = part(new T.BoxGeometry(0.55, 0.48, 0.52), M.ceramic);
  bale1.position.set(4.85, 0.28, -0.78);
  root.add(bale1);
  const bale2 = part(new T.BoxGeometry(0.55, 0.48, 0.52), M.ceramic);
  bale2.position.set(4.85, 0.28, -0.18);
  root.add(bale2);

  // Fase 5: Caldera recuperadora + horno rotativo de cal
  const recBoiler = part(new T.BoxGeometry(1.45, 2.45, 1.15), M.emerald);
  recBoiler.position.set(2.55, 1.22, 0.95);
  root.add(recBoiler);
  const limeKiln = part(new T.CylinderGeometry(0.34, 0.34, 2.1, 18), M.steel);
  limeKiln.rotation.z = Math.PI / 2;
  limeKiln.position.set(4.65, 0.72, 0.95);
  root.add(limeKiln);

  // Flujos animados
  const sChips = stream(
    [
      new T.Vector3(-4.85, 0.85, 0.2),
      new T.Vector3(-3.45, 0.95, 0.2),
      new T.Vector3(-2.5, 2.45, -0.1),
      new T.Vector3(-1.75, 3.15, -0.25),
    ],
    ATLAS_PHASE_HUES.ochre,
    { count: 18, size: 7.5, parent: flowsGroup }
  );
  const sPulp = stream(
    [
      new T.Vector3(-1.25, 1.6, -0.3),
      new T.Vector3(0.35, 2.15, -0.45),
      new T.Vector3(1.25, 2.15, -0.45),
      new T.Vector3(3.35, 0.85, -0.65),
      new T.Vector3(4.85, 0.55, -0.5),
    ],
    ATLAS_PHASE_HUES.cobalt,
    { count: 22, size: 7.5, parent: flowsGroup }
  );
  const sLiquorLoop = stream(
    [
      new T.Vector3(-1.75, 0.45, 0.35),
      new T.Vector3(0.4, 0.45, 0.95),
      new T.Vector3(2.55, 0.95, 0.95),
      new T.Vector3(4.65, 0.72, 0.95),
      new T.Vector3(4.65, 0.35, 1.72),
      new T.Vector3(-1.75, 0.35, 1.72),
      new T.Vector3(-1.75, 1.25, 0.35),
    ],
    ATLAS_PHASE_HUES.emerald,
    { count: 28, size: 7.2, parent: flowsGroup }
  );
  casingsGroup.add(ghostRings(sLiquorLoop.curve, 0.11, 8));

  const callouts: CalloutAnchorDef[] = [
    { ...CELULOSA_KRAFT_CALLOUT_META[0], at: (v) => v.set(-4.85, 1.15, 0.2) },
    { ...CELULOSA_KRAFT_CALLOUT_META[1], at: (v) => v.set(-3.45, 1.0, 0.2) },
    { ...CELULOSA_KRAFT_CALLOUT_META[2], at: (v) => v.set(-1.75, 3.3, -0.25) },
    { ...CELULOSA_KRAFT_CALLOUT_META[3], at: (v) => v.set(-0.6, 0.6, 0.8) },
    { ...CELULOSA_KRAFT_CALLOUT_META[4], at: (v) => v.set(0.35, 2.55, -0.45) },
    { ...CELULOSA_KRAFT_CALLOUT_META[5], at: (v) => v.set(1.25, 2.55, -0.45) },
    { ...CELULOSA_KRAFT_CALLOUT_META[6], at: (v) => v.set(3.35, 1.28, -0.65) },
    { ...CELULOSA_KRAFT_CALLOUT_META[7], at: (v) => v.set(4.85, 0.6, -0.5) },
    { ...CELULOSA_KRAFT_CALLOUT_META[8], at: (v) => v.set(2.55, 2.48, 0.95) },
    { ...CELULOSA_KRAFT_CALLOUT_META[9], at: (v) => v.set(4.65, 1.15, 0.95) },
  ];

  let lastTheta = 0;
  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dRaw) < 180 ? Math.max(0, dRaw) : 0;
    const phi = mod(thetaDeg, CELULOSA_KRAFT_CYCLE_DEG);
    const rad = phi * D2R;

    debarker.rotation.x = rad * 4;
    limeKiln.rotation.x = -rad * 3;
    const rate = stepDeg * (0.0042 + 0.002 * loadFactor);
    sChips.advance(rate * 1.05);
    sPulp.advance(rate * 1.1);
    sLiquorLoop.advance(rate * 1.0);

    const p = Math.min(4, Math.floor(phi / 72));
    sChips.mat.opacity = p <= 1 ? 1.0 : 0.48;
    sPulp.mat.opacity = p >= 1 && p <= 3 ? 1.0 : 0.48;
    sLiquorLoop.mat.opacity = p === 1 || p === 4 ? 1.0 : 0.48;
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
