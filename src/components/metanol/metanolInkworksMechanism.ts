/**
 * Mecanismo 3D de síntesis de metanol desde gas natural (Plaza Huincul, Neuquén):
 * Desulfuración ZnO -> Reformador SMR (850 °C) -> Compresión syngas (65 bar) ->
 * Reactor Cu/ZnO con reciclo -> Destilación grado AA (>=99,85%).
 */
import * as THREE from 'three';
import { ATLAS_PHASE_HUES, D2R, mod, type CalloutAnchorDef, type InkworksKit } from '@/lib/inkworks-kit';
import type { AnatomyCalloutMeta, MechanismModel3D, OverviewCameraDef3D, ProcessPhaseDef3D } from '../ProcessAnatomy3DPlayer';

export const METANOL_CYCLE_DEG = 360;

export const METANOL_PHASES: ProcessPhaseDef3D[] = [
  {
    index: 0,
    code: '01',
    name: 'Recepción y desulfuración de gas natural',
    short: 'Gas y ZnO',
    pasoId: 'met-p1-desulfuracion-gas',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [-5.1, 1.3, 0.1],
    cameraDir: [3.0, 3.3, 7.6],
    cameraRadius: 3.1,
    summary:
      'El gas natural de la cuenca Neuquina ingresa por ducto a 32 bar y atraviesa un lecho de óxido de zinc (ZnO) a 360 °C que retiene azufre por debajo de 0,1 ppm para proteger los catalizadores metálicos.',
    inputLabel: '0,56 t de gas natural neuquino (CH4) por tonelada de metanol',
    machineAction: 'Gasoducto de ingreso + torre desulfuradora de lecho fijo ZnO',
    outputLabel: '0,56 t de gas natural desulfurado hacia reformado',
    tempDisplay: '350-380 °C',
    tempC: 365,
  },
  {
    index: 1,
    code: '02',
    name: 'Reformado con vapor (SMR a 850 °C)',
    short: 'Reformador SMR',
    pasoId: 'met-p2-reformado-vapor',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.red,
    cameraTarget: [-1.85, 1.45, 0.1],
    cameraDir: [2.6, 3.2, 7.4],
    cameraRadius: 3.15,
    summary:
      'El gas mezclado con vapor de proceso (0,62 t H2O/t) circula por tubos rellenos de catalizador de níquel dentro del horno radiante a 850 °C, produciendo gas de síntesis (CO + H2) y recuperando calor en la caldera WHB.',
    inputLabel: '0,56 t CH4 desulfurado + 0,62 t vapor de proceso',
    machineAction: 'Horno reformador radiante SMR + caldera recuperadora WHB',
    outputLabel: '1,18 t de syngas (CO + 3 H2) + 0,67 t CO2 (IPCC Table 3.12)',
    tempDisplay: '830-870 °C',
    tempC: 850,
  },
  {
    index: 2,
    code: '03',
    name: 'Enfriamiento y compresión de syngas',
    short: 'Compresión 65 bar',
    pasoId: 'met-p3-compresion-syngas',
    startDeg: 144,
    endDeg: 216,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [1.2, 1.15, 0.1],
    cameraDir: [2.4, 3.1, 7.2],
    cameraRadius: 3.0,
    summary:
      'Tras condensar el agua excedente del gas reformado, un compresor centrífugo multietapa eleva el syngas seco hasta 65 bar para alimentar el lazo catalítico de baja presión.',
    inputLabel: '1,18 t de syngas reformado húmedo',
    machineAction: 'Separador de condensado + compresor centrífugo (65 bar)',
    outputLabel: '1,08 t de syngas comprimido seco + 0,10 t agua recuperada',
    tempDisplay: '40-115 °C',
    tempC: 85,
  },
  {
    index: 3,
    code: '04',
    name: 'Síntesis catalítica Cu/ZnO en lazo cerrado',
    short: 'Reactor Cu/ZnO',
    pasoId: 'met-p4-sintesis-catalitica',
    startDeg: 216,
    endDeg: 294,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [3.75, 1.35, 0.1],
    cameraDir: [2.5, 3.1, 7.2],
    cameraRadius: 3.05,
    summary:
      'Sobre catalizador de cobre y óxido de zinc a 250 °C se sintetiza metanol (CO + 2 H2 -> CH3OH). El metanol crudo se condensa en el separador flash y el syngas no convertido vuelve al compresor en reciclo cerrado.',
    inputLabel: '1,08 t de syngas comprimido + corriente de reciclo',
    machineAction: 'Convertidor isotérmico Cu/ZnO + separador flash y reciclo',
    outputLabel: '1,04 t de metanol crudo + gas de purga combustible',
    tempDisplay: '230-270 °C',
    tempC: 250,
  },
  {
    index: 4,
    code: '05',
    name: 'Destilación (topping + refino AA)',
    short: 'Destilación AA',
    pasoId: 'met-p5-destilacion-grado-aa',
    startDeg: 294,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [6.05, 1.45, 0.15],
    cameraDir: [3.0, 3.2, 7.2],
    cameraRadius: 3.15,
    summary:
      'Dos columnas de destilación separan gases livianos y agua de proceso hasta obtener metanol grado químico AA (>=99,85%), almacenado para despachar a plantas de biodiésel, resinas y exportación (HS 2905.11).',
    inputLabel: '1,04 t de metanol crudo condensado',
    machineAction: 'Columna Topping + columna de refino AA + tanque de despacho',
    outputLabel: '1,00 t de metanol grado AA (>=99,85%) + 0,04 t agua fondos',
    tempDisplay: '65-105 °C',
    tempC: 75,
  },
];

