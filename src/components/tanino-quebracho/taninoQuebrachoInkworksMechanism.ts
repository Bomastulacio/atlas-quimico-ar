import {
  ATLAS_PHASE_HUES,
  D2R,
  mod,
  type CalloutAnchorDef,
  type InkworksKit,
} from '@/lib/inkworks-kit';
import type { MechanismModel3D, OverviewCameraDef3D, ProcessPhaseDef3D } from '../ProcessAnatomy3DPlayer';

export const TANINO_CYCLE_DEG = 360;

export const TANINO_PHASES: ProcessPhaseDef3D[] = [
  {
    index: 0,
    code: '01',
    name: 'Chipeado y aserrado de duramen de quebracho',
    short: 'Chipeado',
    pasoId: 'tan-p1-chipeado',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [-4.6, 1.05, 0.15],
    cameraDir: [2.7, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'En Formosa, los rollizos de Schinopsis balansae (quebracho colorado de manejo forestal certificado) se reducen a chips y aserrín calibrado para exponer el duramen rico en polifenoles.',
    inputLabel: '3,30 t de duramen de quebracho colorado',
    machineAction: 'Chipeadora industrial de cuchillas + cinta elevadora',
    outputLabel: '3,30 t de aserrín y chips tánicos listos para difusión',
    tempDisplay: 'Ambiente (25-30 °C)',
    tempC: 28,
  },
  {
    index: 1,
    code: '02',
    name: 'Lixiviación contracorriente en batería de autoclaves',
    short: 'Difusores',
    pasoId: 'tan-p2-extraccion-difusores',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.red,
    cameraTarget: [-1.85, 1.25, 0.15],
    cameraDir: [2.6, 3.2, 7.2],
    cameraRadius: 3.0,
    summary:
      'Una batería de autoclaves difusores lixivia los polifenoles con agua caliente a 110 °C y 2 bar; el aserrín agotado (2,3 t/t) se aprovecha como biomasa en la caldera de cogeneración.',
    inputLabel: 'Chips de quebracho + agua caliente reciclada (110 °C)',
    machineAction: 'Batería de autoclaves difusores presurizados en serie',
    outputLabel: 'Licor tánico diluido (6-8 °Bé) + 2,3 t aserrín agotado',
    tempDisplay: '105-115 °C · 2 bar',
    tempC: 110,
  },
  {
    index: 2,
    code: '03',
    name: 'Evaporación multiefecto al vacío',
    short: 'Evaporadores',
    pasoId: 'tan-p3-evaporacion-multiefecto',
    startDeg: 144,
    endDeg: 216,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [0.6, 1.55, 0.1],
    cameraDir: [2.5, 3.2, 7.3],
    cameraRadius: 3.0,
    summary:
      'Los evaporadores de múltiple efecto al vacío (0,35 bar, 75 °C) concentran el licor hasta ~50% de sólidos evitando oxidación térmica y devolviendo condensados limpios a los difusores.',
    inputLabel: 'Licor tánico diluido + vapor de biomasa',
    machineAction: 'Tren evaporador multiefecto al vacío con reciclo de condensado',
    outputLabel: 'Licor tánico concentrado (~50% sólidos)',
    tempDisplay: '65-85 °C · 0,35 bar',
    tempC: 75,
  },
  {
    index: 3,
    code: '04',
    name: 'Sulfitación y solubilización en frío',
    short: 'Sulfitación',
    pasoId: 'tan-p4-sulfitacion',
    startDeg: 216,
    endDeg: 288,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [2.55, 1.1, 0.1],
    cameraDir: [2.6, 3.2, 7.2],
    cameraRadius: 2.9,
    summary:
      'En reactores agitados a 90 °C se dosifica bisulfito de sodio (NaHSO3) para solubilizar los taninos condensados y obtener especialidades solubles en agua fría para curtiembre y bioactivos.',
    inputLabel: 'Licor tánico 50% + bisulfito de sodio NaHSO3',
    machineAction: 'Reactor sulfitador agitado + tanque pulmón estabilizador',
    outputLabel: 'Extracto tánico soluble listo para atomización',
    tempDisplay: '85-95 °C',
    tempC: 90,
  },
  {
    index: 4,
    code: '05',
    name: 'Secado por atomización (spray drying)',
    short: 'Torre spray',
    pasoId: 'tan-p5-secado-spray',
    startDeg: 288,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [4.65, 1.5, 0.1],
    cameraDir: [2.6, 3.3, 7.4],
    cameraRadius: 3.1,
    summary:
      'La torre spray atomiza el licor concentrado en corriente de aire a 170 °C formando polvo tánico homogéneo (<7% humedad), recuperado en ciclones y filtros de mangas.',
    inputLabel: 'Extracto solubilizado + aire caliente filtrado',
    machineAction: 'Torre de secado por atomización + ciclón y filtro de mangas',
    outputLabel: '1,00 t extracto de quebracho en polvo (HS 3201.10)',
    tempDisplay: '160-180 °C',
    tempC: 170,
  },
];

export const TANINO_OVERVIEW_CAMERA: OverviewCameraDef3D = {
  target: [0.05, 1.35, 0.05],
  dir: [3.2, 4.0, 9.6],
  radius: 6.9,
  worldBox: [
    [-5.9, 0.0, -2.1],
    [6.0, 3.7, 2.1],
  ],
};

export const TANINO_CALLOUT_META = [
  { n: 1, name: 'Patio de rollizos y chipeadora', description: 'Reduce duramen de quebracho colorado a chips calibrados.', phaseIndex: 0 },
  { n: 2, name: 'Cinta elevadora de aserrín', description: 'Alimenta la batería de autoclaves difusores.', phaseIndex: 0 },
  { n: 3, name: 'Batería de autoclaves difusores', description: 'Extrae polifenoles en contracorriente con agua a 110 °C.', phaseIndex: 1 },
  { n: 4, name: 'Caldera de biomasa (aserrín agotado)', description: 'Genera vapor propio quemando el duramen ya agotado.', phaseIndex: 1 },
  { n: 5, name: 'Evaporadores multiefecto al vacío', description: 'Concentran el licor tánico hasta ~50% sólidos a baja T.', phaseIndex: 2 },
  { n: 6, name: 'Lazo de condensado reciclado', description: 'Devuelve agua caliente condensada a los difusores.', phaseIndex: 2 },
  { n: 7, name: 'Reactor de sulfitación (NaHSO3)', description: 'Solubiliza taninos en frío para curtiembre y bioactivos.', phaseIndex: 3 },
  { n: 8, name: 'Tanque pulmón y bomba alta P', description: 'Estabiliza concentración y alimenta los atomizadores.', phaseIndex: 3 },
  { n: 9, name: 'Torre de secado spray (170 °C)', description: 'Seca instantáneamente el extracto en polvo (<7% humedad).', phaseIndex: 4 },
  { n: 10, name: 'Ciclón y filtro de mangas', description: 'Recupera polvo fino de extracto HS 3201.10 para exportación.', phaseIndex: 4 },
] as const;

export function buildTaninoQuebrachoMechanism(kit: InkworksKit): MechanismModel3D {
  const { THREE: T, scene, M, part, ghost, ghostRings, stream } = kit;
  const root = new T.Group();
  scene.add(root);
  const casingsGroup = new T.Group();
  const flowsGroup = new T.Group();
  root.add(casingsGroup, flowsGroup);

  const deck = part(new T.BoxGeometry(12.4, 0.16, 4.3), M.concrete);
  deck.position.set(0.05, -0.08, 0);
  root.add(deck);

  // Fase 1: Chipeadora + cinta
  const chipper = part(new T.BoxGeometry(1.15, 0.92, 0.95), M.ochreBath);
  chipper.position.set(-4.9, 0.46, 0.25);
  root.add(chipper);
  const rotor = part(new T.CylinderGeometry(0.28, 0.28, 0.72, 14), M.copper);
  rotor.rotation.x = Math.PI / 2;
  rotor.position.set(-4.9, 0.56, 0.25);
  root.add(rotor);
  const conveyor = part(new T.BoxGeometry(1.45, 0.18, 0.45), M.alloy);
  conveyor.rotation.z = 0.28;
  conveyor.position.set(-3.65, 0.85, 0.25);
  root.add(conveyor);

  // Fase 2: 3 autoclaves difusores + caldera biomasa atrás
  for (let i = 0; i < 3; i++) {
    const diff = part(new T.CylinderGeometry(0.32, 0.32, 1.75, 16), M.refractory);
    diff.position.set(-2.5 + i * 0.76, 0.88, 0.25);
    root.add(diff);
  }
  const boiler = part(new T.BoxGeometry(1.3, 1.35, 0.95), M.steel);
  boiler.position.set(-1.75, 0.68, -1.15);
  root.add(boiler);

  // Fase 3: Evaporador multiefecto (3 cuerpos) + ghost
  const evapHeights = [2.65, 2.35, 2.05];
  evapHeights.forEach((h, i) => {
    const body = part(new T.CylinderGeometry(0.28, 0.28, h, 16), i === 0 ? M.cobalt : M.alloy);
    body.position.set(0.05 + i * 0.64, h / 2, 0.15);
    root.add(body);
  });
  const evapCase = ghost(new T.BoxGeometry(2.05, 2.85, 0.95));
  evapCase.position.set(0.68, 1.42, 0.15);
  casingsGroup.add(evapCase);

  // Fase 4: Reactor sulfitador + tanque pulmón
  const sulfReactor = part(new T.CylinderGeometry(0.46, 0.46, 1.48, 18), M.emerald);
  sulfReactor.position.set(2.35, 0.74, 0.15);
  root.add(sulfReactor);
  const sulfAgitator = part(new T.CylinderGeometry(0.06, 0.06, 1.72, 10), M.dark);
  sulfAgitator.position.set(2.35, 0.92, 0.15);
  root.add(sulfAgitator);
  const bufferTank = part(new T.CylinderGeometry(0.38, 0.38, 1.25, 16), M.steel);
  bufferTank.position.set(3.3, 0.62, 0.15);
  root.add(bufferTank);

  // Fase 5: Torre spray cónica + filtro de mangas
  const sprayCyl = part(new T.CylinderGeometry(0.62, 0.62, 1.75, 20), M.ceramic);
  sprayCyl.position.set(4.5, 1.95, 0.1);
  root.add(sprayCyl);
  const sprayCone = part(new T.ConeGeometry(0.62, 1.05, 20), M.ochreBath);
  sprayCone.rotation.x = Math.PI;
  sprayCone.position.set(4.5, 0.55, 0.1);
  root.add(sprayCone);
  const baghouse = part(new T.BoxGeometry(0.85, 1.45, 0.85), M.alloy);
  baghouse.position.set(5.55, 0.82, 0.1);
  root.add(baghouse);

  // Flujos animados
  const sMain = stream(
    [
      new T.Vector3(-4.9, 0.75, 0.25),
      new T.Vector3(-2.5, 1.65, 0.25),
      new T.Vector3(-0.98, 1.45, 0.25),
      new T.Vector3(0.05, 2.35, 0.15),
      new T.Vector3(1.33, 1.85, 0.15),
      new T.Vector3(2.35, 1.25, 0.15),
      new T.Vector3(3.3, 1.1, 0.15),
      new T.Vector3(4.5, 2.65, 0.1),
      new T.Vector3(5.55, 1.25, 0.1),
    ],
    ATLAS_PHASE_HUES.ochre,
    { count: 28, size: 7.4, parent: flowsGroup }
  );
  const sCondLoop = stream(
    [
      new T.Vector3(0.7, 0.35, 0.15),
      new T.Vector3(0.7, 0.35, 1.45),
      new T.Vector3(-1.75, 0.35, 1.45),
      new T.Vector3(-1.75, 0.85, 0.55),
    ],
    ATLAS_PHASE_HUES.cobalt,
    { count: 16, size: 6.8, parent: flowsGroup }
  );
  casingsGroup.add(ghostRings(sCondLoop.curve, 0.09, 6));

  const callouts: CalloutAnchorDef[] = [
    { ...TANINO_CALLOUT_META[0], at: (v) => v.set(-4.9, 1.05, 0.25) },
    { ...TANINO_CALLOUT_META[1], at: (v) => v.set(-3.65, 1.15, 0.25) },
    { ...TANINO_CALLOUT_META[2], at: (v) => v.set(-1.75, 1.88, 0.25) },
    { ...TANINO_CALLOUT_META[3], at: (v) => v.set(-1.75, 1.48, -1.15) },
    { ...TANINO_CALLOUT_META[4], at: (v) => v.set(0.05, 2.78, 0.15) },
    { ...TANINO_CALLOUT_META[5], at: (v) => v.set(-0.5, 0.45, 1.45) },
    { ...TANINO_CALLOUT_META[6], at: (v) => v.set(2.35, 1.72, 0.15) },
    { ...TANINO_CALLOUT_META[7], at: (v) => v.set(3.3, 1.38, 0.15) },
    { ...TANINO_CALLOUT_META[8], at: (v) => v.set(4.5, 2.95, 0.1) },
    { ...TANINO_CALLOUT_META[9], at: (v) => v.set(5.55, 1.68, 0.1) },
  ];

  let lastTheta = 0;
  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dRaw) < 180 ? Math.max(0, dRaw) : 0;
    const phi = mod(thetaDeg, TANINO_CYCLE_DEG);
    const rad = phi * D2R;

    rotor.rotation.z = rad * 10;
    sulfAgitator.rotation.y = rad * 8;
    const rate = stepDeg * (0.0042 + 0.002 * loadFactor);
    sMain.advance(rate * 1.05);
    sCondLoop.advance(rate * 0.95);

    const p = Math.min(4, Math.floor(phi / 72));
    sMain.mat.opacity = 1.0;
    sCondLoop.mat.opacity = p === 1 || p === 2 ? 1.0 : 0.45;
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
