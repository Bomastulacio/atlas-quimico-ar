/**
 * Mecanismo 3D de complejo sucroalcoholero de caña de azúcar (Cruz Alta, Tucumán):
 * Mesa de caña y trapiche en corte -> Clarificador y tacho de azúcar -> Fermentación y reciclo levadura ->
 * Destilería y deshidratadora 3A -> Caldera de bagazo y turbogenerador de cogeneración.
 */
import * as THREE from 'three';
import { ATLAS_PHASE_HUES, D2R, mod, type CalloutAnchorDef, type InkworksKit } from '@/lib/inkworks-kit';
import type { AnatomyCalloutMeta, MechanismModel3D, OverviewCameraDef3D, ProcessPhaseDef3D } from '../ProcessAnatomy3DPlayer';

export const BIOETANOL_CANA_CYCLE_DEG = 360;

export const BIOETANOL_CANA_PHASES: ProcessPhaseDef3D[] = [
  {
    index: 0,
    code: '01',
    name: 'Molienda de caña en trapiches',
    short: 'Trapiches',
    pasoId: 'bc-p1-trapiche-cana',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [-5.1, 1.25, 0.15],
    cameraDir: [3.1, 3.3, 7.6],
    cameraRadius: 3.2,
    summary:
      'La caña de azúcar cosechada en Tucumán ingresa a las mesas alimentadoras y atraviesa el tandem de trapiches, donde mazas acanaladas extraen el jugo azucarado y separan 4,1 t de bagazo combustible.',
    inputLabel: '14,5 t de caña de azúcar fresca por tonelada eq. de etanol',
    machineAction: 'Mesa alimentadora + tandem de mazas de trapiche en corte',
    outputLabel: '10,4 t de jugo mixto de sacarosa + 4,1 t de bagazo fibroso',
    tempDisplay: '25-35 °C',
    tempC: 30,
  },
  {
    index: 1,
    code: '02',
    name: 'Clarificación y mix azúcar / melaza',
    short: 'Clarificación',
    pasoId: 'bc-p2-clarificacion-evaporacion',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [-1.85, 1.35, 0.1],
    cameraDir: [2.6, 3.2, 7.4],
    cameraRadius: 3.1,
    summary:
      'El jugo se clarifica con cal y se concentra en evaporadores múltiple efecto. El ingenio define en tiempo real cuánto deriva a cristalización de azúcar (HS 1701.99) y cuánto a melaza/jugo para destilería.',
    inputLabel: '10,4 t de jugo mixto de caña + lechada de cal',
    machineAction: 'Clarificador continuo + evaporadores y tacho azucarero',
    outputLabel: '3,4 t de melaza/jugo a destilería + azúcar cristalizado',
    tempDisplay: '65-105 °C',
    tempC: 90,
  },
  {
    index: 2,
    code: '03',
    name: 'Fermentación rápida con reciclo de levadura',
    short: 'Fermentación',
    pasoId: 'bc-p3-fermentacion-sacarosa',
    startDeg: 144,
    endDeg: 216,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [1.2, 1.3, 0.15],
    cameraDir: [2.5, 3.1, 7.2],
    cameraRadius: 3.05,
    summary:
      'Como la sacarosa ya es fermentable sin hidrólisis de almidón, la fermentación dura solo 8-12 horas y las centrífugas reciclan la crema de levaduras continuamente.',
    inputLabel: '1,95 t de sacarosa equivalente en melaza/jugo',
    machineAction: 'Cubas de fermentación continua + centrífuga de levaduras',
    outputLabel: 'Vino fermentado (8-10% v/v etanol) + 0,95 t CO2 biogénico',
    tempDisplay: '32-35 °C',
    tempC: 33,
  },
  {
    index: 3,
    code: '04',
    name: 'Destilería y deshidratación 3A',
    short: 'Destilería',
    pasoId: 'bc-p4-destilacion-deshidratacion',
    startDeg: 216,
    endDeg: 294,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [3.95, 1.5, 0.1],
    cameraDir: [2.7, 3.1, 7.4],
    cameraRadius: 3.1,
    summary:
      'Las columnas de destilación operan con vapor renovable del bagazo y los tamices moleculares 3A deshidratan el alcohol hasta grado combustible anhidro (>=99,5% v/v).',
    inputLabel: 'Vino centrifugado + vapor de caldera de bagazo',
    machineAction: 'Columna destiladora + deshidratadora con tamices 3A',
    outputLabel: '1,00 t de bioetanol anhidro de caña + vinaza tratable',
    tempDisplay: '78-112 °C',
    tempC: 95,
  },
  {
    index: 4,
    code: '05',
    name: 'Cogeneración con bagazo y despacho',
    short: 'Cogeneración',
    pasoId: 'bc-p5-cogeneracion-despacho',
    startDeg: 294,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.red,
    cameraTarget: [6.05, 1.35, 0.15],
    cameraDir: [3.1, 3.1, 7.2],
    cameraRadius: 3.1,
    summary:
      'La caldera de alta presión quema el bagazo fibroso para mover el turbogenerador, haciendo al complejo energéticamente autosuficiente mientras despacha bioetanol y azúcar.',
    inputLabel: '4,1 t de bagazo seco + bioetanol anhidro terminado',
    machineAction: 'Caldera de bagazo (42 bar) + turbogenerador + despacho',
    outputLabel: 'Electricidad/vapor renovable + bioetanol anhidro + azúcar',
    tempDisplay: '460 °C (caldera)',
    tempC: 460,
  },
];

