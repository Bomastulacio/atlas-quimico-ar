/**
 * Mecanismo 3D de Refinación FCC y Polipropileno (Luján de Cuyo, Mendoza):
 * Unidad FCC refinería YPF -> Superfraccionadora Splitter C3 -> Reactor fase gas Ziegler-Natta ->
 * Silo desgasificador N2 + compresor reciclo C3H6 -> Extrusora y silos de pellets PP.
 */
import { ATLAS_PHASE_HUES, D2R, mod, type CalloutAnchorDef, type InkworksKit } from '@/lib/inkworks-kit';
import type { AnatomyCalloutMeta, MechanismModel3D, OverviewCameraDef3D, ProcessPhaseDef3D } from '../ProcessAnatomy3DPlayer';

export const POLIPROPILENO_CYCLE_DEG = 360;

export const POLIPROPILENO_PHASES: ProcessPhaseDef3D[] = [
  {
    index: 0,
    code: '01',
    name: 'Craqueo catalítico fluido (FCC) en refinería',
    short: 'Unidad FCC',
    pasoId: 'pp-p1-craqueo-fcc',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.red,
    cameraTarget: [-5.1, 1.45, 0.1],
    cameraDir: [3.1, 3.2, 7.6],
    cameraRadius: 3.2,
    summary:
      'En el Complejo Industrial Luján de Cuyo (YPF), la unidad FCC rompe gasoil pesado sobre catalizador zeolítico fluidizado a 525 °C para generar cortes livianos ricos en propileno.',
    inputLabel: 'Gasoil pesado de vacío (crudo cuyano/neuquino)',
    machineAction: 'Reactor riser FCC + regenerador de catalizador fluidizado',
    outputLabel: '1,45 t de corte C3 de refinería (propileno + propano)',
    tempDisplay: '510-540 °C',
    tempC: 525,
  },
  {
    index: 1,
    code: '02',
    name: 'Splitter C3 y purificación grado polímero',
    short: 'Splitter C3',
    pasoId: 'pp-p2-splitter-propileno',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [-1.8, 1.55, 0.1],
    cameraDir: [2.7, 3.2, 7.5],
    cameraRadius: 3.2,
    summary:
      'Una torre superfraccionadora separa el propileno (>99,5% C3H6) por cabeza y el propano comercial (0,435 t a GLP) por fondos. Lechos adsorbentes eliminan agua y azufre por debajo de 1 ppm.',
    inputLabel: '1,45 t de corte C3 mezclado (C3H6 / C3H8)',
    machineAction: 'Columna superfraccionadora Splitter C3 + lechos purificadores',
    outputLabel: '1,015 t de propileno grado polímero + 0,435 t propano GLP',
    tempDisplay: '35-55 °C',
    tempC: 45,
  },
  {
    index: 2,
    code: '03',
    name: 'Polimerización catalítica en fase gas',
    short: 'Reactor Z-N',
    pasoId: 'pp-p3-polimerizacion-zn',
    startDeg: 144,
    endDeg: 216,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [1.3, 1.35, 0.1],
    cameraDir: [2.4, 3.1, 7.2],
    cameraRadius: 3.05,
    summary:
      'En el reactor fase gas con catalizador Ziegler-Natta (75 °C, 32 bar), las moléculas de propileno se enlazan en cadenas isotácticas de polipropileno en polvo con agitación continua.',
    inputLabel: '1,015 t de propileno ultrapuro + catalizador Z-N + H2',
    machineAction: 'Reactor de lecho agitado fase gas (Ziegler-Natta)',
    outputLabel: '1,005 t de polvo de polipropileno isotáctico',
    tempDisplay: '65-80 °C',
    tempC: 75,
  },
  {
    index: 3,
    code: '04',
    name: 'Desgasificación N2 y reciclo de monómero',
    short: 'Reciclo C3H6',
    pasoId: 'pp-p4-desgasificacion-reciclo',
    startDeg: 216,
    endDeg: 294,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [3.9, 1.25, 0.1],
    cameraDir: [2.6, 3.1, 7.2],
    cameraRadius: 3.05,
    summary:
      'El polvo entra al silo desgasificador donde nitrógeno recupera el propileno no convertido. Un compresor dedicado devuelve el monómero en circuito cerrado al reactor.',
    inputLabel: '1,005 t de polvo PP con monómero ocluido + N2',
    machineAction: 'Silo desgasificador + compresor de reciclo C3H6',
    outputLabel: '1,00 t de polvo de polipropileno desgasificado',
    tempDisplay: '60-85 °C',
    tempC: 72,
  },
  {
    index: 4,
    code: '05',
    name: 'Extrusión, peletizado y silos de PP',
    short: 'Pellets PP',
    pasoId: 'pp-p5-extrusion-peletizado',
    startDeg: 294,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [6.05, 1.2, 0.25],
    cameraDir: [3.0, 3.1, 7.0],
    cameraRadius: 3.05,
    summary:
      'Una extrusora doble tornillo funde el polvo con antioxidantes a 225 °C y corta pellets uniformes bajo agua que se homogeneizan en silos de Petrocuyo para envases, autopartes y exportación (HS 3902.10).',
    inputLabel: '1,00 t de polvo PP + aditivos estabilizantes',
    machineAction: 'Extrusora doble tornillo + peletizadora + silos de despacho',
    outputLabel: '1,00 t de pellets de polipropileno (HS 3902.10)',
    tempDisplay: '210-240 °C',
    tempC: 225,
  },
];