export const METANOL_OVERVIEW_CAMERA: OverviewCameraDef3D = {
  target: [0.4, 1.35, 0.1],
  dir: [4.2, 4.0, 9.0],
  radius: 5.2,
  worldBox: [
    [-7.6, -0.4, -2.6],
    [7.6, 3.7, 2.6],
  ],
};

export const METANOL_CALLOUT_META: readonly AnatomyCalloutMeta[] = [
  { n: 1, name: 'Ingreso de gas natural (Neuquén)', description: 'Gasoducto de alimentación a 32 bar desde la cuenca neuquina.', phaseIndex: 0 },
  { n: 2, name: 'Torre desulfuradora ZnO', description: 'Retiene H2S por debajo de 0,1 ppm antes del horno reformador.', phaseIndex: 0 },
  { n: 3, name: 'Horno reformador SMR (850 °C)', description: 'Tubos catalíticos de níquel convierten CH4 + H2O en gas de síntesis.', phaseIndex: 1 },
  { n: 4, name: 'Caldera recuperadora WHB', description: 'Enfría el syngas generando vapor de alta presión para compresores.', phaseIndex: 1 },
  { n: 5, name: 'Separador de condensado', description: 'Retira el agua líquida excedente antes de la compresión.', phaseIndex: 2 },
  { n: 6, name: 'Compresor centrífugo (65 bar)', description: 'Comprime el gas de síntesis fresco junto con el reciclo del lazo.', phaseIndex: 2 },
  { n: 7, name: 'Reactor catalítico Cu/ZnO', description: 'Convierte CO + 2 H2 en CH3OH a 250 °C generando vapor MP.', phaseIndex: 3 },
  { n: 8, name: 'Separador flash y lazo de reciclo', description: 'Condensa metanol crudo y devuelve el gas sin reaccionar al compresor.', phaseIndex: 3 },
  { n: 9, name: 'Columnas Topping y Refino AA', description: 'Separan livianos y agua para alcanzar pureza química >=99,85%.', phaseIndex: 4 },
  { n: 10, name: 'Tanque de despacho CH3OH', description: 'Metanol grado AA listo para industria de biodiésel y resinas.', phaseIndex: 4 },
] as const;

