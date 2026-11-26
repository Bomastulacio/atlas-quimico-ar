/**
 * Mecanismo 3D completo de la cadena algodonera del Chaco (Las Breñas / Villa Ángela / Sáenz Peña):
 * Playón de módulos en bruto -> Torre de secado y prelimpieza -> Desmotadora de sierras + Silo de semilla ->
 * Prensa hidráulica y tipificación HVI -> Tren químico de descrudado NaOH y blanqueo H2O2 -> Hilatura textil.
 *
 * Construido según la skill `atlas-bocetos-proceso` sobre `src/lib/inkworks-kit.ts`.
 */
import * as THREE from 'three';
import {
  ATLAS_PHASE_HUES,
  D2R,
  mod,
  type CalloutAnchorDef,
  type InkworksKit,
} from '@/lib/inkworks-kit';
import type {
  AnatomyCalloutMeta,
  MechanismModel3D,
  OverviewCameraDef3D,
  ProcessPhaseDef3D,
} from '../ProcessAnatomy3DPlayer';

export const ALGODON_CYCLE_DEG = 360;

export const ALGODON_PHASES: ProcessPhaseDef3D[] = [
  {
    index: 0,
    code: '01',
    name: 'Recepción de módulos y secado',
    short: 'Módulos y secado',
    pasoId: 'alg-p1-recepcion-limpieza',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [-5.1, 1.35, 0.2],
    cameraDir: [3.1, 3.4, 7.6],
    cameraRadius: 3.3,
    summary:
      'El algodón en bruto cosechado en el Chaco (3,0 t por tonelada de fibra) llega en módulos compactados al playón de la desmotadora. Un tubo telescópico lo succiona hacia la torre de secado a 60-80 °C y los cilindros de prelimpieza remueven brácteas, polvo y restos vegetales.',
    inputLabel: '3,00 t de algodón en bruto cosechado (Chaco)',
    machineAction: 'Succión neumática telescópica + torre secadora y prelimpiador',
    outputLabel: '2,70 t de algodón seco y limpio + 0,30 t de restos vegetales',
    tempDisplay: '60-80 °C',
    tempC: 70,
  },
  {
    index: 1,
    code: '02',
    name: 'Desmote mecánico (fibra y semilla)',
    short: 'Desmote sierras',
    pasoId: 'alg-p2-desmote-separacion',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [-1.75, 1.25, 0.15],
    cameraDir: [2.6, 3.3, 7.4],
    cameraRadius: 3.15,
    summary:
      'En los bancos de sierras de desmote (como Buyatti en Las Breñas), discos dentados giran a alta velocidad y arrancan la fibra de celulosa dejando caer la semilla por gravedad hacia un tornillo sinfín y su silo oleaginoso.',
    inputLabel: '2,70 t de algodón en bruto seco y limpio',
    machineAction: 'Bancos de sierras desmotadoras + tornillo sinfín de semilla',
    outputLabel: '1,00 t de fibra cruda (~94% celulosa) + 1,70 t de semilla',
    tempDisplay: '25-35 °C',
    tempC: 30,
  },
  {
    index: 2,
    code: '03',
    name: 'Limpieza de fibra, prensa y HVI',
    short: 'Prensa y HVI',
    pasoId: 'alg-p3-limpieza-fibra-hvi',
    startDeg: 144,
    endDeg: 216,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [1.25, 1.3, 0.2],
    cameraDir: [2.2, 3.1, 7.4],
    cameraRadius: 3.05,
    summary:
      'La fibra pasa por tambores limpiadores que retiran fibrilla corta (linters) y entra a la prensa hidráulica de alta densidad. Cada fardo zunchado se clasifica en laboratorio HVI (longitud, resistencia y micronaire) bajo partida HS 5201.00.',
    inputLabel: '1,00 t de fibra cruda de celulosa',
    machineAction: 'Limpiador de fibra (lint cleaner) + prensa hidráulica + mesa HVI',
    outputLabel: '0,97 t de fardos clasificados HVI + 0,03 t de linters',
    tempDisplay: '20-30 °C',
    tempC: 25,
  },
  {
    index: 3,
    code: '04',
    name: 'Descrudado alcalino y blanqueo H2O2',
    short: 'Blanqueo químico',
    pasoId: 'alg-p4-descrudado-blanqueo',
    startDeg: 216,
    endDeg: 294,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [4.0, 1.25, 0.15],
    cameraDir: [2.5, 3.2, 7.2],
    cameraRadius: 3.05,
    summary:
      'En la planta de pretratamiento húmedo (referencia BAT EU TXT BREF), el baño caliente de soda cáustica (NaOH) saponifica ceras y pectinas naturales. Luego el peróxido de hidrógeno (H2O2) a 90-100 °C blanquea la celulosa sin usar cloro elemental.',
    inputLabel: '0,97 t de fibra clasificada + NaOH + H2O2',
    machineAction: 'Cubas J-Box de descrudado alcalino y reactor de blanqueo H2O2',
    outputLabel: '0,92 t de celulosa purificada y blanqueada + 0,05 t ceras/pectinas',
    tempDisplay: '90-100 °C',
    tempC: 95,
  },
  {
    index: 4,
    code: '05',
    name: 'Cardado, hilatura textil y despacho',
    short: 'Hilatura textil',
    pasoId: 'alg-p5-hilatura-despacho',
    startDeg: 294,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [6.25, 1.05, 0.25],
    cameraDir: [3.1, 3.1, 6.8],
    cameraRadius: 2.95,
    summary:
      'La celulosa limpia se alinea en cardas, se estira en cintas y se tuerce en continuas de hilar open-end o anillo para despachar conos de hilado y tejidos hacia la industria textil argentina y mercados de exportación.',
    inputLabel: '0,92 t de celulosa de algodón blanqueada',
    machineAction: 'Tren de cardado + banco de husos de hilatura y despacho',
    outputLabel: '0,90 t de hilados y tejidos de celulosa + 0,02 t borra corta',
    tempDisplay: '20-25 °C',
    tempC: 22,
  },
];

