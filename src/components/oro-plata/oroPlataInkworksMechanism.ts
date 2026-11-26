import {
  ATLAS_PHASE_HUES,
  D2R,
  mod,
  type CalloutAnchorDef,
  type InkworksKit,
} from '@/lib/inkworks-kit';
import type { MechanismModel3D, OverviewCameraDef3D, ProcessPhaseDef3D } from '../ProcessAnatomy3DPlayer';

export const ORO_PLATA_CYCLE_DEG = 360;

export const ORO_PLATA_PHASES: ProcessPhaseDef3D[] = [
  {
    index: 0,
    code: '01',
    name: 'Chancado y molienda SAG/bolas',
    short: 'Molienda SAG',
    pasoId: 'oro-p1-molienda',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [-4.5, 1.1, 0.1],
    cameraDir: [2.7, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'El mineral epitermal de oro y plata del Macizo del Deseado (Santa Cruz) se muele en circuito húmedo SAG y bolas debajo de 75 micras con cal (pH >10,5) para liberar las partículas metálicas.',
    inputLabel: 'Mena epitermal de cuarzo con Au/Ag + cal (CaO) + agua',
    machineAction: 'Molino SAG y molino de bolas con hidrociclones clasificadores',
    outputLabel: 'Pulpa fina alcalina (<75 µm) hacia tanques de lixiviación',
    tempDisplay: 'Ambiente (15-20 °C)',
    tempC: 20,
  },
  {
    index: 1,
    code: '02',
    name: 'Lixiviación cianurada agitada',
    short: 'Lixiviación',
    pasoId: 'oro-p2-lixiviacion',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [-1.4, 1.35, -0.1],
    cameraDir: [2.6, 3.2, 7.5],
    cameraRadius: 3.1,
    summary:
      'En el tren de tanques agitados con inyección de oxígeno, el cianuro de sodio disuelve oro y plata formando complejos solubles estables (Na[Au(CN)2]) bajo estricto control de pH alcalino.',
    inputLabel: 'Pulpa fina alcalina + NaCN + oxígeno disuelto',
    machineAction: 'Tren en serie de tanques agitados de lixiviación',
    outputLabel: 'Solución rica en oro/plata + relaves agotados',
    tempDisplay: '15-25 °C · pH >10,5',
    tempC: 20,
  },
  {
    index: 2,
    code: '03',
    name: 'Precipitación Merrill-Crowe con Zn',
    short: 'Merrill-Crowe',
    pasoId: 'oro-p3-precipitacion',
    startDeg: 144,
    endDeg: 216,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [1.4, 1.45, -0.25],
    cameraDir: [2.5, 3.2, 7.2],
    cameraRadius: 3.0,
    summary:
      'La solución rica se clarifica y desairea al vacío en la torre Crowe; al dosificar polvo de zinc metálico precipitan oro y plata sólidos, y la solución estéril retorna en circuito cerrado a lixiviación.',
    inputLabel: 'Solución rica clarificada + polvo de zinc (Zn)',
    machineAction: 'Torre desaireadora de vacío + filtros prensa de precipitado',
    outputLabel: 'Torta de precipitado Au/Ag + solución estéril reciclada',
    tempDisplay: '20-25 °C · 0,2 bar',
    tempC: 22,
  },
  {
    index: 3,
    code: '04',
    name: 'Fundición y colada de lingote doré',
    short: 'Fundición doré',
    pasoId: 'oro-p4-fundicion-dore',
    startDeg: 216,
    endDeg: 288,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [3.6, 1.1, -0.45],
    cameraDir: [2.4, 3.1, 7.1],
    cameraRadius: 2.9,
    summary:
      'El precipitado se mezcla con fundentes y se funde a 1.150 °C en hornos basculantes para colar barras doré (aleación Au/Ag >95%), principal rubro de exportación metalífera argentina (USD 1.628 M en 2024).',
    inputLabel: 'Precipitado seco Au/Ag + fundentes (bórax, sílice)',
    machineAction: 'Horno de fundición a 1.150 °C + lingoteras de doré',
    outputLabel: 'Barras doré (Au/Ag) + escoria vitrificada reprocesable',
    tempDisplay: '1.100-1.200 °C',
    tempC: 1150,
  },
  {
    index: 4,
    code: '05',
    name: 'Detoxificación INCO y reciclo de agua',
    short: 'Detox INCO',
    pasoId: 'oro-p5-detox-relaves',
    startDeg: 288,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [4.6, 1.15, 0.75],
    cameraDir: [2.6, 3.2, 7.2],
    cameraRadius: 3.0,
    summary:
      'Antes de ir al depósito impermeabilizado, los relaves atraviesan el reactor INCO (SO2 + aire) que oxida el cianuro residual a cianato inocuo y recupera agua clarificada hacia molienda.',
    inputLabel: 'Relaves agotados + SO2 / metabisulfito + aire',
    machineAction: 'Reactor oxidativo INCO + espesador de retorno de agua',
    outputLabel: 'Colas detoxificadas (CNO-) + agua clarificada reciclada',
    tempDisplay: 'Ambiente',
    tempC: 18,
  },
];

export const ORO_PLATA_OVERVIEW_CAMERA: OverviewCameraDef3D = {
  target: [0.0, 1.2, 0.05],
  dir: [3.2, 4.0, 9.5],
  radius: 6.8,
  worldBox: [
    [-5.8, 0.0, -2.1],
    [5.9, 3.4, 2.2],
  ],
};

export const ORO_PLATA_CALLOUT_META = [
  { n: 1, name: 'Molino SAG de mineral Au/Ag', description: 'Reduce la mena cuarzosa epitermal a pulpa fina alcalina (<75 µm).', phaseIndex: 0 },
  { n: 2, name: 'Hidrociclón clasificador', description: 'Separa partículas finas hacia lixiviación y retorna gruesos al molino.', phaseIndex: 0 },
  { n: 3, name: 'Tren de tanques de lixiviación', description: 'Disuelve oro y plata con NaCN + O2 a pH >10,5 (ecuación Elsner).', phaseIndex: 1 },
  { n: 4, name: 'Línea de oxígeno y cal', description: 'Mantiene oxígeno disuelto y alcalinidad segura en todo el tren.', phaseIndex: 1 },
  { n: 5, name: 'Torre de vacío Merrill-Crowe', description: 'Desoxigena la solución rica para precipitar Au/Ag con polvo de Zn.', phaseIndex: 2 },
  { n: 6, name: 'Filtros de precipitado Au/Ag', description: 'Retienen la torta metálica y devuelven la solución estéril al circuito.', phaseIndex: 2 },
  { n: 7, name: 'Horno de fundición (1.150 °C)', description: 'Funde el precipitado con fundentes separando la escoria vitrificada.', phaseIndex: 3 },
  { n: 8, name: 'Barras doré de oro y plata', description: 'Aleación Au/Ag exportada para refinación final (800 t Ag país 24e).', phaseIndex: 3 },
  { n: 9, name: 'Reactor detoxificación INCO', description: 'Oxida cianuro WAD con SO2 y aire formando cianato estable.', phaseIndex: 4 },
  { n: 10, name: 'Espesador de agua recuperada', description: 'Clarifica y recicla agua de proceso hacia la etapa de molienda.', phaseIndex: 4 },
] as const;

export function buildOroPlataMechanism(kit: InkworksKit): MechanismModel3D {
  const { THREE: T, scene, M, part, ghost, ghostRings, stream } = kit;
  const root = new T.Group();
  scene.add(root);
  const casingsGroup = new T.Group();
  const flowsGroup = new T.Group();
  root.add(casingsGroup, flowsGroup);

  const deck = part(new T.BoxGeometry(12.2, 0.16, 4.3), M.concrete);
  deck.position.set(0.0, -0.08, 0);
  root.add(deck);

  // Fase 1: Molino SAG + ciclón clasificador
  const sagDrum = part(new T.CylinderGeometry(0.85, 0.85, 1.3, 24), M.steel);
  sagDrum.rotation.z = Math.PI / 2;
  sagDrum.position.set(-4.65, 0.95, 0.05);
  root.add(sagDrum);
  const cyclone = part(new T.CylinderGeometry(0.22, 0.09, 0.95, 14), M.cobalt);
  cyclone.position.set(-3.45, 1.55, 0.1);
  root.add(cyclone);

  // Fase 2: Tren de 3 tanques de lixiviación con agitadores
  const leachXs = [-2.25, -1.2, -0.15];
  const agitators: ReturnType<typeof part>[] = [];
  for (const lx of leachXs) {
    const tk = part(new T.CylinderGeometry(0.46, 0.46, 1.75, 18), M.emerald);
    tk.position.set(lx, 0.88, -0.15);
    root.add(tk);
    const ag = part(new T.BoxGeometry(0.65, 0.08, 0.14), M.steel);
    ag.position.set(lx, 1.82, -0.15);
    root.add(ag);
    agitators.push(ag);
  }

  // Fase 3: Torre Merrill-Crowe + filtros prensa
  const croweTower = part(new T.CylinderGeometry(0.32, 0.32, 2.5, 18), M.cobalt);
  croweTower.position.set(1.25, 1.25, -0.4);
  root.add(croweTower);
  const filterPress = part(new T.BoxGeometry(1.1, 0.72, 0.65), M.ceramic);
  filterPress.position.set(1.85, 0.55, 0.45);
  root.add(filterPress);
  const filterCase = ghost(new T.BoxGeometry(1.3, 0.92, 0.85));
  filterCase.position.set(1.85, 0.55, 0.45);
  casingsGroup.add(filterCase);

  // Fase 4: Horno doré + lingotes dorados
  const furnace = part(new T.CylinderGeometry(0.56, 0.52, 1.25, 18), M.refractory);
  furnace.position.set(3.45, 0.68, -0.65);
  root.add(furnace);
  const moltenTop = part(new T.CylinderGeometry(0.42, 0.42, 0.1, 16), M.ochreBath);
  moltenTop.position.set(3.45, 1.32, -0.65);
  root.add(moltenTop);
  const ingot1 = part(new T.BoxGeometry(0.48, 0.18, 0.24), M.copper);
  ingot1.position.set(4.55, 0.12, -0.78);
  root.add(ingot1);
  const ingot2 = part(new T.BoxGeometry(0.48, 0.18, 0.24), M.copper);
  ingot2.position.set(4.55, 0.12, -0.42);
  root.add(ingot2);

  // Fase 5: Reactor INCO + espesador de agua recuperada
  const inco = part(new T.CylinderGeometry(0.48, 0.48, 1.45, 18), M.emerald);
  inco.position.set(3.75, 0.72, 0.9);
  root.add(inco);
  const thickener = part(new T.CylinderGeometry(0.88, 0.72, 0.7, 22), M.seaBed);
  thickener.position.set(5.1, 0.38, 0.9);
  root.add(thickener);
  const waterSurface = part(new T.CylinderGeometry(0.82, 0.82, 0.06, 22), M.cobalt);
  waterSurface.position.set(5.1, 0.74, 0.9);
  root.add(waterSurface);

  // Flujos animados
  const sPulp = stream(
    [
      new T.Vector3(-4.65, 1.0, 0.05),
      new T.Vector3(-3.45, 1.55, 0.1),
      new T.Vector3(-2.25, 1.55, -0.15),
      new T.Vector3(-1.2, 1.55, -0.15),
      new T.Vector3(-0.15, 1.55, -0.15),
      new T.Vector3(1.25, 2.0, -0.4),
    ],
    ATLAS_PHASE_HUES.cobalt,
    { count: 24, size: 7.5, parent: flowsGroup }
  );
  const sDore = stream(
    [
      new T.Vector3(1.85, 0.75, 0.45),
      new T.Vector3(2.65, 1.05, -0.2),
      new T.Vector3(3.45, 1.35, -0.65),
      new T.Vector3(4.55, 0.35, -0.6),
    ],
    ATLAS_PHASE_HUES.ochre,
    { count: 16, size: 7.5, parent: flowsGroup }
  );
  const sWaterReturn = stream(
    [
      new T.Vector3(5.1, 0.7, 0.9),
      new T.Vector3(2.0, 0.35, 1.65),
      new T.Vector3(-2.0, 0.35, 1.65),
      new T.Vector3(-4.65, 0.65, 0.8),
    ],
    ATLAS_PHASE_HUES.emerald,
    { count: 22, size: 7.0, parent: flowsGroup }
  );
  casingsGroup.add(ghostRings(sWaterReturn.curve, 0.1, 7));

  const callouts: CalloutAnchorDef[] = [
    { ...ORO_PLATA_CALLOUT_META[0], at: (v) => v.set(-4.65, 1.85, 0.05) },
    { ...ORO_PLATA_CALLOUT_META[1], at: (v) => v.set(-3.45, 2.05, 0.1) },
    { ...ORO_PLATA_CALLOUT_META[2], at: (v) => v.set(-1.2, 1.95, -0.15) },
    { ...ORO_PLATA_CALLOUT_META[3], at: (v) => v.set(-2.25, 1.9, -0.15) },
    { ...ORO_PLATA_CALLOUT_META[4], at: (v) => v.set(1.25, 2.55, -0.4) },
    { ...ORO_PLATA_CALLOUT_META[5], at: (v) => v.set(1.85, 1.05, 0.45) },
    { ...ORO_PLATA_CALLOUT_META[6], at: (v) => v.set(3.45, 1.45, -0.65) },
    { ...ORO_PLATA_CALLOUT_META[7], at: (v) => v.set(4.55, 0.35, -0.6) },
    { ...ORO_PLATA_CALLOUT_META[8], at: (v) => v.set(3.75, 1.55, 0.9) },
    { ...ORO_PLATA_CALLOUT_META[9], at: (v) => v.set(5.1, 0.85, 0.9) },
  ];

  let lastTheta = 0;
  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dRaw) < 180 ? Math.max(0, dRaw) : 0;
    const phi = mod(thetaDeg, ORO_PLATA_CYCLE_DEG);
    const rad = phi * D2R;

    sagDrum.rotation.x = rad * 4;
    for (const ag of agitators) ag.rotation.y = rad * 8;
    const rate = stepDeg * (0.0042 + 0.002 * loadFactor);
    sPulp.advance(rate * 1.1);
    sDore.advance(rate * 1.0);
    sWaterReturn.advance(rate * 1.05);

    const p = Math.min(4, Math.floor(phi / 72));
    sPulp.mat.opacity = p <= 2 ? 1.0 : 0.48;
    sDore.mat.opacity = p === 3 ? 1.0 : 0.48;
    sWaterReturn.mat.opacity = p === 4 ? 1.0 : 0.48;
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
