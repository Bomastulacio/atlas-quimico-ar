import {
  ATLAS_PHASE_HUES,
  D2R,
  mod,
  type CalloutAnchorDef,
  type InkworksKit,
} from '@/lib/inkworks-kit';
import type { MechanismModel3D, OverviewCameraDef3D, ProcessPhaseDef3D } from '../ProcessAnatomy3DPlayer';

export const OLIVA_CYCLE_DEG = 360;

export const OLIVA_PHASES: ProcessPhaseDef3D[] = [
  {
    index: 0,
    code: '01',
    name: 'Limpieza y molienda de aceitunas frescas',
    short: 'Molienda',
    pasoId: 'oli-p1-limpieza-molienda',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [-4.55, 1.0, 0.15],
    cameraDir: [2.7, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'En los valles de Chilecito y Aimogasta (La Rioja), ~5,5 t de aceitunas recién cosechadas pasan por deshojadora neumática, lavado y molino de martillos en menos de 24 horas.',
    inputLabel: '5,50 t de aceitunas frescas (Arauco, Arbequina, Picual)',
    machineAction: 'Deshojadora neumática + lavadora + molino de martillos inox',
    outputLabel: '5,50 t de pasta homogénea de aceituna',
    tempDisplay: '20-24 °C',
    tempC: 22,
  },
  {
    index: 1,
    code: '02',
    name: 'Malaxado termo-controlado en frío',
    short: 'Malaxado',
    pasoId: 'oli-p2-malaxado',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [-1.75, 1.05, 0.15],
    cameraDir: [2.6, 3.2, 7.2],
    cameraRadius: 2.9,
    summary:
      'Las amasadoras horizontales baten lentamente la pasta durante 30-40 minutos por debajo de 27 °C para coalescecer gotas de aceite sin degradar polifenoles ni aromas.',
    inputLabel: '5,50 t de pasta molida',
    machineAction: 'Batería de amasadoras encamisadas con control <= 27 °C',
    outputLabel: 'Pasta coalescida lista para separación mecánica',
    tempDisplay: '25-27 °C (en frío)',
    tempC: 27,
  },
  {
    index: 2,
    code: '03',
    name: 'Centrifugación decanter horizontal 2 fases',
    short: 'Decanter 2F',
    pasoId: 'oli-p3-decanter-2f',
    startDeg: 144,
    endDeg: 216,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [0.85, 1.0, 0.1],
    cameraDir: [2.5, 3.2, 7.2],
    cameraRadius: 3.0,
    summary:
      'El decanter ecológico de 2 fases gira a 3.200 rpm separando el mosto oleoso del alperujo húmedo sin añadir agua de dilución y eliminando el efluente líquido alpechín.',
    inputLabel: '5,50 t de pasta coalescida a 27 °C',
    machineAction: 'Decanter centrífugo horizontal 2 fases (3.200 rpm)',
    outputLabel: '1,03 t mosto oleoso + 4,47 t alperujo húmedo',
    tempDisplay: '26-27 °C',
    tempC: 27,
  },
  {
    index: 3,
    code: '04',
    name: 'Clarificación en centrífuga vertical',
    short: 'Clarificación',
    pasoId: 'oli-p4-centrifuga-vertical',
    startDeg: 216,
    endDeg: 288,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [2.95, 1.05, 0.05],
    cameraDir: [2.6, 3.2, 7.2],
    cameraRadius: 2.9,
    summary:
      'La centrífuga vertical de platos a 6.500 rpm remueve micro-borras y trazas de agua vegetal dejando aceite de oliva virgen extra limpio con acidez libre <= 0,8%.',
    inputLabel: '1,03 t de mosto oleoso virgen',
    machineAction: 'Centrífuga vertical autodeslodante de discos (6.500 rpm)',
    outputLabel: '1,00 t de aceite de oliva virgen extra clarificado',
    tempDisplay: '24-26 °C',
    tempC: 25,
  },
  {
    index: 4,
    code: '05',
    name: 'Bodega climatizada bajo manta de nitrógeno',
    short: 'Bodega N2',
    pasoId: 'oli-p5-bodega-n2',
    startDeg: 288,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [4.85, 1.25, 0.05],
    cameraDir: [2.6, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'Los tanques de acero inoxidable a 17 °C mantienen el aceite bajo atmósfera inerte de N2 evitando oxidación hasta su despacho (18.140 t exportadas por Argentina en 2024).',
    inputLabel: '1,00 t de AOVE clarificado + nitrógeno N2',
    machineAction: 'Batería de tanques inox inertizados a 17 °C',
    outputLabel: 'Aceite de oliva virgen extra HS 1509.20',
    tempDisplay: '16-18 °C · N2',
    tempC: 17,
  },
];

export const OLIVA_OVERVIEW_CAMERA: OverviewCameraDef3D = {
  target: [0.05, 1.15, 0.05],
  dir: [3.2, 4.0, 9.5],
  radius: 6.8,
  worldBox: [
    [-5.9, 0.0, -2.0],
    [6.0, 3.2, 2.0],
  ],
};

export const OLIVA_CALLOUT_META = [
  { n: 1, name: 'Deshojadora y lavadora', description: 'Limpia aceitunas frescas de Chilecito y Arauco en circuito cerrado.', phaseIndex: 0 },
  { n: 2, name: 'Molino de martillos inox', description: 'Tritura pulpa y carozo preservando compuestos fenólicos.', phaseIndex: 0 },
  { n: 3, name: 'Amasadoras de malaxado (<=27 °C)', description: 'Amasado lento en frío que libera las microgotas de aceite.', phaseIndex: 1 },
  { n: 4, name: 'Bomba dosificadora de pasta', description: 'Mantiene caudal constante hacia el rotor centrífugo.', phaseIndex: 1 },
  { n: 5, name: 'Decanter horizontal 2 fases', description: 'Separa aceite y alperujo a 3.200 rpm sin agregar agua.', phaseIndex: 2 },
  { n: 6, name: 'Tolva de alperujo húmedo', description: 'Recoge 4,47 t/t de subproducto para compostaje o biomasa.', phaseIndex: 2 },
  { n: 7, name: 'Centrífuga vertical de platos', description: 'Pulido final a 6.500 rpm para eliminar trazas de humedad.', phaseIndex: 3 },
  { n: 8, name: 'Filtro de control en línea', description: 'Verifica limpidez y acidez libre <= 0,8% antes de bodega.', phaseIndex: 3 },
  { n: 9, name: 'Tanques inox inertizados (N2)', description: 'Conservan el AOVE a 17 °C protegido del oxígeno.', phaseIndex: 4 },
  { n: 10, name: 'Despacho AOVE (HS 1509.20)', description: 'Exportación argentina 2024: 18.140 t (USD 142,7 M).', phaseIndex: 4 },
] as const;

export function buildAceiteOlivaMechanism(kit: InkworksKit): MechanismModel3D {
  const { THREE: T, scene, M, part, ghost, stream } = kit;
  const root = new T.Group();
  scene.add(root);
  const casingsGroup = new T.Group();
  const flowsGroup = new T.Group();
  root.add(casingsGroup, flowsGroup);

  const deck = part(new T.BoxGeometry(12.4, 0.16, 4.2), M.concrete);
  deck.position.set(0.05, -0.08, 0);
  root.add(deck);

  // Fase 1: Lavadora + molino
  const washer = part(new T.BoxGeometry(1.2, 0.85, 0.95), M.seaBed);
  washer.position.set(-4.95, 0.42, 0.2);
  root.add(washer);
  const mill = part(new T.CylinderGeometry(0.45, 0.45, 0.88, 16), M.steel);
  mill.position.set(-3.55, 0.56, 0.2);
  root.add(mill);

  // Fase 2: Amasadoras malaxado (doble cuerpo) + bomba
  const malax1 = part(new T.CylinderGeometry(0.42, 0.42, 1.55, 18), M.emerald);
  malax1.rotation.z = Math.PI / 2;
  malax1.position.set(-1.9, 0.58, -0.35);
  root.add(malax1);
  const malax2 = part(new T.CylinderGeometry(0.42, 0.42, 1.55, 18), M.emerald);
  malax2.rotation.z = Math.PI / 2;
  malax2.position.set(-1.9, 0.58, 0.65);
  root.add(malax2);
  const malaxCase = ghost(new T.BoxGeometry(1.85, 1.1, 1.95));
  malaxCase.position.set(-1.9, 0.65, 0.15);
  casingsGroup.add(malaxCase);
  const pump = part(new T.CylinderGeometry(0.24, 0.24, 0.52, 14), M.cobalt);
  pump.rotation.z = Math.PI / 2;
  pump.position.set(-0.55, 0.35, 0.15);
  root.add(pump);

  // Fase 3: Decanter horizontal 2 fases + tolva alperujo
  const decanterBody = part(new T.CylinderGeometry(0.36, 0.44, 1.85, 20), M.cobalt);
  decanterBody.rotation.z = Math.PI / 2;
  decanterBody.position.set(0.85, 0.85, 0.1);
  root.add(decanterBody);
  const decanterCase = ghost(new T.CylinderGeometry(0.48, 0.48, 2.0, 16));
  decanterCase.rotation.z = Math.PI / 2;
  decanterCase.position.set(0.85, 0.85, 0.1);
  casingsGroup.add(decanterCase);
  const pomaceBin = part(new T.BoxGeometry(1.1, 0.62, 0.95), M.ochreBath);
  pomaceBin.position.set(0.9, 0.32, 1.25);
  root.add(pomaceBin);

  // Fase 4: Centrífuga vertical + filtro
  const vCent = part(new T.CylinderGeometry(0.38, 0.44, 1.35, 18), M.emerald);
  vCent.position.set(2.75, 0.72, 0.05);
  root.add(vCent);
  const inlineFilter = part(new T.CylinderGeometry(0.24, 0.24, 0.88, 14), M.alloy);
  inlineFilter.position.set(3.65, 0.52, 0.05);
  root.add(inlineFilter);

  // Fase 5: Bodega de 3 tanques inox N2
  const tankOffsets = [
    [4.65, -0.65],
    [4.65, 0.55],
    [5.48, -0.05],
  ] as const;
  tankOffsets.forEach(([tx, tz]) => {
    const tk = part(new T.CylinderGeometry(0.42, 0.42, 2.05, 18), M.steel);
    tk.position.set(tx, 1.04, tz);
    root.add(tk);
  });

  // Flujos animados
  const sPaste = stream(
    [
      new T.Vector3(-4.95, 0.75, 0.2),
      new T.Vector3(-3.55, 0.85, 0.2),
      new T.Vector3(-1.9, 0.85, 0.15),
      new T.Vector3(-0.55, 0.55, 0.15),
      new T.Vector3(0.85, 0.95, 0.1),
    ],
    ATLAS_PHASE_HUES.emerald,
    { count: 22, size: 7.4, parent: flowsGroup }
  );
  const sOil = stream(
    [
      new T.Vector3(1.65, 0.92, 0.1),
      new T.Vector3(2.75, 1.25, 0.05),
      new T.Vector3(3.65, 0.88, 0.05),
      new T.Vector3(4.65, 1.85, 0.05),
      new T.Vector3(5.48, 1.85, -0.05),
    ],
    ATLAS_PHASE_HUES.ochre,
    { count: 18, size: 7.2, parent: flowsGroup }
  );

  const callouts: CalloutAnchorDef[] = [
    { ...OLIVA_CALLOUT_META[0], at: (v) => v.set(-4.95, 0.98, 0.2) },
    { ...OLIVA_CALLOUT_META[1], at: (v) => v.set(-3.55, 1.12, 0.2) },
    { ...OLIVA_CALLOUT_META[2], at: (v) => v.set(-1.9, 1.15, 0.15) },
    { ...OLIVA_CALLOUT_META[3], at: (v) => v.set(-0.55, 0.72, 0.15) },
    { ...OLIVA_CALLOUT_META[4], at: (v) => v.set(0.85, 1.42, 0.1) },
    { ...OLIVA_CALLOUT_META[5], at: (v) => v.set(0.9, 0.75, 1.25) },
    { ...OLIVA_CALLOUT_META[6], at: (v) => v.set(2.75, 1.52, 0.05) },
    { ...OLIVA_CALLOUT_META[7], at: (v) => v.set(3.65, 1.08, 0.05) },
    { ...OLIVA_CALLOUT_META[8], at: (v) => v.set(4.65, 2.18, -0.65) },
    { ...OLIVA_CALLOUT_META[9], at: (v) => v.set(5.48, 2.18, -0.05) },
  ];

  let lastTheta = 0;
  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dRaw) < 180 ? Math.max(0, dRaw) : 0;
    const phi = mod(thetaDeg, OLIVA_CYCLE_DEG);
    const rad = phi * D2R;

    decanterBody.rotation.x = rad * 12;
    vCent.rotation.y = rad * 14;
    const rate = stepDeg * (0.0042 + 0.002 * loadFactor);
    sPaste.advance(rate * 1.0);
    sOil.advance(rate * 1.12);

    const p = Math.min(4, Math.floor(phi / 72));
    sPaste.mat.opacity = p <= 2 ? 1.0 : 0.48;
    sOil.mat.opacity = p >= 2 ? 1.0 : 0.48;
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
