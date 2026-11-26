import {
  ATLAS_PHASE_HUES,
  D2R,
  mod,
  type CalloutAnchorDef,
  type InkworksKit,
} from '@/lib/inkworks-kit';
import type { MechanismModel3D, OverviewCameraDef3D, ProcessPhaseDef3D } from '../ProcessAnatomy3DPlayer';

export const CEMENTO_CYCLE_DEG = 360;

export const CEMENTO_PHASES: ProcessPhaseDef3D[] = [
  {
    index: 0,
    code: '01',
    name: 'Molienda vertical de crudo (caliza y arcilla)',
    short: 'Molino crudo',
    pasoId: 'cem-p1-crudo',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [-4.6, 1.2, 0.1],
    cameraDir: [2.7, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'En La Calera (Depto. Belgrano, San Luis), 1,56 t de caliza (CaCO3), arcilla y hierro se dosifican por tonelada de clínker y se muelen en un molino vertical de rodillos aprovechando gases del horno.',
    inputLabel: '1,56 t caliza + arcilla + mineral de hierro',
    machineAction: 'Molino vertical de rodillos + silo homogeneizador de crudo',
    outputLabel: '1,55 t de harina cruda seca (<90 µm)',
    tempDisplay: 'Ambiente a 80 °C',
    tempC: 80,
  },
  {
    index: 1,
    code: '02',
    name: 'Torre de ciclones y precalcinador (900 °C)',
    short: 'Precalcinador',
    pasoId: 'cem-p2-precalcinador',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [-1.85, 2.0, -0.2],
    cameraDir: [2.6, 3.3, 7.5],
    cameraRadius: 3.2,
    summary:
      'La harina cruda cae en contracorriente por 5 etapas de ciclones hasta el precalcinador a 900 °C, donde ocurre ~90% de la descarbonatación (0,52 t CO2/t clínker según IPCC Cap. 2.2).',
    inputLabel: '1,55 t harina cruda + gases calientes del horno',
    machineAction: 'Torre intercambiadora de 5 ciclones + precalcinador',
    outputLabel: '1,05 t harina descarbonatada + 0,52 t CO2 de proceso',
    tempDisplay: '850-920 °C',
    tempC: 900,
  },
  {
    index: 2,
    code: '03',
    name: 'Horno rotativo vía seca (1.450 °C)',
    short: 'Horno rotativo',
    pasoId: 'cem-p3-horno-rotativo',
    startDeg: 144,
    endDeg: 216,
    color: ATLAS_PHASE_HUES.red,
    cameraTarget: [0.55, 1.15, -0.15],
    cameraDir: [2.5, 3.2, 7.4],
    cameraRadius: 3.1,
    summary:
      'En el horno rotativo inclinado, la harina sinteriza a 1.450 °C formando los silicatos hidráulicos de calcio (alita C3S y belita C2S) que conforman los nódulos de clínker Portland.',
    inputLabel: '1,05 t harina precalcinada + quemador principal',
    machineAction: 'Horno rotativo refractario con giro continuo',
    outputLabel: '1,00 t de clínker incandescente a 1.350 °C',
    tempDisplay: '1.400-1.450 °C',
    tempC: 1450,
  },
  {
    index: 3,
    code: '04',
    name: 'Enfriador de parrilla y aire terciario',
    short: 'Enfriador parrilla',
    pasoId: 'cem-p4-enfriador-parrilla',
    startDeg: 216,
    endDeg: 288,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [2.85, 0.95, 0.25],
    cameraDir: [2.5, 3.2, 7.2],
    cameraRadius: 2.9,
    summary:
      'El enfriador de parrilla templa bruscamente el clínker por debajo de 100 °C fijando la fase reactiva C3S y devuelve aire terciario a 900 °C al precalcinador en circuito cerrado.',
    inputLabel: '1,00 t clínker a 1.350 °C + aire de enfriamiento',
    machineAction: 'Enfriador de parrillas móviles + ducto de aire terciario',
    outputLabel: '1,00 t clínker enfriado + aire a 900 °C reciclado',
    tempDisplay: '1.350 a 100 °C',
    tempC: 100,
  },
  {
    index: 4,
    code: '05',
    name: 'Molienda con yeso y silos de cemento',
    short: 'Cemento Portland',
    pasoId: 'cem-p5-molienda-cemento',
    startDeg: 288,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [4.85, 1.35, -0.15],
    cameraDir: [2.6, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'El clínker (0,85 t/t) se muele junto con yeso regulador de fragüe (4-5%) y adiciones calizas para obtener cemento Portland CPC/CPN almacenado en silos de despacho.',
    inputLabel: '0,85 t clínker + 0,15 t yeso y adiciones minerales',
    machineAction: 'Molino de cemento + separador dinámico + silos de despacho',
    outputLabel: '1,00 t de Cemento Portland (Blaine >3.200 cm2/g)',
    tempDisplay: '55-95 °C',
    tempC: 85,
  },
];

export const CEMENTO_OVERVIEW_CAMERA: OverviewCameraDef3D = {
  target: [0.05, 1.45, 0.0],
  dir: [3.2, 4.1, 9.6],
  radius: 6.9,
  worldBox: [
    [-6.0, 0.0, -2.2],
    [6.1, 3.8, 2.2],
  ],
};

export const CEMENTO_CALLOUT_META = [
  { n: 1, name: 'Molino vertical de crudo', description: 'Muele y seca caliza y arcilla (1,56 t/t clínker) debajo de 90 µm.', phaseIndex: 0 },
  { n: 2, name: 'Silo homogeneizador de harina', description: 'Estabiliza el módulo químico de cal antes de la torre ciclónica.', phaseIndex: 0 },
  { n: 3, name: 'Torre de 5 ciclones precalcinadora', description: 'Descarbonata ~90% del CaCO3 a 900 °C (0,52 t CO2/t clínker).', phaseIndex: 1 },
  { n: 4, name: 'Filtro de mangas de chimenea', description: 'Abate polvos minerales antes de la descarga controlada de gases.', phaseIndex: 1 },
  { n: 5, name: 'Horno rotativo vía seca (1.450 °C)', description: 'Sinteriza silicato tricálcico (alita C3S) en nódulos de clínker.', phaseIndex: 2 },
  { n: 6, name: 'Quemador principal de sinterización', description: 'Mantiene la zona térmica máxima de clinkerización continua.', phaseIndex: 2 },
  { n: 7, name: 'Enfriador de parrilla móvil', description: 'Templa el clínker de 1.350 °C a <100 °C fijando reactividad.', phaseIndex: 3 },
  { n: 8, name: 'Ducto de aire terciario (900 °C)', description: 'Recicla calor sensible del enfriador hacia el precalcinador.', phaseIndex: 3 },
  { n: 9, name: 'Molino de cemento (clínker + yeso)', description: 'Integra 4-5% de yeso para regular el tiempo de fraguado.', phaseIndex: 4 },
  { n: 10, name: 'Silos de Cemento Portland', description: 'Acopian CPC/CPN en La Calera para despacho a granel y bolsas.', phaseIndex: 4 },
] as const;

export function buildCementoClinkerMechanism(kit: InkworksKit): MechanismModel3D {
  const { THREE: T, scene, M, part, ghost, ghostRings, stream } = kit;
  const root = new T.Group();
  scene.add(root);
  const casingsGroup = new T.Group();
  const flowsGroup = new T.Group();
  root.add(casingsGroup, flowsGroup);

  const deck = part(new T.BoxGeometry(12.6, 0.16, 4.4), M.concrete);
  deck.position.set(0.05, -0.08, 0);
  root.add(deck);

  // Fase 1: Molino vertical + silo crudo
  const rawMill = part(new T.CylinderGeometry(0.55, 0.62, 1.85, 18), M.steel);
  rawMill.position.set(-4.85, 0.92, 0.15);
  root.add(rawMill);
  const rawSilo = part(new T.CylinderGeometry(0.48, 0.48, 2.25, 18), M.alloy);
  rawSilo.position.set(-3.55, 1.12, -0.35);
  root.add(rawSilo);

  // Fase 2: Torre precalcinadora alta + filtro de mangas
  const towerFrame = ghost(new T.BoxGeometry(1.45, 3.55, 1.45));
  towerFrame.position.set(-1.85, 1.78, -0.2);
  casingsGroup.add(towerFrame);
  for (let i = 0; i < 4; i++) {
    const cyc = part(new T.CylinderGeometry(0.28, 0.14, 0.65, 14), M.cobalt);
    cyc.position.set(-1.85 + (i % 2 === 0 ? -0.28 : 0.28), 0.75 + i * 0.72, -0.2);
    root.add(cyc);
  }
  const bagFilter = part(new T.BoxGeometry(0.95, 1.7, 0.85), M.dark);
  bagFilter.position.set(-2.3, 0.85, 1.15);
  root.add(bagFilter);

  // Fase 3: Horno rotativo inclinado
  const kiln = part(new T.CylinderGeometry(0.44, 0.44, 3.05, 22), M.refractory);
  kiln.rotation.z = Math.PI / 2 - 0.07;
  kiln.position.set(0.55, 1.05, -0.18);
  root.add(kiln);
  const burnerHood = part(new T.BoxGeometry(0.65, 1.15, 0.95), M.copper);
  burnerHood.position.set(2.15, 0.72, -0.18);
  root.add(burnerHood);

  // Fase 4: Enfriador de parrilla
  const cooler = part(new T.BoxGeometry(1.35, 0.78, 1.05), M.emerald);
  cooler.position.set(2.95, 0.45, 0.35);
  root.add(cooler);

  // Fase 5: Molino de cemento + silos
  const cemMill = part(new T.CylinderGeometry(0.4, 0.4, 1.25, 18), M.steel);
  cemMill.rotation.z = Math.PI / 2;
  cemMill.position.set(4.2, 0.58, 0.55);
  root.add(cemMill);
  const cemSilo = part(new T.CylinderGeometry(0.58, 0.58, 2.25, 20), M.ceramic);
  cemSilo.position.set(5.2, 1.12, -0.55);
  root.add(cemSilo);
  const cemCap = part(new T.ConeGeometry(0.6, 0.42, 20), M.steel);
  cemCap.position.set(5.2, 2.45, -0.55);
  root.add(cemCap);

  // Flujos animados
  const sClinker = stream(
    [
      new T.Vector3(-4.85, 1.5, 0.15),
      new T.Vector3(-3.55, 2.25, -0.35),
      new T.Vector3(-1.85, 3.35, -0.2),
      new T.Vector3(-1.0, 1.2, -0.18),
      new T.Vector3(2.15, 0.9, -0.18),
      new T.Vector3(2.95, 0.65, 0.35),
      new T.Vector3(4.2, 0.65, 0.55),
      new T.Vector3(5.2, 1.85, -0.55),
    ],
    ATLAS_PHASE_HUES.ochre,
    { count: 28, size: 7.5, parent: flowsGroup }
  );
  const sTertiaryAir = stream(
    [
      new T.Vector3(2.95, 0.95, 0.35),
      new T.Vector3(2.95, 2.1, -1.15),
      new T.Vector3(-1.4, 2.1, -1.15),
      new T.Vector3(-1.85, 1.5, -0.2),
    ],
    ATLAS_PHASE_HUES.red,
    { count: 20, size: 7.2, parent: flowsGroup }
  );
  casingsGroup.add(ghostRings(sTertiaryAir.curve, 0.11, 7));

  const callouts: CalloutAnchorDef[] = [
    { ...CEMENTO_CALLOUT_META[0], at: (v) => v.set(-4.85, 1.9, 0.15) },
    { ...CEMENTO_CALLOUT_META[1], at: (v) => v.set(-3.55, 2.3, -0.35) },
    { ...CEMENTO_CALLOUT_META[2], at: (v) => v.set(-1.85, 3.45, -0.2) },
    { ...CEMENTO_CALLOUT_META[3], at: (v) => v.set(-2.3, 1.78, 1.15) },
    { ...CEMENTO_CALLOUT_META[4], at: (v) => v.set(0.55, 1.55, -0.18) },
    { ...CEMENTO_CALLOUT_META[5], at: (v) => v.set(2.15, 1.38, -0.18) },
    { ...CEMENTO_CALLOUT_META[6], at: (v) => v.set(2.95, 0.95, 0.35) },
    { ...CEMENTO_CALLOUT_META[7], at: (v) => v.set(0.9, 2.15, -1.15) },
    { ...CEMENTO_CALLOUT_META[8], at: (v) => v.set(4.2, 1.05, 0.55) },
    { ...CEMENTO_CALLOUT_META[9], at: (v) => v.set(5.2, 2.68, -0.55) },
  ];

  let lastTheta = 0;
  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dRaw) < 180 ? Math.max(0, dRaw) : 0;
    const phi = mod(thetaDeg, CEMENTO_CYCLE_DEG);
    const rad = phi * D2R;

    kiln.rotation.x = rad * 3;
    cemMill.rotation.x = -rad * 5;
    const rate = stepDeg * (0.0042 + 0.002 * loadFactor);
    sClinker.advance(rate * 1.1);
    sTertiaryAir.advance(rate * 1.15);

    const p = Math.min(4, Math.floor(phi / 72));
    sClinker.mat.opacity = 1.0;
    sTertiaryAir.mat.opacity = p >= 1 && p <= 3 ? 1.0 : 0.48;
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