export const ALGODON_OVERVIEW_CAMERA: OverviewCameraDef3D = {
  target: [0.4, 1.25, 0.1],
  dir: [4.2, 4.1, 9.0],
  radius: 5.2,
  worldBox: [
    [-7.8, -0.4, -2.8],
    [7.8, 3.6, 2.8],
  ],
};

export const ALGODON_CALLOUT_META: readonly AnatomyCalloutMeta[] = [
  {
    n: 1,
    name: 'Módulo de algodón en bruto',
    description: 'Algodón cosechado en campos del Chaco (3,0 t brutas por cada tonelada de fibra).',
    phaseIndex: 0,
  },
  {
    n: 2,
    name: 'Tubo telescópico de succión',
    description: 'Aspira los copos de algodón en bruto desde el playón hacia el secador.',
    phaseIndex: 0,
  },
  {
    n: 3,
    name: 'Torre secadora (70 °C) y ciclón',
    description: 'Reduce la humedad y separa 0,30 t de brácteas, tierra y restos vegetales.',
    phaseIndex: 0,
  },
  {
    n: 4,
    name: 'Banco de sierras desmotadoras',
    description: 'Discos dentados giratorios separan la fibra blanca de la semilla oleaginosa.',
    phaseIndex: 1,
  },
  {
    n: 5,
    name: 'Silo cónico de semilla (1,7 t)',
    description: 'Almacena la semilla separada destinada a molienda de aceite y forraje.',
    phaseIndex: 1,
  },
  {
    n: 6,
    name: 'Ducto de fibra cruda',
    description: 'Transporta 1,00 t de fibra de celulosa (~94% pureza) hacia limpieza fina.',
    phaseIndex: 1,
  },
  {
    n: 7,
    name: 'Limpiador y prensa hidráulica',
    description: 'Retira fibrilla corta y compacta fardos de alta densidad con pistón hidráulico.',
    phaseIndex: 2,
  },
  {
    n: 8,
    name: 'Mesa de clasificación HVI',
    description: 'Controla longitud, micronaire y resistencia para exportación (HS 5201.00).',
    phaseIndex: 2,
  },
  {
    n: 9,
    name: 'Cuba de descrudado (NaOH)',
    description: 'Saponifica ceras y pectinas no celulósicas en baño alcalino caliente.',
    phaseIndex: 3,
  },
  {
    n: 10,
    name: 'Reactor de blanqueo H2O2 (95 °C)',
    description: 'Blanqueo oxidativo libre de cloro elemental con recuperación de licor.',
    phaseIndex: 3,
  },
  {
    n: 11,
    name: 'Cardado y banco de husos',
    description: 'Alinea las fibras purificadas y forma hilado continuo open-end o anillo.',
    phaseIndex: 4,
  },
  {
    n: 12,
    name: 'Bobinas de hilado y despacho',
    description: '0,90 t de hilado de celulosa listo para tejeduría local y comercio exterior.',
    phaseIndex: 4,
  },
] as const;