export const POLIPROPILENO_OVERVIEW_CAMERA: OverviewCameraDef3D = {
  target: [0.4, 1.35, 0.1],
  dir: [4.2, 4.0, 9.0],
  radius: 5.2,
  worldBox: [
    [-7.6, -0.4, -2.6],
    [7.6, 3.8, 2.6],
  ],
};

export const POLIPROPILENO_CALLOUT_META: readonly AnatomyCalloutMeta[] = [
  { n: 1, name: 'Unidad FCC (Refinería YPF)', description: 'Craqueo catalítico a 525 °C que produce el corte C3 en Luján de Cuyo.', phaseIndex: 0 },
  { n: 2, name: 'Regenerador de catalizador FCC', description: 'Quema coque del catalizador zeolítico y lo recircula al riser.', phaseIndex: 0 },
  { n: 3, name: 'Torre Splitter C3 (>99,5% C3H6)', description: 'Separa propileno grado polímero por cabeza y propano GLP por fondos.', phaseIndex: 1 },
  { n: 4, name: 'Lechos purificadores C3', description: 'Remueven agua, CO y azufre por debajo de 1 ppm.', phaseIndex: 1 },
  { n: 5, name: 'Reactor fase gas Ziegler-Natta', description: 'Polimeriza C3H6 a 75 °C y 32 bar con agitador helicoidal.', phaseIndex: 2 },
  { n: 6, name: 'Condensador de calor de reacción', description: 'Evapora y condensa propileno para controlar la exotermia.', phaseIndex: 2 },
  { n: 7, name: 'Silo desgasificador con N2', description: 'Retira el propileno residual del polvo de polipropileno.', phaseIndex: 3 },
  { n: 8, name: 'Compresor de reciclo C3H6', description: 'Reintroduce el monómero recuperado al reactor en lazo cerrado.', phaseIndex: 3 },
  { n: 9, name: 'Extrusora y peletizadora', description: 'Funde el polvo con estabilizantes y corta pellets uniformes.', phaseIndex: 4 },
  { n: 10, name: 'Silos de polipropileno (HS 3902.10)', description: 'Almacenamiento y despacho de resinas homopolímero y copolímero.', phaseIndex: 4 },
] as const;

