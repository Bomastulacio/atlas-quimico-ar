/**
 * Mecanismo 3D de biorrefinería de bioetanol de maíz (Río Cuarto / Villa María, Córdoba):
 * Silos de maíz y molino de martillos -> Jet-cooker enzimático -> Fermentadores cerrados + CO2 ->
 * Destilación y tamices moleculares 3A -> Centrífuga de burlanda DDGS y despacho anhidro.
 */
import { ATLAS_PHASE_HUES, D2R, mod, type CalloutAnchorDef, type InkworksKit } from '@/lib/inkworks-kit';
import type { AnatomyCalloutMeta, MechanismModel3D, OverviewCameraDef3D, ProcessPhaseDef3D } from '../ProcessAnatomy3DPlayer';

export const BIOETANOL_MAIZ_CYCLE_DEG = 360;

export const BIOETANOL_MAIZ_PHASES: ProcessPhaseDef3D[] = [
  {
    index: 0,
    code: '01',
    name: 'Silos de maíz y molienda seca',
    short: 'Maíz y molino',
    pasoId: 'bm-p1-molienda-maiz',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [-5.1, 1.35, 0.15],
    cameraDir: [3.0, 3.3, 7.6],
    cameraRadius: 3.2,
    summary:
      'El maíz cosechado en Córdoba (17,97 Mt en 2024/25) se acopia en silos y pasa por molinos de martillos que producen harina fina para liberar los gránulos de almidón.',
    inputLabel: '3,10 t de grano de maíz seco por tonelada de etanol',
    machineAction: 'Silos de grano + rosca elevadora + molino de martillos',
    outputLabel: '3,08 t de harina integral de maíz (~70% almidón)',
    tempDisplay: '20-30 °C',
    tempC: 25,
  },
  {
    index: 1,
    code: '02',
    name: 'Licuefacción y sacarificación enzimática',
    short: 'Hidrólisis',
    pasoId: 'bm-p2-licuefaccion-sacarificacion',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.red,
    cameraTarget: [-1.95, 1.25, 0.15],
    cameraDir: [2.6, 3.2, 7.4],
    cameraRadius: 3.05,
    summary:
      'La harina empastada con agua y vinaza liviana reciclada se cuece en jet-cooker a 95 °C y las enzimas amilasas hidrolizan el almidón en glucosa fermentable.',
    inputLabel: '3,08 t harina de maíz + agua proceso + amilasas',
    machineAction: 'Jet-cooker de cocción + tanque de licuefacción agitado',
    outputLabel: '2,04 t de glucosa equivalente en mosto hidrolizado',
    tempDisplay: '85-105 °C',
    tempC: 95,
  },
  {
    index: 2,
    code: '03',
    name: 'Fermentación alcohólica y captura de CO2',
    short: 'Fermentación',
    pasoId: 'bm-p3-fermentacion-levaduras',
    startDeg: 144,
    endDeg: 216,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [1.15, 1.35, 0.1],
    cameraDir: [2.5, 3.1, 7.4],
    cameraRadius: 3.1,
    summary:
      'En grandes fermentadores cerrados a 32 °C, las levaduras convierten la glucosa en etanol y CO2 biogénico (0,96 t/t), que se lava y recupera como insumo industrial.',
    inputLabel: '2,04 t de glucosa + levadura Saccharomyces cerevisiae',
    machineAction: 'Batería de fermentadores refrigerados + lavador de CO2',
    outputLabel: 'Vino fermentado (12-15% etanol) + 0,96 t CO2 biogénico',
    tempDisplay: '30-34 °C',
    tempC: 32,
  },
  {
    index: 3,
    code: '04',
    name: 'Destilación y tamices moleculares 3A',
    short: 'Tamices 3A',
    pasoId: 'bm-p4-destilacion-tamices',
    startDeg: 216,
    endDeg: 294,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [3.95, 1.5, 0.1],
    cameraDir: [2.7, 3.1, 7.4],
    cameraRadius: 3.1,
    summary:
      'Las columnas destilan hasta el azeótropo (95,6%) y los lechos de tamices moleculares zeolíticos 3A adsorben el agua remanente en fase vapor para entregar bioetanol anhidro (>99,5%).',
    inputLabel: 'Vino fermentado (12-15% v/v etanol)',
    machineAction: 'Columna destiladora-rectificadora + tamices moleculares 3A',
    outputLabel: '1,00 t de bioetanol anhidro (~1.267 L) + vinaza entera',
    tempDisplay: '78-115 °C',
    tempC: 98,
  },
  {
    index: 4,
    code: '05',
    name: 'Burlanda proteica (DDGS) y despacho',
    short: 'DDGS y despacho',
    pasoId: 'bm-p5-burlanda-despacho',
    startDeg: 294,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [6.15, 1.15, 0.25],
    cameraDir: [3.0, 3.1, 7.0],
    cameraRadius: 3.0,
    summary:
      'La vinaza entera se centrifuga en decanters para obtener burlanda proteica (0,97 t/t) destinada a feedlots cordobeses, reciclando el agua liviana hacia la licuefacción.',
    inputLabel: 'Bioetanol anhidro + vinaza entera rica en proteínas',
    machineAction: 'Centrífuga decantadora + secador DDGS + tanque despacho',
    outputLabel: '1,00 t bioetanol combustible + 0,97 t burlanda WDGS/DDGS',
    tempDisplay: '25-90 °C',
    tempC: 60,
  },
];

