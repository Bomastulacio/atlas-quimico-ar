import {
  ATLAS_PHASE_HUES,
  D2R,
  mod,
  type CalloutAnchorDef,
  type InkworksKit,
} from '@/lib/inkworks-kit';
import type { MechanismModel3D, OverviewCameraDef3D, ProcessPhaseDef3D } from '../ProcessAnatomy3DPlayer';

export const CITRICOS_CYCLE_DEG = 360;

export const CITRICOS_PHASES: ProcessPhaseDef3D[] = [
  {
    index: 0,
    code: '01',
    name: 'Lavado y extracción simultánea de jugo y cáscara',
    short: 'Extracción integral',
    pasoId: 'cit-p1-lavado-extraccion',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [-4.5, 1.05, 0.15],
    cameraDir: [2.7, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'En el polo citrícola de Concordia y Federación (Entre Ríos), ~14 t de naranjas y mandarinas pasan por extractores en línea que separan sin mezclar el jugo interior (6,2 t) y la emulsión de aceite de cáscara.',
    inputLabel: '14,0 t de cítricos dulces frescos (11-12 °Brix)',
    machineAction: 'Lavadora de cepillos + batería de extractores integrales en frío',
    outputLabel: '6,2 t jugo simple + emulsión de D-limoneno + 6,8 t cáscara',
    tempDisplay: 'Ambiente (18-25 °C)',
    tempC: 20,
  },
  {
    index: 1,
    code: '02',
    name: 'Centrifugación bifásica de aceite esencial',
    short: 'Centrífugas aceite',
    pasoId: 'cit-p2-centrifugacion-aceite',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [-1.55, 1.15, -0.45],
    cameraDir: [2.6, 3.2, 7.2],
    cameraRadius: 2.9,
    summary:
      'Dos centrífugas de alta velocidad (desfangadora y pulidora de discos) rompen en frío la emulsión de cáscara obteniendo aceite esencial natural (>90% D-limoneno C10H16) y reciclando agua clarificada.',
    inputLabel: 'Emulsión acuosa fría del flavedo cítrico',
    machineAction: 'Centrífuga desfangadora + pulidora de discos en frío',
    outputLabel: '0,045 t de aceite esencial frío prensado + agua reciclada',
    tempDisplay: '15-22 °C',
    tempC: 18,
  },
  {
    index: 2,
    code: '03',
    name: 'Winterización (-18 °C) de D-limoneno',
    short: 'Descerado frío',
    pasoId: 'cit-p3-descerado-limoneno',
    startDeg: 144,
    endDeg: 216,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [0.95, 1.1, -0.6],
    cameraDir: [2.5, 3.2, 7.2],
    cameraRadius: 2.9,
    summary:
      'El aceite esencial se enfría a -18 °C en tanques winterizadores para precipitar y filtrar las ceras cuticulares, logrando D-limoneno cristalino para bebidas, aromas y química verde.',
    inputLabel: '0,045 t de aceite esencial crudo + frío mecánico',
    machineAction: 'Tanques winterizadores a -18 °C + filtros de ceras + tambores N2',
    outputLabel: '0,043 t de aceite esencial descerado C10H16',
    tempDisplay: '-18 a 0 °C',
    tempC: -18,
  },
  {
    index: 3,
    code: '04',
    name: 'Evaporación multiefecto TASTE al vacío',
    short: 'Evaporador TASTE',
    pasoId: 'cit-p4-evaporacion-taste',
    startDeg: 216,
    endDeg: 288,
    color: ATLAS_PHASE_HUES.red,
    cameraTarget: [2.15, 1.65, 0.55],
    cameraDir: [2.6, 3.3, 7.5],
    cameraRadius: 3.1,
    summary:
      'El jugo filtrado atraviesa el evaporador de película descendente TASTE en 5 a 7 efectos al vacío: concentra de 11 a 65 °Brix en menos de 3 minutos preservando color, vitamina C y aromas.',
    inputLabel: '6,2 t de jugo simple filtrado (11-12 °Brix)',
    machineAction: 'Evaporador multiefecto TASTE al vacío + cámara fría -18 °C',
    outputLabel: '1,00 t de jugo concentrado 65 °Brix (9.778 t exp. país 24)',
    tempDisplay: '45-92 °C · 0,2 bar',
    tempC: 70,
  },
  {
    index: 4,
    code: '05',
    name: 'Prensado con cal y secado de cáscara',
    short: 'Pellets cáscara',
    pasoId: 'cit-p5-secado-cascara',
    startDeg: 288,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [4.65, 1.0, 0.25],
    cameraDir: [2.6, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'Las 6,8 t de cáscara agotada se acondicionan con cal hidratada Ca(OH)2, se prensan y deshidratan en tambor rotativo formando pellets ricos en pectina y fibra para valorización total.',
    inputLabel: '6,8 t de cáscara húmeda + cal hidratada Ca(OH)2',
    machineAction: 'Prensa de tornillo + tambor secador rotativo + peletizadora',
    outputLabel: '1,35 t de cáscara deshidratada / pellets para pectina',
    tempDisplay: '90-120 °C',
    tempC: 110,
  },
];

export const CITRICOS_OVERVIEW_CAMERA: OverviewCameraDef3D = {
  target: [0.05, 1.25, 0.05],
  dir: [3.2, 4.0, 9.5],
  radius: 6.8,
  worldBox: [
    [-5.9, 0.0, -2.1],
    [6.0, 3.6, 2.2],
  ],
};

export const CITRICOS_CALLOUT_META = [
  { n: 1, name: 'Lavadora de naranjas y mandarinas', description: 'Limpia 14 t de fruta fresca de Concordia y Federación.', phaseIndex: 0 },
  { n: 2, name: 'Extractores integrales en frío', description: 'Separan jugo (11 °Brix), emulsión oleosa y cáscara húmeda.', phaseIndex: 0 },
  { n: 3, name: 'Centrífuga desfangadora', description: 'Concentra la emulsión de cáscara y recicla agua clarificada.', phaseIndex: 1 },
  { n: 4, name: 'Pulidora de aceite esencial', description: 'Recupera en frío aceite esencial rico en D-limoneno (>90%).', phaseIndex: 1 },
  { n: 5, name: 'Tanque winterizador (-18 °C)', description: 'Cristaliza y filtra ceras naturales manteniendo aromas intactos.', phaseIndex: 2 },
  { n: 6, name: 'Tambores inertizados de D-limoneno', description: 'Acopian C10H16 descerado para aromas y química verde.', phaseIndex: 2 },
  { n: 7, name: 'Evaporador multiefecto TASTE', description: 'Concentra jugo al vacío hasta 65 °Brix en menos de 3 minutos.', phaseIndex: 3 },
  { n: 8, name: 'Tanque frío de concentrado (-18 °C)', description: 'Preserva jugo concentrado para exportación (USD 35,2 M en 2024).', phaseIndex: 3 },
  { n: 9, name: 'Tambor secador de cáscara', description: 'Deshidrata cáscara prensada con cal para pectina y nutrición.', phaseIndex: 4 },
  { n: 10, name: 'Silo de pellets cítricos', description: 'Completa el aprovechamiento cercano al 100% de la fruta.', phaseIndex: 4 },
] as const;

export function buildCitricosLimonenoMechanism(kit: InkworksKit): MechanismModel3D {
  const { THREE: T, scene, M, part, ghost, ghostRings, stream } = kit;
  const root = new T.Group();
  scene.add(root);
  const casingsGroup = new T.Group();
  const flowsGroup = new T.Group();
  root.add(casingsGroup, flowsGroup);

  const deck = part(new T.BoxGeometry(12.4, 0.16, 4.3), M.concrete);
  deck.position.set(0.05, -0.08, 0);
  root.add(deck);

  // Fase 1: Lavadora + extractores
  const washer = part(new T.BoxGeometry(1.3, 0.72, 1.0), M.seaBed);
  washer.position.set(-4.85, 0.36, 0.25);
  root.add(washer);
  const extractor = part(new T.BoxGeometry(1.15, 1.25, 1.05), M.ochreBath);
  extractor.position.set(-3.35, 0.62, 0.25);
  root.add(extractor);

  // Fase 2: Centrífugas de aceite esencial (línea superior)
  const cent1 = part(new T.CylinderGeometry(0.38, 0.38, 1.05, 18), M.emerald);
  cent1.position.set(-1.85, 0.65, -0.65);
  root.add(cent1);
  const cent2 = part(new T.CylinderGeometry(0.32, 0.32, 0.95, 18), M.emerald);
  cent2.position.set(-0.85, 0.6, -0.65);
  root.add(cent2);

  // Fase 3: Winterizador frío + tambores D-limoneno
  const winterizer = part(new T.CylinderGeometry(0.46, 0.46, 1.55, 18), M.cobalt);
  winterizer.position.set(0.55, 0.78, -0.75);
  root.add(winterizer);
  const drum1 = part(new T.CylinderGeometry(0.24, 0.24, 0.68, 14), M.copper);
  drum1.position.set(1.65, 0.36, -0.92);
  root.add(drum1);
  const drum2 = part(new T.CylinderGeometry(0.24, 0.24, 0.68, 14), M.copper);
  drum2.position.set(1.65, 0.36, -0.35);
  root.add(drum2);

  // Fase 4: Evaporador multiefecto TASTE alto + tanque frío
  const tasteA = part(new T.CylinderGeometry(0.32, 0.32, 3.05, 18), M.steel);
  tasteA.position.set(1.55, 1.52, 0.85);
  root.add(tasteA);
  const tasteB = part(new T.CylinderGeometry(0.32, 0.32, 2.75, 18), M.alloy);
  tasteB.position.set(2.32, 1.38, 0.85);
  root.add(tasteB);
  const tasteCase = ghost(new T.BoxGeometry(1.75, 3.25, 1.05));
  tasteCase.position.set(1.92, 1.62, 0.85);
  casingsGroup.add(tasteCase);
  const concTank = part(new T.CylinderGeometry(0.52, 0.52, 1.55, 18), M.cobalt);
  concTank.position.set(3.45, 0.78, 1.0);
  root.add(concTank);

  // Fase 5: Tambor secador de cáscara + silo pellets
  const peelDryer = part(new T.CylinderGeometry(0.42, 0.42, 1.85, 18), M.refractory);
  peelDryer.rotation.z = Math.PI / 2;
  peelDryer.position.set(4.15, 0.72, -0.45);
  root.add(peelDryer);
  const pelletSilo = part(new T.CylinderGeometry(0.52, 0.52, 1.95, 20), M.ceramic);
  pelletSilo.position.set(5.35, 0.98, 0.45);
  root.add(pelletSilo);
  const pelletCap = part(new T.ConeGeometry(0.54, 0.38, 20), M.ochreBath);
  pelletCap.position.set(5.35, 2.15, 0.45);
  root.add(pelletCap);

  // Flujos animados
  const sOil = stream(
    [
      new T.Vector3(-3.35, 1.05, 0.25),
      new T.Vector3(-1.85, 1.1, -0.65),
      new T.Vector3(-0.85, 1.05, -0.65),
      new T.Vector3(0.55, 1.35, -0.75),
      new T.Vector3(1.65, 0.75, -0.65),
    ],
    ATLAS_PHASE_HUES.emerald,
    { count: 18, size: 7.2, parent: flowsGroup }
  );
  const sJuice = stream(
    [
      new T.Vector3(-4.85, 0.65, 0.25),
      new T.Vector3(-3.35, 0.85, 0.25),
      new T.Vector3(0.2, 0.85, 0.85),
      new T.Vector3(1.55, 2.65, 0.85),
      new T.Vector3(2.32, 2.35, 0.85),
      new T.Vector3(3.45, 1.45, 1.0),
    ],
    ATLAS_PHASE_HUES.ochre,
    { count: 24, size: 7.5, parent: flowsGroup }
  );
  const sWaterLoop = stream(
    [
      new T.Vector3(-1.85, 0.35, -0.65),
      new T.Vector3(-1.85, 0.35, -1.55),
      new T.Vector3(-4.85, 0.35, -1.55),
      new T.Vector3(-4.85, 0.55, -0.2),
    ],
    ATLAS_PHASE_HUES.cobalt,
    { count: 16, size: 6.8, parent: flowsGroup }
  );
  casingsGroup.add(ghostRings(sWaterLoop.curve, 0.09, 6));

  const callouts: CalloutAnchorDef[] = [
    { ...CITRICOS_CALLOUT_META[0], at: (v) => v.set(-4.85, 0.82, 0.25) },
    { ...CITRICOS_CALLOUT_META[1], at: (v) => v.set(-3.35, 1.32, 0.25) },
    { ...CITRICOS_CALLOUT_META[2], at: (v) => v.set(-1.85, 1.25, -0.65) },
    { ...CITRICOS_CALLOUT_META[3], at: (v) => v.set(-0.85, 1.15, -0.65) },
    { ...CITRICOS_CALLOUT_META[4], at: (v) => v.set(0.55, 1.62, -0.75) },
    { ...CITRICOS_CALLOUT_META[5], at: (v) => v.set(1.65, 0.78, -0.65) },
    { ...CITRICOS_CALLOUT_META[6], at: (v) => v.set(1.55, 3.08, 0.85) },
    { ...CITRICOS_CALLOUT_META[7], at: (v) => v.set(3.45, 1.62, 1.0) },
    { ...CITRICOS_CALLOUT_META[8], at: (v) => v.set(4.15, 1.22, -0.45) },
    { ...CITRICOS_CALLOUT_META[9], at: (v) => v.set(5.35, 2.35, 0.45) },
  ];

  let lastTheta = 0;
  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dRaw) < 180 ? Math.max(0, dRaw) : 0;
    const phi = mod(thetaDeg, CITRICOS_CYCLE_DEG);
    const rad = phi * D2R;

    cent1.rotation.y = rad * 10;
    cent2.rotation.y = -rad * 12;
    peelDryer.rotation.x = rad * 4;
    const rate = stepDeg * (0.0042 + 0.002 * loadFactor);
    sOil.advance(rate * 1.05);
    sJuice.advance(rate * 1.1);
    sWaterLoop.advance(rate * 1.0);

    const p = Math.min(4, Math.floor(phi / 72));
    sOil.mat.opacity = p === 1 || p === 2 ? 1.0 : 0.48;
    sJuice.mat.opacity = p === 0 || p === 3 ? 1.0 : 0.48;
    sWaterLoop.mat.opacity = p <= 1 ? 1.0 : 0.48;
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
