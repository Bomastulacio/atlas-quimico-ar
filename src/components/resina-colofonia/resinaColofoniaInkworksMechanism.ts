import {
  ATLAS_PHASE_HUES,
  D2R,
  mod,
  type CalloutAnchorDef,
  type InkworksKit,
} from '@/lib/inkworks-kit';
import type { MechanismModel3D, OverviewCameraDef3D, ProcessPhaseDef3D } from '../ProcessAnatomy3DPlayer';

export const RESINA_CYCLE_DEG = 360;

export const RESINA_PHASES: ProcessPhaseDef3D[] = [
  {
    index: 0,
    code: '01',
    name: 'Recepción y fusión de oleorresina de pino',
    short: 'Fusión miera',
    pasoId: 'res-p1-acopio-fusion',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [-4.55, 1.0, 0.15],
    cameraDir: [2.7, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'En Gobernador Virasoro (Depto. Santo Tomé, Corrientes), la oleorresina cosechada de pinares de Pinus elliottii se funde a 92 °C con vapor indirecto y se diluye en trementina reciclada.',
    inputLabel: '1,43 t de miera de Pinus elliottii + trementina de reciclo',
    machineAction: 'Tanque fundidor encamisado con agitación lenta a 92 °C',
    outputLabel: 'Solución resinosa fluida bombeable hacia filtración',
    tempDisplay: '90-95 °C',
    tempC: 92,
  },
  {
    index: 1,
    code: '02',
    name: 'Filtración cerrada y lavado acuoso',
    short: 'Filtración',
    pasoId: 'res-p2-filtracion-lavado',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [-1.9, 1.05, 0.1],
    cameraDir: [2.6, 3.2, 7.2],
    cameraRadius: 2.9,
    summary:
      'Un filtro prensa presurizado a 2,5 bar separa acículas y corteza; luego el lavado acuoso remueve sales e impurezas solubles para preservar el color claro grado WW/WG.',
    inputLabel: 'Miera fluida + agua caliente de lavado',
    machineAction: 'Filtro prensa cerrado + tanque lavador agitado',
    outputLabel: 'Emulsión lavada libre de sólidos vegetales',
    tempDisplay: '85-90 °C',
    tempC: 88,
  },
  {
    index: 2,
    code: '03',
    name: 'Decantación continua agua-resina',
    short: 'Decantación',
    pasoId: 'res-p3-decantacion',
    startDeg: 144,
    endDeg: 216,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [0.35, 1.05, 0.1],
    cameraDir: [2.5, 3.2, 7.2],
    cameraRadius: 2.9,
    summary:
      'En el decantador gravitacional a 82 °C se separa la fase acuosa inferior de la oleorresina anhidra clarificada antes de entrar al precalentador de destilación.',
    inputLabel: 'Emulsión lavada resina-agua a 85 °C',
    machineAction: 'Decantador horizontal continuo + intercambiador precalentador',
    outputLabel: 'Oleorresina clarificada precalentada a 145 °C',
    tempDisplay: '80-145 °C',
    tempC: 110,
  },
  {
    index: 3,
    code: '04',
    name: 'Destilación continua por arrastre de vapor',
    short: 'Columna vapor',
    pasoId: 'res-p4-destilacion-vapor',
    startDeg: 216,
    endDeg: 288,
    color: ATLAS_PHASE_HUES.red,
    cameraTarget: [2.35, 1.75, 0.05],
    cameraDir: [2.6, 3.3, 7.5],
    cameraRadius: 3.1,
    summary:
      'La columna destiladora opera a 175 °C con inyección de vapor vivo: los monoterpenos volátiles (trementina C10H16) ascienden por cabeza mientras la colofonia fundida sale por fondo.',
    inputLabel: 'Oleorresina clarificada + vapor vivo de arrastre',
    machineAction: 'Columna de destilación continua con platos y rehervidor',
    outputLabel: '1,00 t de colofonia fundida + 0,25 t vapor de trementina',
    tempDisplay: '165-175 °C',
    tempC: 175,
  },
  {
    index: 4,
    code: '05',
    name: 'Condensación de trementina y escamado de colofonia',
    short: 'Productos',
    pasoId: 'res-p5-condensacion-envasado',
    startDeg: 288,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [4.65, 1.05, 0.05],
    cameraDir: [2.6, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'El condensador y vaso florentino recuperan trementina comercial (reciclando una fracción a fusión) mientras la banda enfriadora solidifica la colofonia vítrea grado exportación.',
    inputLabel: 'Colofonia fundida (175 °C) + vapores de trementina',
    machineAction: 'Condensador tubular + vaso florentino + banda escamadora',
    outputLabel: 'Colofonia HS 3806.10 (8.714 t) + Trementina HS 3805.10 (5.043 t)',
    tempDisplay: '35-45 °C',
    tempC: 40,
  },
];

export const RESINA_OVERVIEW_CAMERA: OverviewCameraDef3D = {
  target: [0.05, 1.25, 0.0],
  dir: [3.2, 4.0, 9.5],
  radius: 6.8,
  worldBox: [
    [-5.9, 0.0, -2.0],
    [6.0, 3.6, 2.0],
  ],
};

export const RESINA_CALLOUT_META = [
  { n: 1, name: 'Tolva de miera de Pinus elliottii', description: 'Recibe oleorresina cosechada en bosques de Santo Tomé y Virasoro.', phaseIndex: 0 },
  { n: 2, name: 'Fundidor encamisado a 92 °C', description: 'Disuelve la resina cruda con trementina reciclada.', phaseIndex: 0 },
  { n: 3, name: 'Filtro prensa cerrado', description: 'Retiene corteza y acículas vegetales antes del lavado.', phaseIndex: 1 },
  { n: 4, name: 'Lavador agitado acuoso', description: 'Elimina sales hidrosolubles para mejorar el color Gardner.', phaseIndex: 1 },
  { n: 5, name: 'Decantador continuo agua-resina', description: 'Separa fase acuosa ácida de la oleorresina anhidra.', phaseIndex: 2 },
  { n: 6, name: 'Precalentador tubular (145 °C)', description: 'Calienta la carga clarificada antes de ingresar a la columna.', phaseIndex: 2 },
  { n: 7, name: 'Columna de destilación con vapor', description: 'Fracciona a 175 °C trementina por cabeza y colofonia por fondo.', phaseIndex: 3 },
  { n: 8, name: 'Rehervidor e inyección de vapor', description: 'Aporta energía térmica y vapor vivo de arrastre.', phaseIndex: 3 },
  { n: 9, name: 'Condensador y tanque trementina', description: 'Recupera C10H16 comercial y recicla diluyente al fundidor.', phaseIndex: 4 },
  { n: 10, name: 'Banda enfriadora de colofonia', description: 'Solidifica colofonia grado WW/WG en escamas y tambores.', phaseIndex: 4 },
] as const;

export function buildResinaColofoniaMechanism(kit: InkworksKit): MechanismModel3D {
  const { THREE: T, scene, M, part, ghost, ghostRings, stream } = kit;
  const root = new T.Group();
  scene.add(root);
  const casingsGroup = new T.Group();
  const flowsGroup = new T.Group();
  root.add(casingsGroup, flowsGroup);

  const deck = part(new T.BoxGeometry(12.4, 0.16, 4.2), M.concrete);
  deck.position.set(0.05, -0.08, 0);
  root.add(deck);

  // Fase 1: Tolva + fundidor
  const hopper = part(new T.CylinderGeometry(0.48, 0.25, 0.95, 16), M.ochreBath);
  hopper.position.set(-5.0, 0.72, 0.25);
  root.add(hopper);
  const melter = part(new T.CylinderGeometry(0.54, 0.54, 1.35, 18), M.steel);
  melter.position.set(-3.7, 0.68, 0.25);
  root.add(melter);
  const melterShaft = part(new T.CylinderGeometry(0.06, 0.06, 1.55, 10), M.dark);
  melterShaft.position.set(-3.7, 0.85, 0.25);
  root.add(melterShaft);

  // Fase 2: Filtro prensa + lavador
  const filterPress = part(new T.BoxGeometry(1.15, 0.92, 0.88), M.alloy);
  filterPress.position.set(-2.2, 0.48, 0.2);
  root.add(filterPress);
  const washer = part(new T.CylinderGeometry(0.46, 0.46, 1.28, 18), M.emerald);
  washer.position.set(-0.95, 0.64, 0.2);
  root.add(washer);

  // Fase 3: Decantador horizontal + precalentador
  const decanter = part(new T.CylinderGeometry(0.4, 0.4, 1.5, 18), M.cobalt);
  decanter.rotation.z = Math.PI / 2;
  decanter.position.set(0.45, 0.68, 0.15);
  root.add(decanter);
  const preheater = part(new T.CylinderGeometry(0.24, 0.24, 1.15, 16), M.copper);
  preheater.rotation.z = Math.PI / 2;
  preheater.position.set(0.95, 1.38, -0.45);
  root.add(preheater);

  // Fase 4: Columna destiladora + carcasa ghost + rehervidor
  const column = part(new T.CylinderGeometry(0.44, 0.44, 3.1, 20), M.steel);
  column.position.set(2.35, 1.58, 0.05);
  root.add(column);
  const colCase = ghost(new T.CylinderGeometry(0.56, 0.56, 3.2, 16));
  colCase.position.set(2.35, 1.58, 0.05);
  casingsGroup.add(colCase);
  const reboiler = part(new T.CylinderGeometry(0.26, 0.26, 0.95, 14), M.refractory);
  reboiler.rotation.z = Math.PI / 2;
  reboiler.position.set(2.35, 0.42, 0.85);
  root.add(reboiler);

  // Fase 5: Condensador trementina + banda escamadora colofonia
  const condenser = part(new T.CylinderGeometry(0.32, 0.32, 1.1, 16), M.cobalt);
  condenser.position.set(4.15, 1.45, -0.75);
  root.add(condenser);
  const turpTank = part(new T.CylinderGeometry(0.42, 0.42, 1.05, 18), M.emerald);
  turpTank.position.set(5.25, 0.54, -0.75);
  root.add(turpTank);
  const flaker = part(new T.BoxGeometry(1.75, 0.48, 0.95), M.ochreBath);
  flaker.position.set(4.65, 0.36, 0.65);
  root.add(flaker);

  // Flujos animados
  const sMain = stream(
    [
      new T.Vector3(-5.0, 0.95, 0.25),
      new T.Vector3(-3.7, 0.95, 0.25),
      new T.Vector3(-2.2, 0.85, 0.2),
      new T.Vector3(-0.95, 0.95, 0.2),
      new T.Vector3(0.45, 0.95, 0.15),
      new T.Vector3(2.35, 1.45, 0.05),
      new T.Vector3(4.65, 0.68, 0.65),
    ],
    ATLAS_PHASE_HUES.ochre,
    { count: 26, size: 7.4, parent: flowsGroup }
  );
  const sTurp = stream(
    [
      new T.Vector3(2.35, 3.05, 0.05),
      new T.Vector3(4.15, 1.95, -0.75),
      new T.Vector3(5.25, 1.05, -0.75),
    ],
    ATLAS_PHASE_HUES.emerald,
    { count: 16, size: 7.0, parent: flowsGroup }
  );
  const sRecycle = stream(
    [
      new T.Vector3(5.25, 0.35, -0.75),
      new T.Vector3(5.25, 0.35, -1.65),
      new T.Vector3(-3.7, 0.35, -1.65),
      new T.Vector3(-3.7, 0.72, -0.25),
    ],
    ATLAS_PHASE_HUES.cobalt,
    { count: 18, size: 6.6, parent: flowsGroup }
  );
  casingsGroup.add(ghostRings(sRecycle.curve, 0.09, 6));

  const callouts: CalloutAnchorDef[] = [
    { ...RESINA_CALLOUT_META[0], at: (v) => v.set(-5.0, 1.25, 0.25) },
    { ...RESINA_CALLOUT_META[1], at: (v) => v.set(-3.7, 1.48, 0.25) },
    { ...RESINA_CALLOUT_META[2], at: (v) => v.set(-2.2, 1.08, 0.2) },
    { ...RESINA_CALLOUT_META[3], at: (v) => v.set(-0.95, 1.38, 0.2) },
    { ...RESINA_CALLOUT_META[4], at: (v) => v.set(0.45, 1.15, 0.15) },
    { ...RESINA_CALLOUT_META[5], at: (v) => v.set(0.95, 1.68, -0.45) },
    { ...RESINA_CALLOUT_META[6], at: (v) => v.set(2.35, 3.18, 0.05) },
    { ...RESINA_CALLOUT_META[7], at: (v) => v.set(2.35, 0.75, 0.85) },
    { ...RESINA_CALLOUT_META[8], at: (v) => v.set(4.15, 2.08, -0.75) },
    { ...RESINA_CALLOUT_META[9], at: (v) => v.set(4.65, 0.85, 0.65) },
  ];

  let lastTheta = 0;
  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dRaw) < 180 ? Math.max(0, dRaw) : 0;
    const phi = mod(thetaDeg, RESINA_CYCLE_DEG);
    const rad = phi * D2R;

    melterShaft.rotation.y = rad * 8;
    const rate = stepDeg * (0.0042 + 0.002 * loadFactor);
    sMain.advance(rate * 1.05);
    sTurp.advance(rate * 1.15);
    sRecycle.advance(rate * 0.95);

    const p = Math.min(4, Math.floor(phi / 72));
    sMain.mat.opacity = p <= 3 ? 1.0 : 0.55;
    sTurp.mat.opacity = p >= 3 ? 1.0 : 0.45;
    sRecycle.mat.opacity = p === 0 || p === 4 ? 1.0 : 0.45;
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