export const BIOETANOL_MAIZ_OVERVIEW_CAMERA: OverviewCameraDef3D = {
  target: [0.4, 1.35, 0.1],
  dir: [4.2, 4.0, 9.0],
  radius: 5.2,
  worldBox: [
    [-7.6, -0.4, -2.6],
    [7.6, 3.7, 2.6],
  ],
};

export const BIOETANOL_MAIZ_CALLOUT_META: readonly AnatomyCalloutMeta[] = [
  { n: 1, name: 'Silos de maíz cordobés', description: 'Acopio de grano seco (3,10 t por tonelada de bioetanol anhidro).', phaseIndex: 0 },
  { n: 2, name: 'Molino de martillos', description: 'Molienda seca que transforma el grano en harina fina de almidón.', phaseIndex: 0 },
  { n: 3, name: 'Jet-cooker y tanque enzimático', description: 'Cocción a 95 °C e hidrólisis del almidón a glucosa con amilasas.', phaseIndex: 1 },
  { n: 4, name: 'Línea de reciclo backset', description: 'Retorna vinaza liviana clarificada reduciendo agua fresca.', phaseIndex: 1 },
  { n: 5, name: 'Fermentadores cerrados (32 °C)', description: 'Levaduras convierten glucosa en etanol y CO2 durante 48-60 h.', phaseIndex: 2 },
  { n: 6, name: 'Lavador de CO2 biogénico', description: 'Recupera 0,96 t de CO2 puro de fermentación por tonelada de etanol.', phaseIndex: 2 },
  { n: 7, name: 'Columna destiladora-rectificadora', description: 'Concentra el etanol desde el vino hasta 95,6% azeotrópico.', phaseIndex: 3 },
  { n: 8, name: 'Tamices moleculares 3A', description: 'Deshidratación PSA sin solventes hasta >=99,5% anhidro.', phaseIndex: 3 },
  { n: 9, name: 'Centrífuga y secador DDGS', description: 'Recupera 0,97 t de burlanda proteica para nutrición animal.', phaseIndex: 4 },
  { n: 10, name: 'Tanque de bioetanol anhidro', description: 'Despacho a destilerías para mezcla obligatoria en naftas.', phaseIndex: 4 },
] as const;