export const BIOETANOL_CANA_OVERVIEW_CAMERA: OverviewCameraDef3D = {
  target: [0.4, 1.35, 0.1],
  dir: [4.2, 4.0, 9.0],
  radius: 5.2,
  worldBox: [
    [-7.6, -0.4, -2.6],
    [7.6, 3.7, 2.6],
  ],
};

export const BIOETANOL_CANA_CALLOUT_META: readonly AnatomyCalloutMeta[] = [
  { n: 1, name: 'Mesa de caña de azúcar', description: 'Recepción de zafra tucumana (14,5 t caña por t eq. de etanol).', phaseIndex: 0 },
  { n: 2, name: 'Tandem de trapiches', description: 'Mazas rotativas extraen jugo de sacarosa y separan 4,1 t bagazo.', phaseIndex: 0 },
  { n: 3, name: 'Clarificador y evaporadores', description: 'Purifican el jugo y concentran meladura con vapor del ingenio.', phaseIndex: 1 },
  { n: 4, name: 'Tacho de azúcar (HS 1701.99)', description: 'Permite regular el mix flexible entre azúcar refinada y etanol.', phaseIndex: 1 },
  { n: 5, name: 'Fermentadores de sacarosa', description: 'Fermentación directa rápida (8-12 h) de melaza y jugo.', phaseIndex: 2 },
  { n: 6, name: 'Centrífuga de levaduras', description: 'Recupera y recicla crema de levaduras hacia las cubas.', phaseIndex: 2 },
  { n: 7, name: 'Columnas de destilería', description: 'Separan alcohol hidratado (95,6%) alimentadas con vapor propio.', phaseIndex: 3 },
  { n: 8, name: 'Deshidratadora tamices 3A', description: 'Produce bioetanol anhidro (>=99,5%) para mezcla en naftas.', phaseIndex: 3 },
  { n: 9, name: 'Caldera de cogeneración a bagazo', description: 'Quema biomasa de caña generando vapor y energía eléctrica.', phaseIndex: 4 },
  { n: 10, name: 'Turbogenerador y tanques despacho', description: 'Autosuficiencia energética y despacho sucroalcoholero tucumano.', phaseIndex: 4 },
] as const;