export function buildAlgodonMechanism(kit: InkworksKit): MechanismModel3D {
  const { THREE: T, scene, part, ghost, ghostRings, stream, M } = kit;

  const root = new T.Group();
  scene.add(root);

  const casingsGroup = new T.Group();
  const flowsGroup = new T.Group();
  root.add(casingsGroup);
  root.add(flowsGroup);

  const cottonMat = kit.toon('#fcfbf7');
  const soilMat = kit.toon('#dfd5c3');
  const seedMat = kit.toon('#c59b63');
  const causticMat = kit.toon('#8cc2ea', {
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    polygonOffset: false,
  });
  const peroxideMat = kit.toon('#76d4ad', {
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    polygonOffset: false,
  });

  /* =========================================================================
     0. BASE INDUSTRIAL CHAQUEÑA: PLAYÓN DE TIERRA + PLATAFORMA DE DESMOTADORA
     ========================================================================= */
  const yardPad = part(new T.BoxGeometry(3.8, 0.24, 5.2), soilMat);
  yardPad.position.set(-5.9, -0.14, 0);
  root.add(yardPad);

  const plantSlab = part(new T.BoxGeometry(11.8, 0.28, 5.2), M.concrete);
  plantSlab.position.set(1.9, -0.12, 0);
  root.add(plantSlab);

  const slabPlinth = part(new T.BoxGeometry(15.6, 0.14, 5.36), M.concreteDark);
  slabPlinth.position.set(0, -0.32, 0);
  root.add(slabPlinth);

  /* =========================================================================
     1. PASO 01: MÓDULO DE ALGODÓN EN BRUTO + SUCCIÓN + TORRE SECADORA + CICLÓN
     ========================================================================= */
  const moduleGroup = new T.Group();
  moduleGroup.position.set(-6.35, 0.0, 0.35);
  root.add(moduleGroup);

  // Chasis remolque modulero
  const trailerBed = part(new T.BoxGeometry(2.05, 0.14, 1.28), M.dark);
  trailerBed.position.set(0, 0.26, 0);
  moduleGroup.add(trailerBed);
  for (const wx of [-0.68, 0.68]) {
    for (const wz of [-0.56, 0.56]) {
      const wheel = part(new T.CylinderGeometry(0.18, 0.18, 0.12, 16), M.carbon);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.18, wz);
      moduleGroup.add(wheel);
    }
  }
  // Bloque de algodón en bruto compactado
  const rawModuleBlock = part(new T.BoxGeometry(1.82, 0.92, 1.12), cottonMat);
  rawModuleBlock.position.set(0, 0.78, 0);
  moduleGroup.add(rawModuleBlock);

  // Torre pórtico y brazo telescópico de succión
  const suctionTower = part(new T.BoxGeometry(0.32, 2.35, 0.32), M.cobalt);
  suctionTower.position.set(-5.0, 1.18, -0.65);
  root.add(suctionTower);

  const suctionArmGroup = new T.Group();
  suctionArmGroup.position.set(-5.0, 2.25, -0.55);
  root.add(suctionArmGroup);

  const armBeam = part(new T.BoxGeometry(1.5, 0.18, 0.22), M.cobalt);
  armBeam.position.set(-0.65, 0, 0.45);
  armBeam.rotation.y = -0.35;
  suctionArmGroup.add(armBeam);

  const suctionNozzle = part(new T.CylinderGeometry(0.13, 0.18, 0.95, 14), M.steel);
  suctionNozzle.position.set(-1.18, -0.52, 0.78);
  suctionArmGroup.add(suctionNozzle);

  // Torre secadora vertical (60-80 °C) en corte con deflectores
  const dryerPos = new T.Vector3(-4.05, 0.02, 0.15);
  const dryerShell = ghost(new T.BoxGeometry(1.15, 2.55, 1.15));
  dryerShell.position.set(dryerPos.x, 1.3, dryerPos.z);
  casingsGroup.add(dryerShell);

  const dryerBase = part(new T.BoxGeometry(1.22, 0.26, 1.22), M.refractory);
  dryerBase.position.set(dryerPos.x, 0.15, dryerPos.z);
  root.add(dryerBase);

  for (let i = 0; i < 4; i++) {
    const baffle = part(new T.BoxGeometry(0.74, 0.06, 0.92), M.copper);
    baffle.position.set(dryerPos.x + (i % 2 === 0 ? -0.12 : 0.12), 0.65 + i * 0.45, dryerPos.z);
    baffle.rotation.z = i % 2 === 0 ? -0.18 : 0.18;
    root.add(baffle);
  }

  // Ciclón de polvo y brácteas atrás de la secadora
  const dustCycloneBody = part(new T.CylinderGeometry(0.38, 0.38, 0.9, 18), M.steel);
  dustCycloneBody.position.set(-4.3, 1.8, -1.45);
  root.add(dustCycloneBody);
  const dustCycloneCone = part(new T.ConeGeometry(0.38, 0.75, 18), M.steel);
  dustCycloneCone.rotation.x = Math.PI;
  dustCycloneCone.position.set(-4.3, 0.98, -1.45);
  root.add(dustCycloneCone);

  /* =========================================================================
     2. PASO 02: BANCO DE SIERRAS DESMOTADORAS + TORNILLO Y SILO DE SEMILLA
     ========================================================================= */
  const ginStandPos = new T.Vector3(-1.85, 0.02, 0.25);
  const ginBase = part(new T.BoxGeometry(1.85, 0.48, 1.35), M.emerald);
  ginBase.position.set(ginStandPos.x, 0.26, ginStandPos.z);
  root.add(ginBase);

  const ginHousing = ghost(new T.BoxGeometry(1.75, 1.35, 1.25));
  ginHousing.position.set(ginStandPos.x, 1.18, ginStandPos.z);
  casingsGroup.add(ginHousing);

  // Eje rotativo con 5 discos de sierra plateados
  const sawShaft = new T.Group();
  sawShaft.position.set(ginStandPos.x, 1.05, ginStandPos.z);
  root.add(sawShaft);

  const axleBar = part(new T.CylinderGeometry(0.08, 0.08, 1.6, 12), M.carbon);
  axleBar.rotation.z = Math.PI / 2;
  sawShaft.add(axleBar);

  for (let i = 0; i < 5; i++) {
    const disc = part(new T.CylinderGeometry(0.36, 0.36, 0.04, 18), M.alloy);
    disc.rotation.z = Math.PI / 2;
    disc.position.x = -0.6 + i * 0.3;
    sawShaft.add(disc);
  }

  // Rodillo cepillo desprendedor (doffer) arriba-atrás
  const dofferRoller = part(new T.CylinderGeometry(0.22, 0.22, 1.5, 16), M.cobalt);
  dofferRoller.rotation.z = Math.PI / 2;
  dofferRoller.position.set(ginStandPos.x, 1.52, ginStandPos.z - 0.15);
  root.add(dofferRoller);

  // Silo cónico de semilla oleaginosa (1,7 t) detrás del banco
  const seedSiloPos = new T.Vector3(-1.5, 0.02, -1.65);
  const seedSiloBody = part(new T.CylinderGeometry(0.68, 0.68, 1.45, 20), seedMat);
  seedSiloBody.position.set(seedSiloPos.x, 1.55, seedSiloPos.z);
  root.add(seedSiloBody);
  const seedSiloRoof = part(new T.ConeGeometry(0.72, 0.45, 20), M.alloy);
  seedSiloRoof.position.set(seedSiloPos.x, 2.5, seedSiloPos.z);
  root.add(seedSiloRoof);
  const seedSiloHopper = part(new T.ConeGeometry(0.68, 0.65, 20), seedMat);
  seedSiloHopper.rotation.x = Math.PI;
  seedSiloHopper.position.set(seedSiloPos.x, 0.52, seedSiloPos.z);
  root.add(seedSiloHopper);
  for (const [lx, lz] of [
    [-0.45, -0.45],
    [0.45, -0.45],
    [-0.45, 0.45],
    [0.45, 0.45],
  ]) {
    const leg = part(new T.CylinderGeometry(0.05, 0.05, 0.85, 10), M.dark);
    leg.position.set(seedSiloPos.x + lx, 0.42, seedSiloPos.z + lz);
    root.add(leg);
  }

  /* =========================================================================
     3. PASO 03: LIMPIADOR DE FIBRA + PRENSA HIDRÁULICA + MESA HVI
     ========================================================================= */
  // Tambor limpiador (lint cleaner)
  const cleanerDrum = part(new T.CylinderGeometry(0.45, 0.45, 0.9, 18), M.steel);
  cleanerDrum.rotation.x = Math.PI / 2;
  cleanerDrum.position.set(0.15, 1.15, 0.25);
  root.add(cleanerDrum);
  const cleanerStand = part(new T.BoxGeometry(0.85, 0.72, 0.95), M.dark);
  cleanerStand.position.set(0.15, 0.36, 0.25);
  root.add(cleanerStand);

  // Prensa hidráulica de fardos (pórtico azul + pistón móvil + fardo)
  const pressPos = new T.Vector3(1.5, 0.02, 0.25);
  const pressFrameL = part(new T.BoxGeometry(0.18, 2.35, 0.95), M.cobalt);
  pressFrameL.position.set(pressPos.x - 0.52, 1.18, pressPos.z);
  root.add(pressFrameL);
  const pressFrameR = part(new T.BoxGeometry(0.18, 2.35, 0.95), M.cobalt);
  pressFrameR.position.set(pressPos.x + 0.52, 1.18, pressPos.z);
  root.add(pressFrameR);
  const pressHead = part(new T.BoxGeometry(1.25, 0.28, 1.02), M.cobalt);
  pressHead.position.set(pressPos.x, 2.32, pressPos.z);
  root.add(pressHead);
  const pressChamber = ghost(new T.BoxGeometry(0.86, 1.15, 0.86));
  pressChamber.position.set(pressPos.x, 0.75, pressPos.z);
  casingsGroup.add(pressChamber);

  const pressRam = new T.Group();
  pressRam.position.set(pressPos.x, 1.65, pressPos.z);
  root.add(pressRam);
  const ramShaft = part(new T.CylinderGeometry(0.12, 0.12, 0.85, 14), M.alloy);
  ramShaft.position.set(0, 0.32, 0);
  pressRam.add(ramShaft);
  const ramPlaten = part(new T.BoxGeometry(0.82, 0.14, 0.82), M.dark);
  ramPlaten.position.set(0, -0.1, 0);
  pressRam.add(ramPlaten);

  const compressedBale = part(new T.BoxGeometry(0.76, 0.56, 0.74), cottonMat);
  compressedBale.position.set(pressPos.x, 0.34, pressPos.z);
  root.add(compressedBale);

  // Mesa de salida y clasificación HVI
  const hviBench = part(new T.BoxGeometry(1.1, 0.22, 1.05), M.concreteDark);
  hviBench.position.set(1.5, 0.12, 1.48);
  root.add(hviBench);
  const hviBale = part(new T.BoxGeometry(0.62, 0.44, 0.5), cottonMat);
  hviBale.position.set(1.5, 0.45, 1.48);
  root.add(hviBale);

  /* =========================================================================
     4. PASO 04: CUBAS QUÍMICAS EN CORTE (DESCRUDADO NaOH + BLANQUEO H2O2)
     ========================================================================= */
  // Cuba 1: Descrudado alcalino (NaOH 95 °C)
  const scourPos = new T.Vector3(3.35, 0.02, 0.15);
  const scourTank = ghost(new T.BoxGeometry(1.15, 1.35, 1.25));
  scourTank.position.set(scourPos.x, 0.88, scourPos.z);
  casingsGroup.add(scourTank);
  const scourBase = part(new T.BoxGeometry(1.22, 0.22, 1.32), M.steel);
  scourBase.position.set(scourPos.x, 0.12, scourPos.z);
  root.add(scourBase);
  const scourBath = part(new T.BoxGeometry(1.06, 0.82, 1.16), causticMat, {
    edges: false,
    outline: false,
  });
  scourBath.position.set(scourPos.x, 0.65, scourPos.z);
  root.add(scourBath);

  // Cuba 2: Blanqueo oxidativo H2O2 (90-100 °C)
  const bleachPos = new T.Vector3(4.7, 0.02, 0.15);
  const bleachTank = ghost(new T.BoxGeometry(1.15, 1.48, 1.25));
  bleachTank.position.set(bleachPos.x, 0.94, bleachPos.z);
  casingsGroup.add(bleachTank);
  const bleachBase = part(new T.BoxGeometry(1.22, 0.22, 1.32), M.steel);
  bleachBase.position.set(bleachPos.x, 0.12, bleachPos.z);
  root.add(bleachBase);
  const bleachBath = part(new T.BoxGeometry(1.06, 0.92, 1.16), peroxideMat, {
    edges: false,
    outline: false,
  });
  bleachBath.position.set(bleachPos.x, 0.7, bleachPos.z);
  root.add(bleachBath);

  // Rodillos exprimidores entre ambas cubas
  const squeezeRollers: THREE.Object3D[] = [];
  for (const rx of [3.35, 4.02, 4.7]) {
    const roller = part(new T.CylinderGeometry(0.14, 0.14, 1.12, 16), M.alloy);
    roller.rotation.x = Math.PI / 2;
    roller.position.set(rx, 1.46, 0.15);
    root.add(roller);
    squeezeRollers.push(roller);
  }

  // Tanques auxiliares de dosificación NaOH y H2O2 atrás
  const naohTank = part(new T.CylinderGeometry(0.32, 0.32, 1.2, 16), M.cobalt);
  naohTank.position.set(3.35, 0.62, -1.42);
  root.add(naohTank);
  const h2o2Tank = part(new T.CylinderGeometry(0.32, 0.32, 1.2, 16), M.emerald);
  h2o2Tank.position.set(4.7, 0.62, -1.42);
  root.add(h2o2Tank);

  /* =========================================================================
     5. PASO 05: CARDADO, HILATURA TEXTIL Y BOBINAS DE DESPACHO
     ========================================================================= */
  const spinFramePos = new T.Vector3(6.25, 0.02, 0.25);
  const spinBench = part(new T.BoxGeometry(1.75, 0.64, 1.32), M.steel);
  spinBench.position.set(spinFramePos.x, 0.34, spinFramePos.z);
  root.add(spinBench);

  const spindles: THREE.Object3D[] = [];
  for (let i = 0; i < 4; i++) {
    const sp = new T.Group();
    sp.position.set(spinFramePos.x - 0.54 + i * 0.36, 0.88, spinFramePos.z - 0.18);
    const cone = part(new T.CylinderGeometry(0.08, 0.14, 0.44, 14), cottonMat);
    sp.add(cone);
    const tip = part(new T.CylinderGeometry(0.03, 0.03, 0.14, 10), M.emerald);
    tip.position.y = 0.25;
    sp.add(tip);
    root.add(sp);
    spindles.push(sp);
  }

  // Pallet de bobinas terminadas adelante para despacho comercial
  const dispatchPallet = part(new T.BoxGeometry(1.35, 0.14, 0.95), M.refractory);
  dispatchPallet.position.set(6.35, 0.08, 1.48);
  root.add(dispatchPallet);
  for (let i = 0; i < 3; i++) {
    const roll = part(new T.CylinderGeometry(0.18, 0.18, 0.48, 16), cottonMat);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(5.95 + i * 0.4, 0.34, 1.48);
    root.add(roll);
  }

  /* =========================================================================
     6. FLUJOS DE PARTÍCULAS DETERMINISTAS (ACOPLADOS A `theta`)
     ========================================================================= */
  const rawCottonPts = [
    new T.Vector3(-6.2, 1.25, 0.35),
    new T.Vector3(-5.8, 2.05, 0.15),
    new T.Vector3(-4.95, 2.35, -0.15),
    new T.Vector3(-4.05, 2.25, 0.15),
    new T.Vector3(-4.05, 0.55, 0.15),
  ];
  const rawCottonStream = stream(rawCottonPts, ATLAS_PHASE_HUES.ochre, {
    count: 26,
    size: 7.5,
    parent: flowsGroup,
  });
  casingsGroup.add(ghostRings(rawCottonStream.curve, 0.18, 7));

  const ginFeedStream = stream(
    [
      new T.Vector3(-3.45, 0.8, 0.18),
      new T.Vector3(-2.65, 1.45, 0.25),
      new T.Vector3(-1.85, 1.35, 0.25),
    ],
    ATLAS_PHASE_HUES.ochre,
    { count: 16, size: 7, parent: flowsGroup }
  );

  // Separación de semilla (1,7 t) hacia silo oleaginoso
  const seedStream = stream(
    [
      new T.Vector3(-1.85, 0.45, -0.15),
      new T.Vector3(-1.68, 0.95, -0.95),
      new T.Vector3(-1.5, 2.15, -1.65),
    ],
    '#c86a11',
    { count: 18, size: 7, parent: flowsGroup }
  );

  // Fibra cruda (1,0 t) hacia limpiador y prensa HVI
  const fiberStream = stream(
    [
      new T.Vector3(-1.1, 1.52, 0.25),
      new T.Vector3(-0.35, 1.55, 0.25),
      new T.Vector3(0.15, 1.2, 0.25),
      new T.Vector3(0.95, 1.15, 0.25),
      new T.Vector3(1.5, 0.72, 0.25),
    ],
    ATLAS_PHASE_HUES.cobalt,
    { count: 24, size: 7.5, parent: flowsGroup }
  );

  // Tren químico húmedo (NaOH + H2O2) hacia hilatura
  const bleachStream = stream(
    [
      new T.Vector3(2.15, 0.95, 0.2),
      new T.Vector3(3.35, 0.65, 0.15),
      new T.Vector3(4.02, 1.52, 0.15),
      new T.Vector3(4.7, 0.72, 0.15),
      new T.Vector3(5.45, 1.12, 0.22),
      new T.Vector3(6.25, 0.95, 0.25),
    ],
    ATLAS_PHASE_HUES.emerald,
    { count: 28, size: 7.5, parent: flowsGroup }
  );

  /* =========================================================================
     7. CINEMÁTICA DETERMINISTA `pose(theta)`
     ========================================================================= */
  let lastTheta = 0;

  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dThetaRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dThetaRaw) < 180 ? Math.max(0, dThetaRaw) : 0;
    const phi = mod(thetaDeg, ALGODON_CYCLE_DEG);
    const rad = phi * D2R;

    // Paso 01: brazo telescópico recorre el módulo de algodón en bruto
    suctionArmGroup.rotation.y = Math.sin(rad * 2) * 0.22;
    suctionNozzle.position.y = -0.52 + Math.sin(rad * 4) * 0.08;

    // Paso 02: giro continuo del eje de sierras desmotadoras y rodillo cepillo
    sawShaft.rotation.x = rad * 6;
    dofferRoller.rotation.x = -rad * 5;

    // Paso 03: ciclo del tambor limpiador y compresión del pistón de prensa hidráulica
    cleanerDrum.rotation.z = -rad * 4;
    const pressCycle = 0.5 + 0.5 * Math.sin(rad * 3);
    pressRam.position.y = 1.68 - 0.56 * pressCycle;
    compressedBale.scale.y = 1.0 - 0.26 * pressCycle;
    compressedBale.position.y = 0.34 - 0.07 * pressCycle;

    // Paso 04: giro de rodillos exprimidores y agitación suave de baños químicos
    squeezeRollers.forEach((r, idx) => {
      r.rotation.z = -rad * 4 + idx * 0.5;
    });
    scourBath.scale.y = 0.96 + 0.04 * Math.sin(rad * 3);
    bleachBath.scale.y = 0.96 + 0.04 * Math.cos(rad * 3);

    // Paso 05: husos de hilatura girando rápido
    spindles.forEach((sp, idx) => {
      sp.rotation.y = rad * 8 + idx * 0.8;
    });

    // Flujos deterministas acoplados a stepDeg
    const rate = stepDeg * (0.0042 + 0.002 * loadFactor);
    rawCottonStream.advance(rate * 1.15);
    ginFeedStream.advance(rate * 1.1);
    seedStream.advance(rate * 1.05);
    fiberStream.advance(rate * 1.05);
    bleachStream.advance(rate * 1.0);

    const activePhase = Math.min(
      ALGODON_PHASES.length - 1,
      Math.floor(phi / (ALGODON_CYCLE_DEG / ALGODON_PHASES.length))
    );
    rawCottonStream.mat.opacity = activePhase === 0 ? 1.0 : 0.52;
    ginFeedStream.mat.opacity = activePhase <= 1 ? 0.96 : 0.48;
    seedStream.mat.opacity = activePhase === 1 ? 1.0 : 0.55;
    fiberStream.mat.opacity = activePhase === 1 || activePhase === 2 ? 1.0 : 0.52;
    bleachStream.mat.opacity = activePhase >= 3 ? 1.0 : 0.52;
  }

  /* =========================================================================
     8. PUNTOS DE ANCLAJE 3D PARA LAS 2-3 ETIQUETAS POR ETAPA
     ========================================================================= */
  const callouts: CalloutAnchorDef[] = [
    {
      ...ALGODON_CALLOUT_META[0]!,
      at: (v) => v.set(-6.35, 1.05, 0.35),
    },
    {
      ...ALGODON_CALLOUT_META[1]!,
      at: (v) => suctionNozzle.localToWorld(v.set(0, -0.1, 0)),
    },
    {
      ...ALGODON_CALLOUT_META[2]!,
      at: (v) => v.set(-4.05, 2.05, 0.15),
    },
    {
      ...ALGODON_CALLOUT_META[3]!,
      at: (v) => v.set(-1.85, 1.25, 0.35),
    },
    {
      ...ALGODON_CALLOUT_META[4]!,
      at: (v) => v.set(-1.5, 2.15, -1.65),
    },
    {
      ...ALGODON_CALLOUT_META[5]!,
      at: (v) => v.set(-0.55, 1.52, 0.25),
    },
    {
      ...ALGODON_CALLOUT_META[6]!,
      at: (v) => v.set(1.5, 1.95, 0.25),
    },
    {
      ...ALGODON_CALLOUT_META[7]!,
      at: (v) => v.set(1.5, 0.62, 1.48),
    },
    {
      ...ALGODON_CALLOUT_META[8]!,
      at: (v) => v.set(3.35, 1.1, 0.15),
    },
    {
      ...ALGODON_CALLOUT_META[9]!,
      at: (v) => v.set(4.7, 1.15, 0.15),
    },
    {
      ...ALGODON_CALLOUT_META[10]!,
      at: (v) => v.set(6.25, 1.05, 0.15),
    },
    {
      ...ALGODON_CALLOUT_META[11]!,
      at: (v) => v.set(6.35, 0.45, 1.48),
    },
  ];

  return {
    root,
    callouts,
    compactCalloutIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    pose,
    setLayer(key, visible) {
      if (key === 'casings') casingsGroup.visible = visible;
      if (key === 'flows') flowsGroup.visible = visible;
    },
  };
}
