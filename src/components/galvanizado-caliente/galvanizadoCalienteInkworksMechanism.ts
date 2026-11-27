import {
  ATLAS_PHASE_HUES,
  mod,
  type CalloutAnchorDef,
  type InkworksKit,
} from '@/lib/inkworks-kit';
import type { MechanismModel3D, OverviewCameraDef3D, ProcessPhaseDef3D } from '../ProcessAnatomy3DPlayer';

export const GALVANIZADO_CYCLE_DEG = 360;

export const GALVANIZADO_PHASES: ProcessPhaseDef3D[] = [
  {
    index: 0,
    code: '01',
    name: 'Desengrase alcalino y enjuague inicial',
    short: 'Desengrase',
    pasoId: 'gic-p1-desengrase-enjuague',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [-4.55, 1.15, 0.15],
    cameraDir: [2.7, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'En General Rodríguez (Buenos Aires), las estructuras de acero ingresan izadas por puentes grúa de 12 t a la batea de desengrase alcalino (50-70 °C) y enjuague para remover aceites y grasas de laminado.',
    inputLabel: 'Piezas y estructuras de acero negro (hasta 13 m de largo)',
    machineAction: 'Puente grúa de 12 t + batea desengrasante alcalina + enjuague',
    outputLabel: 'Acero libre de aceites con humectabilidad verificada',
    tempDisplay: '50-70 °C',
    tempC: 60,
  },
  {
    index: 1,
    code: '02',
    name: 'Decapado ácido en HCl y neutralización',
    short: 'Decapado HCl',
    pasoId: 'gic-p2-decapado-hcl',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.red,
    cameraTarget: [-1.95, 1.1, 0.15],
    cameraDir: [2.6, 3.2, 7.2],
    cameraRadius: 3.0,
    summary:
      'La inmersión en solución de ácido clorhídrico disuelve cascarilla y óxidos (Fe2O3 + 6 HCl -> 2 FeCl3 + 3 H2O), dejando una superficie químicamente limpia antes del enjuague neutralizador.',
    inputLabel: 'Acero desengrasado + baño de ácido clorhídrico (HCl)',
    machineAction: 'Batería de bateas ácidas de decapado + campana de extracción',
    outputLabel: 'Acero químicamente limpio + vapores ácidos a lavador',
    tempDisplay: '20-35 °C',
    tempC: 25,
  },
  {
    index: 2,
    code: '03',
    name: 'Fluxado en sales y horno de secado',
    short: 'Flux y secado',
    pasoId: 'gic-p3-fluxado-secado',
    startDeg: 144,
    endDeg: 216,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [0.35, 1.15, 0.15],
    cameraDir: [2.6, 3.2, 7.2],
    cameraRadius: 2.9,
    summary:
      'El baño flux (ZnCl2·2NH4Cl) evita la reoxidación y facilita el mojado del zinc; luego el horno de secado (60-100 °C) elimina toda humedad superficial antes de sumergir la carga.',
    inputLabel: 'Acero decapado + solución flux de sales dobles',
    machineAction: 'Batea de fluxado + horno precalentador de secado (60-100 °C)',
    outputLabel: 'Acero fluxado, seco y precalentado listo para zincado',
    tempDisplay: '60-100 °C',
    tempC: 80,
  },
  {
    index: 3,
    code: '04',
    name: 'Inmersión en baño de zinc fundido (450 °C)',
    short: 'Cuba Zn 450 °C',
    pasoId: 'gic-p4-inmersion-zinc',
    startDeg: 216,
    endDeg: 288,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [2.55, 1.35, 0.05],
    cameraDir: [2.6, 3.3, 7.4],
    cameraRadius: 3.1,
    summary:
      'La cuba principal (13,0 x 1,8 x 3,0 m) y el horno auxiliar (4,5 x 1,4 x 2,2 m) operan a 450 °C controlados automáticamente: el zinc difunde en el acero formando capas intermetálicas Fe-Zn de alta resistencia.',
    inputLabel: 'Acero seco + baño de zinc fundido SHG (450 °C)',
    machineAction: 'Horno de inmersión de 13 m + campana hacia lavador de humos',
    outputLabel: 'Acero con aleación metalúrgica Fe-Zn + cenizas reciclables',
    tempDisplay: '450 °C (control auto)',
    tempC: 450,
  },
  {
    index: 4,
    code: '05',
    name: 'Enfriamiento, laboratorio ISO y lavado ambiental',
    short: 'Enfriado y QC',
    pasoId: 'gic-p5-enfriamiento-control',
    startDeg: 288,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [4.7, 1.15, 0.05],
    cameraDir: [2.6, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'Tras el enfriamiento al agua o aire, el laboratorio propio controla espesor, adherencia y aspecto bajo ISO 9001:2015 e ISO 14001:2015, mientras las plantas de efluentes y lavado de humos depuran emisiones.',
    inputLabel: 'Piezas galvanizadas a 450 °C + humos/efluentes captados',
    machineAction: 'Pileta de enfriado + laboratorio de ensayos + torre lavadora',
    outputLabel: 'Estructuras galvanizadas certificadas (20 a 50 años de vida útil)',
    tempDisplay: '20-45 °C',
    tempC: 30,
  },
];

export const GALVANIZADO_OVERVIEW_CAMERA: OverviewCameraDef3D = {
  target: [0.05, 1.35, 0.05],
  dir: [3.2, 4.0, 9.6],
  radius: 6.9,
  worldBox: [
    [-5.9, 0.0, -2.1],
    [6.0, 3.5, 2.1],
  ],
};

export const GALVANIZADO_CALLOUT_META = [
  { n: 1, name: 'Batea de desengrase alcalino', description: 'Remueve aceites y grasas de laminado a 50-70 °C.', phaseIndex: 0 },
  { n: 2, name: 'Puente grúa industrial (12 t)', description: 'Traslada vigas y estructuras de hasta 13 m entre bateas.', phaseIndex: 0 },
  { n: 3, name: 'Bateas de decapado en HCl', description: 'Disuelve óxidos y calamina (Fe2O3 + 6 HCl -> 2 FeCl3 + 3 H2O).', phaseIndex: 1 },
  { n: 4, name: 'Enjuague de neutralización', description: 'Elimina arrastres ácidos antes de ingresar al flux.', phaseIndex: 1 },
  { n: 5, name: 'Batea de flux (ZnCl2·2NH4Cl)', description: 'Protege contra reoxidación y promueve la aleación Fe-Zn.', phaseIndex: 2 },
  { n: 6, name: 'Horno de secado (60-100 °C)', description: 'Elimina toda humedad superficial previa a la inmersión.', phaseIndex: 2 },
  { n: 7, name: 'Cuba de zinc 13,0 x 1,8 x 3,0 m', description: 'Baño de zinc fundido a 450 °C en una sola inmersión.', phaseIndex: 3 },
  { n: 8, name: 'Horno auxiliar 4,5 m y campana', description: 'Para piezas menores con centrifugado y captación de humos.', phaseIndex: 3 },
  { n: 9, name: 'Pileta de enfriado y laboratorio ISO', description: 'Control de espesor, adherencia y calidad ISO 9001/14001.', phaseIndex: 4 },
  { n: 10, name: 'Lavador de humos y efluentes', description: 'Plantas de tratamiento ambiental de gases y líquidos.', phaseIndex: 4 },
] as const;

export function buildGalvanizadoCalienteMechanism(kit: InkworksKit): MechanismModel3D {
  const { THREE: T, scene, M, part, ghost, ghostRings, stream } = kit;
  const root = new T.Group();
  scene.add(root);
  const casingsGroup = new T.Group();
  const flowsGroup = new T.Group();
  root.add(casingsGroup, flowsGroup);

  const deck = part(new T.BoxGeometry(12.4, 0.16, 4.3), M.concrete);
  deck.position.set(0.05, -0.08, 0);
  root.add(deck);

  // Riel superior del puente grúa de 12 t recorriendo la nave industrial
  const railBeam = part(new T.BoxGeometry(11.4, 0.14, 0.22), M.steel);
  railBeam.position.set(-0.1, 2.95, 0.25);
  root.add(railBeam);
  for (const xPost of [-5.6, -1.8, 2.0, 5.4]) {
    const post = part(new T.BoxGeometry(0.14, 2.95, 0.14), M.concreteDark);
    post.position.set(xPost, 1.48, -1.75);
    root.add(post);
  }

  // Carro de puente grúa + viga de acero en movimiento sincronizado con theta
  const craneGroup = new T.Group();
  const trolley = part(new T.BoxGeometry(0.9, 0.26, 0.6), M.ochreBath);
  trolley.position.set(0, 2.82, 0.25);
  craneGroup.add(trolley);
  const steelBeam = part(new T.BoxGeometry(1.1, 0.14, 0.18), M.dark);
  steelBeam.position.set(0, 1.85, 0.25);
  craneGroup.add(steelBeam);
  root.add(craneGroup);

  // Fase 1: Batea desengrase + enjuague 1
  const degTank = part(new T.BoxGeometry(1.4, 0.95, 1.15), M.cobalt);
  degTank.position.set(-4.75, 0.48, 0.25);
  root.add(degTank);
  const rinse1 = part(new T.BoxGeometry(0.9, 0.85, 1.1), M.alloy);
  rinse1.position.set(-3.45, 0.43, 0.25);
  root.add(rinse1);

  // Fase 2: Batería de decapado HCl + enjuague neutralizador
  const pickle1 = part(new T.BoxGeometry(1.25, 0.95, 1.15), M.refractory);
  pickle1.position.set(-2.15, 0.48, 0.25);
  root.add(pickle1);
  const rinse2 = part(new T.BoxGeometry(0.9, 0.85, 1.1), M.alloy);
  rinse2.position.set(-0.95, 0.43, 0.25);
  root.add(rinse2);

  // Fase 3: Batea fluxado + horno de secado 60-100 °C
  const fluxTank = part(new T.BoxGeometry(1.1, 0.92, 1.12), M.emerald);
  fluxTank.position.set(0.18, 0.46, 0.25);
  root.add(fluxTank);
  const dryerOven = part(new T.BoxGeometry(1.15, 1.25, 1.18), M.ceramic);
  dryerOven.position.set(1.42, 0.62, 0.25);
  root.add(dryerOven);

  // Fase 4: Horno principal de zinc 13,0 x 1,8 x 3,0 m (corte ghost) + horno auxiliar 4,5 m
  const zincKettle = part(new T.BoxGeometry(1.75, 1.25, 1.35), M.ochreBath);
  zincKettle.position.set(3.0, 0.62, 0.25);
  root.add(zincKettle);
  const zincBathTop = part(new T.BoxGeometry(1.5, 0.08, 1.1), M.moltenAl);
  zincBathTop.position.set(3.0, 1.27, 0.25);
  root.add(zincBathTop);
  const kettleHood = ghost(new T.BoxGeometry(1.95, 2.05, 1.55));
  kettleHood.position.set(3.0, 1.65, 0.25);
  casingsGroup.add(kettleHood);

  const auxKettle = part(new T.BoxGeometry(0.95, 0.92, 0.88), M.copper);
  auxKettle.position.set(2.95, 0.46, -1.15);
  root.add(auxKettle);

  // Fase 5: Pileta de enfriamiento + laboratorio ISO + torre lavadora de humos
  const quenchTank = part(new T.BoxGeometry(1.15, 0.9, 1.12), M.cobalt);
  quenchTank.position.set(4.65, 0.45, 0.25);
  root.add(quenchTank);
  const labBench = part(new T.BoxGeometry(0.95, 0.78, 0.95), M.ceramic);
  labBench.position.set(5.55, 0.39, 0.85);
  root.add(labBench);
  const scrubberTower = part(new T.CylinderGeometry(0.36, 0.4, 2.35, 18), M.steel);
  scrubberTower.position.set(4.85, 1.18, -1.25);
  root.add(scrubberTower);

  // Flujos animados
  const sSteel = stream(
    [
      new T.Vector3(-4.75, 1.25, 0.25),
      new T.Vector3(-3.45, 1.2, 0.25),
      new T.Vector3(-2.15, 1.25, 0.25),
      new T.Vector3(-0.95, 1.2, 0.25),
      new T.Vector3(0.18, 1.25, 0.25),
      new T.Vector3(1.42, 1.4, 0.25),
      new T.Vector3(3.0, 1.48, 0.25),
      new T.Vector3(4.65, 1.18, 0.25),
      new T.Vector3(5.55, 0.95, 0.85),
    ],
    ATLAS_PHASE_HUES.ochre,
    { count: 28, size: 7.4, parent: flowsGroup }
  );
  const sFumes = stream(
    [
      new T.Vector3(-2.15, 1.15, 0.25),
      new T.Vector3(-2.15, 2.05, -1.25),
      new T.Vector3(3.0, 2.25, -1.25),
      new T.Vector3(4.85, 2.25, -1.25),
    ],
    ATLAS_PHASE_HUES.cobalt,
    { count: 18, size: 6.8, parent: flowsGroup }
  );
  casingsGroup.add(ghostRings(sFumes.curve, 0.1, 6));

  const callouts: CalloutAnchorDef[] = [
    { ...GALVANIZADO_CALLOUT_META[0], at: (v) => v.set(-4.75, 1.1, 0.25) },
    { ...GALVANIZADO_CALLOUT_META[1], at: (v) => v.set(-3.9, 2.95, 0.25) },
    { ...GALVANIZADO_CALLOUT_META[2], at: (v) => v.set(-2.15, 1.12, 0.25) },
    { ...GALVANIZADO_CALLOUT_META[3], at: (v) => v.set(-0.95, 1.05, 0.25) },
    { ...GALVANIZADO_CALLOUT_META[4], at: (v) => v.set(0.18, 1.1, 0.25) },
    { ...GALVANIZADO_CALLOUT_META[5], at: (v) => v.set(1.42, 1.42, 0.25) },
    { ...GALVANIZADO_CALLOUT_META[6], at: (v) => v.set(3.0, 1.55, 0.25) },
    { ...GALVANIZADO_CALLOUT_META[7], at: (v) => v.set(2.95, 1.08, -1.15) },
    { ...GALVANIZADO_CALLOUT_META[8], at: (v) => v.set(4.85, 1.12, 0.45) },
    { ...GALVANIZADO_CALLOUT_META[9], at: (v) => v.set(4.85, 2.45, -1.25) },
  ];

  let lastTheta = 0;
  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dRaw) < 180 ? Math.max(0, dRaw) : 0;
    const phi = mod(thetaDeg, GALVANIZADO_CYCLE_DEG);
    const frac = phi / GALVANIZADO_CYCLE_DEG;

    // Traslación determinista del puente grúa e inmersión vertical por estación
    const xPos = -4.75 + frac * 9.4;
    craneGroup.position.x = xPos;
    const dipWave = Math.sin(frac * Math.PI * 10);
    steelBeam.position.y = 1.72 - Math.max(0, dipWave) * 0.52;

    const rate = stepDeg * (0.0042 + 0.002 * loadFactor);
    sSteel.advance(rate * 1.05);
    sFumes.advance(rate * 0.95);

    const p = Math.min(4, Math.floor(phi / 72));
    sSteel.mat.opacity = 1.0;
    sFumes.mat.opacity = p === 1 || p === 3 || p === 4 ? 1.0 : 0.45;
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