export function buildBioetanolCanaMechanism(kit: InkworksKit): MechanismModel3D {
  const { THREE: T, scene, part, ghost, ghostRings, stream, M } = kit;
  const root = new T.Group();
  scene.add(root);
  const casingsGroup = new T.Group();
  const flowsGroup = new T.Group();
  root.add(casingsGroup, flowsGroup);

  const caneMat = kit.toon('#89b86c');
  const bagasseMat = kit.toon('#d9c598');

  const slab = part(new T.BoxGeometry(15.2, 0.28, 4.9), M.concrete);
  slab.position.set(0.2, -0.14, 0);
  root.add(slab);
  const plinth = part(new T.BoxGeometry(15.5, 0.14, 5.1), M.concreteDark);
  plinth.position.set(0.2, -0.34, 0);
  root.add(plinth);

  // Paso 01: Mesa de caña + Tandem de trapiches en corte con 3 mazas rotativas
  const caneRamp = part(new T.BoxGeometry(1.55, 0.22, 1.3), caneMat);
  caneRamp.rotation.z = -0.22;
  caneRamp.position.set(-6.15, 0.72, 0.15);
  root.add(caneRamp);

  const millFrame = ghost(new T.BoxGeometry(2.05, 1.45, 1.25));
  millFrame.position.set(-4.35, 0.85, 0.15);
  casingsGroup.add(millFrame);
  const millBase = part(new T.BoxGeometry(2.15, 0.26, 1.32), M.emerald);
  millBase.position.set(-4.35, 0.14, 0.15);
  root.add(millBase);

  const rollers: THREE.Object3D[] = [];
  for (let i = 0; i < 3; i++) {
    const r = part(new T.CylinderGeometry(0.24, 0.24, 1.05, 16), M.steel);
    r.rotation.x = Math.PI / 2;
    r.position.set(-5.0 + i * 0.65, 0.85, 0.15);
    root.add(r);
    rollers.push(r);
  }

  // Paso 02: Clarificador + evaporador + tacho azúcar
  const clarifier = part(new T.CylinderGeometry(0.68, 0.58, 1.15, 22), M.alloy);
  clarifier.position.set(-2.35, 0.72, 0.2);
  root.add(clarifier);
  const evapCol = part(new T.CylinderGeometry(0.4, 0.4, 1.95, 18), M.copper);
  evapCol.position.set(-1.1, 1.08, 0.15);
  root.add(evapCol);
  const sugarPan = part(new T.CylinderGeometry(0.42, 0.42, 1.35, 18), M.ceramic);
  sugarPan.position.set(-1.35, 0.8, -1.35);
  root.add(sugarPan);

  // Paso 03: Fermentadores + centrífuga de levaduras
  const fermVat = ghost(new T.CylinderGeometry(0.64, 0.64, 1.95, 20));
  fermVat.position.set(0.85, 1.1, 0.15);
  casingsGroup.add(fermVat);
  const fermFill = part(new T.CylinderGeometry(0.58, 0.58, 1.4, 18), M.glassEmerald, { edges: false, outline: false });
  fermFill.position.set(0.85, 0.82, 0.15);
  root.add(fermFill);
  const yeastCentrifuge = part(new T.CylinderGeometry(0.36, 0.36, 0.95, 16), M.emerald);
  yeastCentrifuge.position.set(2.1, 0.62, 0.15);
  root.add(yeastCentrifuge);

  // Paso 04: Destilería + tamices 3A
  const distTower = part(new T.CylinderGeometry(0.36, 0.36, 2.95, 18), M.cobalt);
  distTower.position.set(3.55, 1.55, 0.1);
  root.add(distTower);
  const dehydSieve = part(new T.CylinderGeometry(0.28, 0.28, 1.85, 16), M.alloy);
  dehydSieve.position.set(4.5, 1.05, 0.1);
  root.add(dehydSieve);

  // Paso 05: Caldera de bagazo + chimenea + turbogenerador + tanque bioetanol
  const boilerBody = part(new T.BoxGeometry(1.5, 2.0, 1.35), M.refractory);
  boilerBody.position.set(5.95, 1.1, -0.85);
  root.add(boilerBody);
  const boilerStack = part(new T.CylinderGeometry(0.2, 0.24, 1.2, 16), M.dark);
  boilerStack.position.set(5.95, 2.65, -0.85);
  root.add(boilerStack);
  const turbineRotor = part(new T.CylinderGeometry(0.32, 0.32, 1.05, 16), M.cobalt);
  turbineRotor.rotation.z = Math.PI / 2;
  turbineRotor.position.set(6.15, 0.62, 0.65);
  root.add(turbineRotor);
  const ethTank = part(new T.CylinderGeometry(0.52, 0.52, 1.25, 20), M.emerald);
  ethTank.position.set(6.85, 0.72, 1.65);
  root.add(ethTank);

  // Flujos
  const juiceStream = stream(
    [new T.Vector3(-5.0, 0.65, 0.15), new T.Vector3(-3.6, 0.75, 0.15), new T.Vector3(-2.35, 1.25, 0.2), new T.Vector3(-1.1, 1.85, 0.15), new T.Vector3(0.85, 1.75, 0.15)],
    ATLAS_PHASE_HUES.emerald,
    { count: 26, size: 7.5, parent: flowsGroup }
  );
  const bagasseConveyor = stream(
    [new T.Vector3(-3.65, 1.25, -0.35), new T.Vector3(-3.65, 1.65, -1.75), new T.Vector3(5.95, 1.65, -1.75), new T.Vector3(5.95, 1.45, -0.85)],
    '#c86a11',
    { count: 28, size: 7, parent: flowsGroup }
  );
  casingsGroup.add(ghostRings(bagasseConveyor.curve, 0.12, 6));

  const ethanolLine = stream(
    [new T.Vector3(2.1, 1.05, 0.15), new T.Vector3(3.55, 2.75, 0.1), new T.Vector3(4.5, 1.95, 0.1), new T.Vector3(6.85, 1.35, 1.65)],
    ATLAS_PHASE_HUES.cobalt,
    { count: 24, size: 7.5, parent: flowsGroup }
  );
  const yeastRecycle = stream(
    [new T.Vector3(2.1, 0.45, 0.45), new T.Vector3(1.5, 0.45, 1.35), new T.Vector3(0.85, 1.45, 0.15)],
    ATLAS_PHASE_HUES.emerald,
    { count: 14, size: 6.5, parent: flowsGroup }
  );

  // Pila de bagazo decorativa al pie de la caldera
  const bagassePile = part(new T.ConeGeometry(0.52, 0.55, 14), bagasseMat);
  bagassePile.position.set(4.9, 0.28, -1.5);
  root.add(bagassePile);

  let lastTheta = 0;
  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dRaw) < 180 ? Math.max(0, dRaw) : 0;
    const phi = mod(thetaDeg, BIOETANOL_CANA_CYCLE_DEG);
    const rad = phi * D2R;

    rollers.forEach((r, idx) => {
      r.rotation.z = (idx % 2 === 0 ? 1 : -1) * rad * 5;
    });
    yeastCentrifuge.rotation.y = rad * 8;
    turbineRotor.rotation.x = rad * 12;
    fermFill.scale.y = 0.96 + 0.04 * Math.sin(rad * 3);

    const rate = stepDeg * (0.0042 + 0.002 * loadFactor);
    juiceStream.advance(rate * 1.1);
    bagasseConveyor.advance(rate * 0.95);
    ethanolLine.advance(rate * 1.1);
    yeastRecycle.advance(rate * 1.0);

    const p = Math.min(4, Math.floor(phi / 72));
    juiceStream.mat.opacity = p <= 2 ? 1.0 : 0.5;
    bagasseConveyor.mat.opacity = p === 0 || p === 4 ? 1.0 : 0.5;
    ethanolLine.mat.opacity = p >= 3 ? 1.0 : 0.5;
    yeastRecycle.mat.opacity = p === 2 ? 1.0 : 0.45;
  }

  const callouts: CalloutAnchorDef[] = [
    { ...BIOETANOL_CANA_CALLOUT_META[0]!, at: (v) => v.set(-6.15, 0.95, 0.15) },
    { ...BIOETANOL_CANA_CALLOUT_META[1]!, at: (v) => v.set(-4.35, 1.45, 0.15) },
    { ...BIOETANOL_CANA_CALLOUT_META[2]!, at: (v) => v.set(-1.1, 1.95, 0.15) },
    { ...BIOETANOL_CANA_CALLOUT_META[3]!, at: (v) => v.set(-1.35, 1.45, -1.35) },
    { ...BIOETANOL_CANA_CALLOUT_META[4]!, at: (v) => v.set(0.85, 1.95, 0.15) },
    { ...BIOETANOL_CANA_CALLOUT_META[5]!, at: (v) => v.set(2.1, 1.05, 0.15) },
    { ...BIOETANOL_CANA_CALLOUT_META[6]!, at: (v) => v.set(3.55, 2.85, 0.1) },
    { ...BIOETANOL_CANA_CALLOUT_META[7]!, at: (v) => v.set(4.5, 1.85, 0.1) },
    { ...BIOETANOL_CANA_CALLOUT_META[8]!, at: (v) => v.set(5.95, 2.25, -0.85) },
    { ...BIOETANOL_CANA_CALLOUT_META[9]!, at: (v) => v.set(6.85, 1.3, 1.65) },
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