export function buildPolipropilenoMechanism(kit: InkworksKit): MechanismModel3D {
  const { THREE: T, scene, part, ghost, ghostRings, stream, M } = kit;
  const root = new T.Group();
  scene.add(root);
  const casingsGroup = new T.Group();
  const flowsGroup = new T.Group();
  root.add(casingsGroup, flowsGroup);

  const slab = part(new T.BoxGeometry(15.2, 0.28, 4.9), M.concrete);
  slab.position.set(0.2, -0.14, 0);
  root.add(slab);
  const plinth = part(new T.BoxGeometry(15.5, 0.14, 5.1), M.concreteDark);
  plinth.position.set(0.2, -0.34, 0);
  root.add(plinth);

  // Paso 01: FCC Reactor + Regenerator
  const fccRiser = part(new T.CylinderGeometry(0.45, 0.36, 2.35, 18), M.steel);
  fccRiser.position.set(-5.65, 1.3, 0.2);
  root.add(fccRiser);
  const fccRegen = part(new T.CylinderGeometry(0.58, 0.58, 1.85, 20), M.refractory);
  fccRegen.position.set(-4.35, 1.05, -0.55);
  root.add(fccRegen);

  // Paso 02: Alta columna Splitter C3 + lechos purificadores
  const splitterCol = part(new T.CylinderGeometry(0.36, 0.36, 3.15, 20), M.cobalt);
  splitterCol.position.set(-2.35, 1.65, 0.1);
  root.add(splitterCol);
  for (const dx of [-1.25, -0.75]) {
    const bed = part(new T.CylinderGeometry(0.22, 0.22, 1.45, 16), M.alloy);
    bed.position.set(dx, 0.85, 0.15);
    root.add(bed);
  }

  // Paso 03: Reactor fase gas Ziegler-Natta en corte + agitador rotativo + condensador
  const ppShell = ghost(new T.CylinderGeometry(0.7, 0.7, 2.25, 22));
  ppShell.position.set(1.15, 1.38, 0.15);
  casingsGroup.add(ppShell);
  const ppBase = part(new T.CylinderGeometry(0.7, 0.74, 0.32, 20), M.emerald);
  ppBase.position.set(1.15, 0.16, 0.15);
  root.add(ppBase);
  const agitator = new T.Group();
  agitator.position.set(1.15, 1.35, 0.15);
  const shaft = part(new T.CylinderGeometry(0.06, 0.06, 1.9, 12), M.carbon);
  agitator.add(shaft);
  for (const py of [-0.55, 0.0, 0.55]) {
    const blade = part(new T.BoxGeometry(1.05, 0.08, 0.18), M.alloy);
    blade.position.y = py;
    blade.rotation.y = py * 1.6;
    agitator.add(blade);
  }
  root.add(agitator);

  const overheadCond = part(new T.CylinderGeometry(0.3, 0.3, 1.05, 16), M.steel);
  overheadCond.rotation.z = Math.PI / 2;
  overheadCond.position.set(1.95, 2.35, -0.85);
  root.add(overheadCond);

  // Paso 04: Silo desgasificador + compresor reciclo
  const degasser = part(new T.CylinderGeometry(0.46, 0.46, 1.85, 18), M.steel);
  degasser.position.set(3.65, 1.15, 0.15);
  root.add(degasser);
  const recComp = part(new T.BoxGeometry(0.9, 0.65, 0.75), M.ochreBath);
  recComp.position.set(3.65, 0.45, -1.35);
  root.add(recComp);

  // Paso 05: Extrusora + silos pellets PP
  const extruderBody = part(new T.BoxGeometry(1.45, 0.52, 0.58), M.cobalt);
  extruderBody.position.set(5.45, 0.52, 0.2);
  root.add(extruderBody);
  const screwShaft = part(new T.CylinderGeometry(0.14, 0.14, 1.6, 12), M.alloy);
  screwShaft.rotation.z = Math.PI / 2;
  screwShaft.position.set(5.45, 0.52, 0.52);
  root.add(screwShaft);

  for (const dz of [-0.45, 0.95]) {
    const silo = part(new T.CylinderGeometry(0.46, 0.46, 1.85, 20), M.alloy);
    silo.position.set(6.75, 1.15, dz);
    root.add(silo);
    const roof = part(new T.ConeGeometry(0.48, 0.34, 20), M.cobalt);
    roof.position.set(6.75, 2.25, dz);
    root.add(roof);
  }

  // Flujos
  const fccStream = stream(
    [
      new T.Vector3(-5.65, 2.35, 0.2),
      new T.Vector3(-4.1, 2.1, 0.15),
      new T.Vector3(-2.35, 1.65, 0.1),
      new T.Vector3(-2.35, 3.1, 0.1),
      new T.Vector3(-1.0, 1.6, 0.15),
      new T.Vector3(1.15, 2.25, 0.15),
    ],
    ATLAS_PHASE_HUES.cobalt,
    { count: 28, size: 7.5, parent: flowsGroup }
  );
  const propaneOut = stream(
    [new T.Vector3(-2.35, 0.35, 0.1), new T.Vector3(-2.35, 0.35, 1.85)],
    ATLAS_PHASE_HUES.ochre,
    { count: 12, size: 7, parent: flowsGroup }
  );
  const powderStream = stream(
    [
      new T.Vector3(1.15, 0.45, 0.15),
      new T.Vector3(2.45, 0.85, 0.15),
      new T.Vector3(3.65, 1.85, 0.15),
      new T.Vector3(3.65, 0.55, 0.15),
      new T.Vector3(5.45, 0.65, 0.2),
      new T.Vector3(6.75, 1.95, 0.25),
    ],
    ATLAS_PHASE_HUES.emerald,
    { count: 26, size: 7.5, parent: flowsGroup }
  );
  const recycleC3 = stream(
    [
      new T.Vector3(3.65, 2.05, 0.15),
      new T.Vector3(3.65, 0.78, -1.35),
      new T.Vector3(1.95, 2.35, -0.85),
      new T.Vector3(1.15, 2.4, 0.15),
    ],
    ATLAS_PHASE_HUES.ochre,
    { count: 20, size: 7, parent: flowsGroup }
  );
  casingsGroup.add(ghostRings(recycleC3.curve, 0.11, 5));

  let lastTheta = 0;
  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dRaw) < 180 ? Math.max(0, dRaw) : 0;
    const phi = mod(thetaDeg, POLIPROPILENO_CYCLE_DEG);
    const rad = phi * D2R;

    agitator.rotation.y = rad * 6;
    screwShaft.rotation.x = rad * 10;

    const rate = stepDeg * (0.0042 + 0.002 * loadFactor);
    fccStream.advance(rate * 1.15);
    propaneOut.advance(rate * 0.9);
    powderStream.advance(rate * 1.05);
    recycleC3.advance(rate * 1.0);

    const p = Math.min(4, Math.floor(phi / 72));
    fccStream.mat.opacity = p <= 2 ? 1.0 : 0.5;
    propaneOut.mat.opacity = p === 1 ? 1.0 : 0.45;
    powderStream.mat.opacity = p >= 2 ? 1.0 : 0.5;
    recycleC3.mat.opacity = p === 3 ? 1.0 : 0.5;
  }

  const callouts: CalloutAnchorDef[] = [
    { ...POLIPROPILENO_CALLOUT_META[0]!, at: (v) => v.set(-5.65, 2.25, 0.2) },
    { ...POLIPROPILENO_CALLOUT_META[1]!, at: (v) => v.set(-4.35, 1.85, -0.55) },
    { ...POLIPROPILENO_CALLOUT_META[2]!, at: (v) => v.set(-2.35, 2.95, 0.1) },
    { ...POLIPROPILENO_CALLOUT_META[3]!, at: (v) => v.set(-1.0, 1.5, 0.15) },
    { ...POLIPROPILENO_CALLOUT_META[4]!, at: (v) => v.set(1.15, 2.1, 0.15) },
    { ...POLIPROPILENO_CALLOUT_META[5]!, at: (v) => v.set(1.95, 2.45, -0.85) },
    { ...POLIPROPILENO_CALLOUT_META[6]!, at: (v) => v.set(3.65, 2.0, 0.15) },
    { ...POLIPROPILENO_CALLOUT_META[7]!, at: (v) => v.set(3.65, 0.75, -1.35) },
    { ...POLIPROPILENO_CALLOUT_META[8]!, at: (v) => v.set(5.45, 0.85, 0.2) },
    { ...POLIPROPILENO_CALLOUT_META[9]!, at: (v) => v.set(6.75, 2.15, 0.95) },
  ];

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