export function buildBioetanolMaizMechanism(kit: InkworksKit): MechanismModel3D {
  const { THREE: T, scene, part, ghost, ghostRings, stream, M } = kit;
  const root = new T.Group();
  scene.add(root);
  const casingsGroup = new T.Group();
  const flowsGroup = new T.Group();
  root.add(casingsGroup, flowsGroup);

  const cornMat = kit.toon('#e8c166');
  const mashMat = kit.toon('#e3cb8f', { transparent: true, opacity: 0.48, depthWrite: false, polygonOffset: false });

  const slab = part(new T.BoxGeometry(15.2, 0.28, 4.9), M.concrete);
  slab.position.set(0.2, -0.14, 0);
  root.add(slab);
  const plinth = part(new T.BoxGeometry(15.5, 0.14, 5.1), M.concreteDark);
  plinth.position.set(0.2, -0.34, 0);
  root.add(plinth);

  // Paso 01: 2 Silos de maíz + molino de martillos en corte
  for (const dz of [-0.65, 0.75]) {
    const sBody = part(new T.CylinderGeometry(0.62, 0.62, 1.8, 20), cornMat);
    sBody.position.set(-5.95, 1.05, dz);
    root.add(sBody);
    const sRoof = part(new T.ConeGeometry(0.66, 0.42, 20), M.alloy);
    sRoof.position.set(-5.95, 2.16, dz);
    root.add(sRoof);
  }
  const millHousing = ghost(new T.BoxGeometry(1.15, 1.1, 1.05));
  millHousing.position.set(-4.15, 0.85, 0.15);
  casingsGroup.add(millHousing);
  const millRotor = new T.Group();
  millRotor.position.set(-4.15, 0.82, 0.15);
  const mAxle = part(new T.CylinderGeometry(0.14, 0.14, 0.88, 14), M.carbon);
  mAxle.rotation.x = Math.PI / 2;
  millRotor.add(mAxle);
  for (let i = 0; i < 4; i++) {
    const hammer = part(new T.BoxGeometry(0.58, 0.1, 0.65), M.steel);
    hammer.rotation.z = (i * Math.PI) / 4;
    millRotor.add(hammer);
  }
  root.add(millRotor);

  // Paso 02: Jet-cooker + tanque licuefacción agitado
  const cookerPipe = part(new T.CylinderGeometry(0.24, 0.24, 1.45, 16), M.refractory);
  cookerPipe.rotation.z = Math.PI / 2;
  cookerPipe.position.set(-2.55, 1.45, 0.15);
  root.add(cookerPipe);
  const liqTank = ghost(new T.CylinderGeometry(0.58, 0.58, 1.75, 20));
  liqTank.position.set(-1.35, 1.05, 0.15);
  casingsGroup.add(liqTank);
  const liqFill = part(new T.CylinderGeometry(0.52, 0.52, 1.25, 18), mashMat, { edges: false, outline: false });
  liqFill.position.set(-1.35, 0.8, 0.15);
  root.add(liqFill);

  // Paso 03: 3 Fermentadores + lavador CO2
  const fermPositions = [
    [0.55, -0.55],
    [1.65, -0.55],
    [1.1, 0.75],
  ];
  fermPositions.forEach(([fx, fz], idx) => {
    if (idx === 2) {
      const fShell = ghost(new T.CylinderGeometry(0.56, 0.56, 2.1, 20));
      fShell.position.set(fx!, 1.15, fz!);
      casingsGroup.add(fShell);
      const fLiquid = part(new T.CylinderGeometry(0.5, 0.5, 1.55, 18), M.glassEmerald, { edges: false, outline: false });
      fLiquid.position.set(fx!, 0.9, fz!);
      root.add(fLiquid);
    } else {
      const fSolid = part(new T.CylinderGeometry(0.52, 0.52, 2.05, 20), M.steel);
      fSolid.position.set(fx!, 1.12, fz!);
      root.add(fSolid);
    }
  });
  const co2Scrubber = part(new T.CylinderGeometry(0.26, 0.26, 1.65, 16), M.emerald);
  co2Scrubber.position.set(2.35, 1.0, -1.35);
  root.add(co2Scrubber);

  // Paso 04: Columna destiladora + 2 tamices moleculares 3A
  const distCol = part(new T.CylinderGeometry(0.36, 0.36, 2.95, 18), M.cobalt);
  distCol.position.set(3.55, 1.55, 0.1);
  root.add(distCol);
  for (const dx of [4.45, 4.95]) {
    const sieve = part(new T.CylinderGeometry(0.24, 0.24, 1.85, 16), M.alloy);
    sieve.position.set(dx, 1.05, 0.1);
    root.add(sieve);
  }

  // Paso 05: Centrífuga + secador rotativo DDGS + tanque etanol
  const decanter = part(new T.CylinderGeometry(0.26, 0.34, 1.15, 16), M.steel);
  decanter.rotation.z = Math.PI / 2;
  decanter.position.set(5.95, 0.72, -0.65);
  root.add(decanter);
  const ddgsDryer = part(new T.CylinderGeometry(0.38, 0.38, 1.45, 18), M.ochreBath);
  ddgsDryer.rotation.z = Math.PI / 2;
  ddgsDryer.position.set(6.55, 0.62, 0.35);
  root.add(ddgsDryer);
  const ethTank = part(new T.CylinderGeometry(0.55, 0.55, 1.3, 20), M.cobalt);
  ethTank.position.set(6.55, 0.75, 1.55);
  root.add(ethTank);

  // Flujos
  const grainStream = stream(
    [new T.Vector3(-5.35, 1.45, 0.15), new T.Vector3(-4.15, 1.35, 0.15), new T.Vector3(-2.55, 1.45, 0.15), new T.Vector3(-1.35, 1.55, 0.15)],
    ATLAS_PHASE_HUES.ochre,
    { count: 22, size: 7.5, parent: flowsGroup }
  );
  const mashStream = stream(
    [new T.Vector3(-0.78, 0.85, 0.15), new T.Vector3(1.1, 1.85, 0.75), new T.Vector3(1.1, 0.65, 0.75), new T.Vector3(3.55, 1.4, 0.1)],
    ATLAS_PHASE_HUES.emerald,
    { count: 24, size: 7.5, parent: flowsGroup }
  );
  const ethanolStream = stream(
    [new T.Vector3(3.55, 2.85, 0.1), new T.Vector3(4.7, 1.95, 0.1), new T.Vector3(6.55, 1.45, 1.55)],
    ATLAS_PHASE_HUES.cobalt,
    { count: 20, size: 7.5, parent: flowsGroup }
  );
  const backsetStream = stream(
    [new T.Vector3(5.95, 0.45, -0.65), new T.Vector3(5.95, 0.45, -1.75), new T.Vector3(-1.35, 0.45, -1.75), new T.Vector3(-1.35, 1.3, 0.15)],
    ATLAS_PHASE_HUES.emerald,
    { count: 24, size: 6.5, parent: flowsGroup }
  );
  casingsGroup.add(ghostRings(backsetStream.curve, 0.1, 6));

  let lastTheta = 0;
  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dRaw) < 180 ? Math.max(0, dRaw) : 0;
    const phi = mod(thetaDeg, BIOETANOL_MAIZ_CYCLE_DEG);
    const rad = phi * D2R;

    millRotor.rotation.z = -rad * 8;
    ddgsDryer.rotation.x = rad * 4;
    liqFill.scale.y = 0.96 + 0.04 * Math.sin(rad * 3);

    const rate = stepDeg * (0.0042 + 0.002 * loadFactor);
    grainStream.advance(rate * 1.1);
    mashStream.advance(rate * 1.05);
    ethanolStream.advance(rate * 1.1);
    backsetStream.advance(rate * 0.95);

    const p = Math.min(4, Math.floor(phi / 72));
    grainStream.mat.opacity = p <= 1 ? 1.0 : 0.5;
    mashStream.mat.opacity = p >= 1 && p <= 3 ? 1.0 : 0.5;
    ethanolStream.mat.opacity = p >= 3 ? 1.0 : 0.5;
    backsetStream.mat.opacity = p === 1 || p === 4 ? 1.0 : 0.45;
  }

  const callouts: CalloutAnchorDef[] = [
    { ...BIOETANOL_MAIZ_CALLOUT_META[0]!, at: (v) => v.set(-5.95, 2.05, 0.75) },
    { ...BIOETANOL_MAIZ_CALLOUT_META[1]!, at: (v) => v.set(-4.15, 1.35, 0.15) },
    { ...BIOETANOL_MAIZ_CALLOUT_META[2]!, at: (v) => v.set(-1.35, 1.85, 0.15) },
    { ...BIOETANOL_MAIZ_CALLOUT_META[3]!, at: (v) => v.set(-1.35, 0.55, -1.75) },
    { ...BIOETANOL_MAIZ_CALLOUT_META[4]!, at: (v) => v.set(1.1, 2.05, 0.75) },
    { ...BIOETANOL_MAIZ_CALLOUT_META[5]!, at: (v) => v.set(2.35, 1.75, -1.35) },
    { ...BIOETANOL_MAIZ_CALLOUT_META[6]!, at: (v) => v.set(3.55, 2.85, 0.1) },
    { ...BIOETANOL_MAIZ_CALLOUT_META[7]!, at: (v) => v.set(4.7, 1.85, 0.1) },
    { ...BIOETANOL_MAIZ_CALLOUT_META[8]!, at: (v) => v.set(6.55, 0.95, 0.35) },
    { ...BIOETANOL_MAIZ_CALLOUT_META[9]!, at: (v) => v.set(6.55, 1.35, 1.55) },
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