export function buildMetanolMechanism(kit: InkworksKit): MechanismModel3D {
  const { THREE: T, scene, part, ghost, ghostRings, stream, M } = kit;
  const root = new T.Group();
  scene.add(root);
  const casingsGroup = new T.Group();
  const flowsGroup = new T.Group();
  root.add(casingsGroup, flowsGroup);

  // Base industrial neuquina
  const slab = part(new T.BoxGeometry(15.2, 0.28, 4.9), M.concrete);
  slab.position.set(0.2, -0.14, 0);
  root.add(slab);
  const plinth = part(new T.BoxGeometry(15.5, 0.14, 5.1), M.concreteDark);
  plinth.position.set(0.2, -0.34, 0);
  root.add(plinth);

  // Paso 01: Gasoducto + Torre ZnO
  const pipeIn = part(new T.CylinderGeometry(0.14, 0.14, 2.0, 14), M.cobalt);
  pipeIn.rotation.z = Math.PI / 2;
  pipeIn.position.set(-6.1, 0.65, 0.15);
  root.add(pipeIn);

  const znoTower = part(new T.CylinderGeometry(0.45, 0.45, 2.15, 20), M.steel);
  znoTower.position.set(-4.5, 1.15, 0.15);
  root.add(znoTower);
  const znoCap = part(new T.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.alloy);
  znoCap.position.set(-4.5, 2.22, 0.15);
  root.add(znoCap);

  // Paso 02: Horno SMR en corte + tubos radiantes + caldera WHB
  const smrShell = ghost(new T.BoxGeometry(1.9, 2.4, 1.5));
  smrShell.position.set(-2.15, 1.35, 0.1);
  casingsGroup.add(smrShell);
  const smrBase = part(new T.BoxGeometry(2.0, 0.3, 1.6), M.refractory);
  smrBase.position.set(-2.15, 0.15, 0.1);
  root.add(smrBase);
  const radiantTubes: THREE.Object3D[] = [];
  for (let i = 0; i < 4; i++) {
    const tube = part(new T.CylinderGeometry(0.11, 0.11, 2.05, 12), M.copper);
    tube.position.set(-2.75 + i * 0.4, 1.32, 0.1);
    root.add(tube);
    radiantTubes.push(tube);
  }
  const smrStack = part(new T.CylinderGeometry(0.24, 0.28, 1.15, 16), M.dark);
  smrStack.position.set(-2.15, 3.05, -0.2);
  root.add(smrStack);

  const whbBody = part(new T.CylinderGeometry(0.44, 0.44, 1.45, 18), M.steel);
  whbBody.rotation.z = Math.PI / 2;
  whbBody.position.set(-0.35, 1.15, 0.15);
  root.add(whbBody);

  // Paso 03: Separador condensado + compresor centrífugo con rotor
  const koDrum = part(new T.CylinderGeometry(0.36, 0.36, 1.45, 16), M.alloy);
  koDrum.position.set(0.65, 0.85, 0.2);
  root.add(koDrum);

  const compBase = part(new T.BoxGeometry(1.25, 0.52, 1.0), M.dark);
  compBase.position.set(1.85, 0.26, 0.15);
  root.add(compBase);
  const compShell = ghost(new T.CylinderGeometry(0.44, 0.36, 1.1, 18));
  compShell.rotation.z = Math.PI / 2;
  compShell.position.set(1.85, 0.92, 0.15);
  casingsGroup.add(compShell);
  const compRotor = new T.Group();
  compRotor.position.set(1.85, 0.92, 0.15);
  for (let i = 0; i < 3; i++) {
    const wheel = part(new T.CylinderGeometry(0.32 - i * 0.04, 0.32 - i * 0.04, 0.07, 16), M.cobalt);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.x = -0.3 + i * 0.3;
    compRotor.add(wheel);
  }
  root.add(compRotor);

  // Paso 04: Reactor Cu/ZnO en corte + separador flash
  const reactorShell = ghost(new T.CylinderGeometry(0.62, 0.62, 2.35, 20));
  reactorShell.position.set(3.45, 1.42, 0.15);
  casingsGroup.add(reactorShell);
  const catalystBed = part(new T.CylinderGeometry(0.5, 0.5, 1.65, 18), M.emerald);
  catalystBed.position.set(3.45, 1.38, 0.15);
  root.add(catalystBed);
  const reactorSkirt = part(new T.CylinderGeometry(0.62, 0.68, 0.35, 18), M.steel);
  reactorSkirt.position.set(3.45, 0.18, 0.15);
  root.add(reactorSkirt);

  const flashVessel = part(new T.CylinderGeometry(0.38, 0.38, 1.55, 18), M.alloy);
  flashVessel.position.set(4.55, 0.95, 0.15);
  root.add(flashVessel);

  // Paso 05: Columnas Topping + Refino AA + Tanque despacho
  const colTopping = part(new T.CylinderGeometry(0.32, 0.32, 2.35, 18), M.steel);
  colTopping.position.set(5.45, 1.25, -0.15);
  root.add(colTopping);
  const colRefining = part(new T.CylinderGeometry(0.36, 0.36, 2.85, 18), M.cobalt);
  colRefining.position.set(6.25, 1.5, -0.15);
  root.add(colRefining);
  const storageTank = part(new T.CylinderGeometry(0.56, 0.56, 1.15, 22), M.alloy);
  storageTank.position.set(6.75, 0.65, 1.35);
  root.add(storageTank);

  // Flujos deterministas
  const gasStream = stream(
    [
      new T.Vector3(-6.9, 0.65, 0.15),
      new T.Vector3(-4.5, 0.65, 0.15),
      new T.Vector3(-4.5, 2.3, 0.15),
      new T.Vector3(-2.6, 2.3, 0.1),
      new T.Vector3(-2.15, 0.55, 0.1),
    ],
    ATLAS_PHASE_HUES.cobalt,
    { count: 24, size: 7.5, parent: flowsGroup }
  );
  const syngasStream = stream(
    [
      new T.Vector3(-1.3, 1.15, 0.15),
      new T.Vector3(-0.35, 1.15, 0.15),
      new T.Vector3(0.65, 1.45, 0.2),
      new T.Vector3(1.85, 0.92, 0.15),
      new T.Vector3(3.45, 2.45, 0.15),
      new T.Vector3(3.45, 0.65, 0.15),
      new T.Vector3(4.55, 1.25, 0.15),
    ],
    ATLAS_PHASE_HUES.ochre,
    { count: 28, size: 7.5, parent: flowsGroup }
  );
  const recycleStream = stream(
    [
      new T.Vector3(4.55, 1.72, 0.15),
      new T.Vector3(4.55, 1.9, -1.45),
      new T.Vector3(1.85, 1.9, -1.45),
      new T.Vector3(1.85, 1.35, 0.15),
    ],
    ATLAS_PHASE_HUES.emerald,
    { count: 22, size: 7, parent: flowsGroup }
  );
  casingsGroup.add(ghostRings(recycleStream.curve, 0.12, 6));

  const productStream = stream(
    [
      new T.Vector3(4.55, 0.45, 0.15),
      new T.Vector3(5.45, 1.35, -0.15),
      new T.Vector3(6.25, 2.55, -0.15),
      new T.Vector3(6.75, 1.28, 1.35),
    ],
    ATLAS_PHASE_HUES.cobalt,
    { count: 22, size: 7.5, parent: flowsGroup }
  );

  let lastTheta = 0;
  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dRaw) < 180 ? Math.max(0, dRaw) : 0;
    const phi = mod(thetaDeg, METANOL_CYCLE_DEG);
    const rad = phi * D2R;

    compRotor.rotation.x = rad * 10;
    catalystBed.scale.y = 0.98 + 0.03 * Math.sin(rad * 3);
    radiantTubes.forEach((tb, idx) => {
      tb.scale.x = 1 + 0.05 * Math.sin(rad * 4 + idx);
    });

    const rate = stepDeg * (0.0042 + 0.002 * loadFactor);
    gasStream.advance(rate * 1.1);
    syngasStream.advance(rate * 1.15);
    recycleStream.advance(rate * 1.0);
    productStream.advance(rate * 1.05);

    const p = Math.min(4, Math.floor(phi / 72));
    gasStream.mat.opacity = p <= 1 ? 1.0 : 0.5;
    syngasStream.mat.opacity = p >= 1 && p <= 3 ? 1.0 : 0.5;
    recycleStream.mat.opacity = p === 3 ? 1.0 : 0.5;
    productStream.mat.opacity = p === 4 ? 1.0 : 0.5;
  }

  const callouts: CalloutAnchorDef[] = [
    { ...METANOL_CALLOUT_META[0]!, at: (v) => v.set(-6.1, 0.72, 0.15) },
    { ...METANOL_CALLOUT_META[1]!, at: (v) => v.set(-4.5, 2.15, 0.15) },
    { ...METANOL_CALLOUT_META[2]!, at: (v) => v.set(-2.15, 2.15, 0.1) },
    { ...METANOL_CALLOUT_META[3]!, at: (v) => v.set(-0.35, 1.55, 0.15) },
    { ...METANOL_CALLOUT_META[4]!, at: (v) => v.set(0.65, 1.55, 0.2) },
    { ...METANOL_CALLOUT_META[5]!, at: (v) => v.set(1.85, 1.35, 0.15) },
    { ...METANOL_CALLOUT_META[6]!, at: (v) => v.set(3.45, 2.2, 0.15) },
    { ...METANOL_CALLOUT_META[7]!, at: (v) => v.set(4.55, 1.7, 0.15) },
    { ...METANOL_CALLOUT_META[8]!, at: (v) => v.set(6.25, 2.65, -0.15) },
    { ...METANOL_CALLOUT_META[9]!, at: (v) => v.set(6.75, 1.15, 1.35) },
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
