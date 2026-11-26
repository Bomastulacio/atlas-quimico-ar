/**
 * Mecanismo 3D completo de Aluar Puerto Madryn (Golfo Nuevo -> Muelle Storni -> Silos ->
 * Ánodos -> Cuba Hall-Héroult en corte -> GTC Reciclo -> Sifonado y Colada Continua).
 *
 * Sigue la regla #1 de Inkworks: una única variable conductora `theta` (0°..360°) gobierna
 * toda la cinemática, el transporte de materiales y los instrumentos, permitiendo reproducir,
 * pausar, avanzar paso a paso o arrastrar la línea de tiempo como un video interactivo a 60 fps.
 */
import {
  ATLAS_PHASE_HUES,
  clamp01,
  D2R,
  mod,
  smooth,
  type CalloutAnchorDef,
  type InkworksKit,
} from '@/lib/inkworks-kit';
import * as THREE from 'three';

export interface AluarPhaseDef {
  index: number;
  code: string;
  name: string;
  short: string;
  pasoId: string;
  startDeg: number;
  endDeg: number;
  color: string;
  cameraTarget: [number, number, number];
  cameraDir: [number, number, number];
  cameraRadius: number;
  summary: string;
  inputLabel: string;
  machineAction: string;
  outputLabel: string;
  tempDisplay: string;
  tempC: number;
}

export const ALUAR_CYCLE_DEG = 360;

export const ALUAR_PHASES: AluarPhaseDef[] = [
  {
    index: 0,
    code: '01',
    name: 'Recepción en Muelle Storni y silos',
    short: 'Muelle y silos',
    pasoId: 'al-p1-alumina',
    startDeg: 0,
    endDeg: 72,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [-4.55, 1.25, 0.35],
    cameraDir: [3.2, 3.6, 7.8],
    cameraRadius: 3.1,
    summary:
      'La alúmina calcinada (polvo blanco de óxido de aluminio) llega por barco al Golfo Nuevo. En el Muelle Almirante Storni, una torre neumática la succiona directo desde las bodegas sin contacto con el aire y la envía por un conducto hermético hasta los silos en costa.',
    inputLabel: 'Alúmina calcinada (Al2O3) importada en buque granelero',
    machineAction: 'Grúa succionadora neumática + cinta cerrada sobre pilotes',
    outputLabel: 'Polvo de Al2O3 almacenado en silos cónicos secos',
    tempDisplay: 'Ambiente',
    tempC: 25,
  },
  {
    index: 1,
    code: '02',
    name: 'Fabricación y cocción de ánodos',
    short: 'Ánodos de carbono',
    pasoId: 'al-p2-anodos',
    startDeg: 72,
    endDeg: 144,
    color: ATLAS_PHASE_HUES.ochre,
    cameraTarget: [-0.35, 1.15, -1.35],
    cameraDir: [4.2, 3.4, 6.2],
    cameraRadius: 2.35,
    summary:
      'El coque de petróleo y la brea se moldean en bloques compactos y se hornean a 1.150 °C. Luego se les fijan varillas conductoras de aluminio-cobre y un monorriel aéreo los transporta listos para sumergirse en las cubas electrolíticas.',
    inputLabel: 'Coque de petróleo calcinado + brea de alquitrán',
    machineAction: 'Horno de cocción refractario + monorriel de envarillado',
    outputLabel: 'Ánodos de carbono precocido con vástago conductor',
    tempDisplay: '1.150 °C',
    tempC: 1150,
  },
  {
    index: 2,
    code: '03',
    name: 'Electrólisis en cubas Hall-Héroult',
    short: 'Electrólisis',
    pasoId: 'al-p3-electrolisis',
    startDeg: 144,
    endDeg: 240,
    color: ATLAS_PHASE_HUES.cobalt,
    cameraTarget: [1.1, 1.25, 0.35],
    cameraDir: [1.8, 2.7, 7.6],
    cameraRadius: 2.45,
    summary:
      'Es el corazón químico de Aluar. Los pistones rompe-costra dosifican alúmina desde la tolva al baño de criolita fundida a 960 °C. Al pasar una gran corriente continua por los ánodos, el oxígeno reacciona con el carbono (CO2) y el aluminio puro cae líquido al fondo.',
    inputLabel: 'Al2O3 desde silos + ánodos de C + 13,51 MWh/t de electricidad',
    machineAction: 'Cuba Hall-Héroult con rompe-costra y barras colectoras DC',
    outputLabel: 'Aluminio líquido (99,7% pureza) en el fondo + gases CO2/HF',
    tempDisplay: '960 °C',
    tempC: 960,
  },
  {
    index: 3,
    code: '04',
    name: 'Captura de gases y reciclo GTC',
    short: 'Reciclo GTC',
    pasoId: 'al-p4-captura-gases',
    startDeg: 240,
    endDeg: 300,
    color: ATLAS_PHASE_HUES.emerald,
    cameraTarget: [3.2, 1.45, -0.85],
    cameraDir: [3.8, 3.1, 6.8],
    cameraRadius: 2.55,
    summary:
      'Los gases aspirados bajo la capota de la cuba arrastran fluoruros (HF). Antes de salir por la chimenea, pasan por ciclones y filtros de mangas donde alúmina fresca absorbe más del 99% del flúor y vuelve a la cuba en circuito cerrado.',
    inputLabel: 'Gases de cuba (CO2 + fluoruros HF) + alúmina fresca',
    machineAction: 'Ciclones de adsorción seca y filtro de mangas GTC',
    outputLabel: 'Alúmina fluorada reciclada a la cuba + aire depurado',
    tempDisplay: '120 °C',
    tempC: 120,
  },
  {
    index: 4,
    code: '05',
    name: 'Sifonado, solidificación y despacho',
    short: 'Colada y lingotes',
    pasoId: 'al-p5-colada',
    startDeg: 300,
    endDeg: 360,
    color: ATLAS_PHASE_HUES.red,
    cameraTarget: [4.95, 0.95, 1.05],
    cameraDir: [3.6, 3.2, 6.6],
    cameraRadius: 2.6,
    summary:
      'Un crisol viajero succiona por vacío el aluminio líquido del fondo de la cuba y lo lleva al horno de mantenimiento. Desde allí corre por el canal de colada hacia moldes refrigerados para solidificar lingotes T, barrotes de extrusión y alambrón.',
    inputLabel: 'Aluminio líquido a 960 °C extraído de las cubas',
    machineAction: 'Crisol de sifonado al vacío + horno basculante + mesa de colada',
    outputLabel: 'Lingotes, placas, barrotes (billets) y bobinas de alambrón',
    tempDisplay: '720 °C',
    tempC: 720,
  },
];

export const ALUAR_OVERVIEW_CAMERA = {
  target: [-0.2, 1.15, 0.05] as [number, number, number],
  dir: [4.8, 4.2, 8.6] as [number, number, number],
  radius: 5.15,
  worldBox: [
    [-8.2, -0.6, -3.1],
    [7.6, 3.8, 2.9],
  ] as [[number, number, number], [number, number, number]],
};

export function getPhaseIndexAt(deg: number): number {
  const phi = mod(deg, ALUAR_CYCLE_DEG);
  for (let i = ALUAR_PHASES.length - 1; i >= 0; i--) {
    if (phi >= ALUAR_PHASES[i]!.startDeg) return i;
  }
  return 0;
}

export interface AluarMechanismModel {
  root: THREE.Group;
  callouts: CalloutAnchorDef[];
  compactCalloutIds: number[];
  pose: (thetaDeg: number, dt: number, loadFactor: number) => void;
  setLayer: (key: 'casings' | 'flows', visible: boolean) => void;
}

export function buildAluarMechanism(kit: InkworksKit): AluarMechanismModel {
  const {
    THREE,
    scene,
    part,
    ghost,
    ghostRings,
    inkRing,
    stream,
    M,
    lineMat,
    seaWaveMat,
  } = kit;

  const root = new THREE.Group();
  scene.add(root);

  const casingsGroup = new THREE.Group();
  const flowsGroup = new THREE.Group();
  root.add(casingsGroup);
  root.add(flowsGroup);

  /* =========================================================================
     1. MAR GOLFO NUEVO + COSTA + MUELLE ALMIRANTE STORNI + BUQUE GRANELERO
     ========================================================================= */
  // Lecho marino y volumen de agua translúcida del Golfo Nuevo (X = -8.2 .. -3.4)
  const seaBed = part(new THREE.BoxGeometry(4.8, 0.12, 5.6), M.seaBed);
  seaBed.position.set(-5.8, -0.62, 0);
  root.add(seaBed);

  const seaWater = part(new THREE.BoxGeometry(4.8, 0.72, 5.6), M.sea, {
    edges: 28,
    outline: false,
  });
  seaWater.position.set(-5.8, -0.2, 0);
  root.add(seaWater);

  // Líneas de oleaje animadas sobre el espejo de agua del Golfo Nuevo
  const waveLines: THREE.Line[] = [];
  for (let w = 0; w < 6; w++) {
    const pts: THREE.Vector3[] = [];
    const segs = 28;
    for (let s = 0; s <= segs; s++) {
      const z = -2.45 + (s / segs) * 4.9;
      pts.push(new THREE.Vector3(0, 0, z));
    }
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), seaWaveMat);
    ln.position.set(-7.6 + w * 0.72, 0.17, 0);
    root.add(ln);
    waveLines.push(ln);
  }

  // Plataforma continental / Parque Industrial Pesado Puerto Madryn (X = -3.4 .. +7.6)
  const landSlab = part(new THREE.BoxGeometry(11.0, 0.34, 5.6), M.concrete);
  landSlab.position.set(2.1, -0.02, 0);
  root.add(landSlab);

  // Murallón costero / defensa de ribera en X = -3.4
  const seaWall = part(new THREE.BoxGeometry(0.24, 0.88, 5.62), M.concreteDark);
  seaWall.position.set(-3.4, -0.18, 0);
  root.add(seaWall);

  // Muelle Almirante Storni avanzando mar adentro sobre pilotes (X = -3.4 .. -6.9, Z = -0.15)
  const pierDeck = part(new THREE.BoxGeometry(3.6, 0.16, 1.25), M.concrete);
  pierDeck.position.set(-5.2, 0.42, -0.15);
  root.add(pierDeck);

  // Pilotes cilíndricos hincados en el lecho del Golfo Nuevo
  for (const px of [-6.7, -5.95, -5.2, -4.45, -3.75]) {
    for (const pz of [-0.6, 0.3]) {
      const pile = part(new THREE.CylinderGeometry(0.065, 0.065, 0.96, 14), M.concreteDark);
      pile.position.set(px, -0.12, pz);
      root.add(pile);
    }
  }

  // Rieles de la grúa descargadora sobre el muelle
  for (const rz of [-0.58, 0.28]) {
    const rail = part(
      new THREE.BoxGeometry(3.2, 0.035, 0.04),
      M.dark,
      { outline: false }
    );
    rail.position.set(-5.2, 0.515, rz);
    root.add(rail);
  }

  // Buque Granelero Panamax (Alumina Carrier) amarrado junto al muelle (Z = +1.32)
  const shipGroup = new THREE.Group();
  shipGroup.position.set(-5.55, 0.12, 1.32);
  root.add(shipGroup);

  // Casco esculpido con proa lanzada hacia -X
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-1.85, 0);
  hullShape.lineTo(-1.25, -0.46);
  hullShape.lineTo(1.55, -0.46);
  hullShape.lineTo(1.75, -0.24);
  hullShape.lineTo(1.75, 0.24);
  hullShape.lineTo(1.55, 0.46);
  hullShape.lineTo(-1.25, 0.46);
  hullShape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 0.46, bevelEnabled: false });
  hullGeo.rotateX(-Math.PI / 2);
  const hullMesh = part(hullGeo, M.shipHull);
  hullMesh.position.y = -0.08;
  shipGroup.add(hullMesh);

  // Franja roja de flotación (boot-topping)
  const bootGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 0.12, bevelEnabled: false });
  bootGeo.rotateX(-Math.PI / 2);
  bootGeo.scale(1.006, 1, 1.006);
  const bootMesh = part(bootGeo, M.shipBoot, { outline: false });
  bootMesh.position.y = -0.12;
  shipGroup.add(bootMesh);

  // Casillaje y puente de mando en popa (+X del buque)
  const bridgeBase = part(new THREE.BoxGeometry(0.48, 0.46, 0.72), M.ceramic);
  bridgeBase.position.set(1.36, 0.61, 0);
  shipGroup.add(bridgeBase);
  const bridgeWing = part(new THREE.BoxGeometry(0.28, 0.16, 0.88), M.alloy);
  bridgeWing.position.set(1.32, 0.92, 0);
  shipGroup.add(bridgeWing);
  const funnel = part(new THREE.CylinderGeometry(0.07, 0.085, 0.28, 14), M.shipBoot);
  funnel.position.set(1.48, 0.98, 0);
  shipGroup.add(funnel);

  // 3 Bodegas abiertas con montículos blancos de alúmina calcinada (Al2O3)
  const holdCones: THREE.Group[] = [];
  [-0.85, -0.15, 0.55].forEach((hx) => {
    const coaming = part(new THREE.BoxGeometry(0.56, 0.1, 0.64), M.dark);
    coaming.position.set(hx, 0.42, 0);
    shipGroup.add(coaming);

    const aluminaPile = part(new THREE.ConeGeometry(0.24, 0.26, 20), M.ceramic, {
      edges: false,
    });
    aluminaPile.position.set(hx, 0.48, 0);
    shipGroup.add(aluminaPile);
    holdCones.push(aluminaPile);
  });

  // Torre Pórtico Descargadora Neumática Cobalto (se desplaza en X sobre rieles del muelle)
  const unloaderGroup = new THREE.Group();
  unloaderGroup.position.set(-5.7, 0.52, -0.15);
  root.add(unloaderGroup);

  for (const lx of [-0.28, 0.28]) {
    for (const lz of [-0.42, 0.42]) {
      const leg = part(new THREE.BoxGeometry(0.09, 0.88, 0.09), M.cobalt);
      leg.position.set(lx, 0.44, lz);
      unloaderGroup.add(leg);
    }
  }
  const craneCab = part(new THREE.BoxGeometry(0.76, 0.44, 0.98), M.cobalt);
  craneCab.position.set(0, 1.08, 0);
  unloaderGroup.add(craneCab);

  // Pluma voladiza hacia el buque (+Z) y tubo succionador telescópico vertical
  const boomArm = part(new THREE.BoxGeometry(0.22, 0.18, 2.05), M.cobalt);
  boomArm.position.set(0, 1.38, 0.68);
  unloaderGroup.add(boomArm);

  const suctionPipe = part(new THREE.CylinderGeometry(0.055, 0.055, 0.95, 16), M.steel);
  suctionPipe.position.set(0, 0.86, 1.47);
  unloaderGroup.add(suctionPipe);

  /* =========================================================================
     2. DOS SILOS CÓNICOS DE ALÚMINA + CINTA CERRADA DESDE EL MUELLE
     ========================================================================= */
  const siloPositions: Array<[number, number]> = [
    [-2.35, 0.35],
    [-2.35, -1.15],
  ];
  const siloAnchors: THREE.Vector3[] = [];

  siloPositions.forEach(([sx, sz], idx) => {
    const siloGroup = new THREE.Group();
    siloGroup.position.set(sx, 0.15, sz);
    root.add(siloGroup);

    // Patas anulares de soporte del cono inferior
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const leg = part(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 10), M.dark);
      leg.position.set(Math.cos(a) * 0.42, 0.28, Math.sin(a) * 0.42);
      siloGroup.add(leg);
    }

    const hopper = part(new THREE.CylinderGeometry(0.58, 0.14, 0.52, 28), M.alloy);
    hopper.position.y = 0.56;
    siloGroup.add(hopper);

    if (idx === 0) {
      // Silo delantero en corte fantasma (ghost) para ver el nivel real de polvo blanco adentro!
      const shellGhost = ghost(new THREE.CylinderGeometry(0.58, 0.58, 1.65, 32));
      shellGhost.position.y = 1.64;
      casingsGroup.add(shellGhost);
      shellGhost.position.x += sx;
      shellGhost.position.y += 0.15;
      shellGhost.position.z += sz;

      const innerPowder = part(new THREE.CylinderGeometry(0.52, 0.52, 1.18, 28), M.ceramic, {
        edges: false,
      });
      innerPowder.position.y = 1.41;
      siloGroup.add(innerPowder);
      siloGroup.add(inkRing(0.585, 0.82, lineMat, 40));
      siloGroup.add(inkRing(0.585, 2.46, lineMat, 40));
    } else {
      const shellSolid = part(new THREE.CylinderGeometry(0.56, 0.56, 1.65, 28), M.alloy);
      shellSolid.position.y = 1.64;
      siloGroup.add(shellSolid);
    }

    const roofCone = part(new THREE.ConeGeometry(0.6, 0.34, 28), M.steel);
    roofCone.position.y = 2.63;
    siloGroup.add(roofCone);

    siloAnchors.push(new THREE.Vector3(sx, 2.95, sz));
  });

  // Conducto cerrado hermético sobre el Muelle Storni hasta el tope de los Silos
  const pierConveyorCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5.7, 1.55, 1.25),
    new THREE.Vector3(-5.7, 1.62, -0.15),
    new THREE.Vector3(-4.4, 1.95, -0.05),
    new THREE.Vector3(-3.35, 2.55, 0.15),
    new THREE.Vector3(-2.35, 2.95, 0.35),
  ]);
  root.add(
    part(new THREE.TubeGeometry(pierConveyorCurve, 56, 0.095, 16), M.glass, {
      edges: false,
      outline: false,
    })
  );
  root.add(ghostRings(pierConveyorCurve, 0.098, 8));

  /* =========================================================================
     3. HORNO DE COCCIÓN DE ÁNODOS DE CARBONO + MONORRIEL DE ENVARILLADO
     ========================================================================= */
  const anodePlant = new THREE.Group();
  anodePlant.position.set(-0.55, 0.15, -1.85);
  root.add(anodePlant);

  const bakeBase = part(new THREE.BoxGeometry(2.15, 0.56, 1.25), M.refractory);
  bakeBase.position.y = 0.28;
  anodePlant.add(bakeBase);

  // Carcasa superior de la nave de cocción en ghost
  const bakeHood = ghost(new THREE.BoxGeometry(2.2, 0.62, 1.3));
  bakeHood.position.set(-0.55, 1.04, -1.85);
  casingsGroup.add(bakeHood);

  // Fosas de cocción y chimenea colectora
  for (const fx of [-0.62, 0, 0.62]) {
    const pit = part(new THREE.BoxGeometry(0.46, 0.12, 0.82), M.copper);
    pit.position.set(fx, 0.6, 0);
    anodePlant.add(pit);
  }
  const bakeStack = part(new THREE.CylinderGeometry(0.11, 0.14, 1.15, 18), M.steel);
  bakeStack.position.set(-0.85, 1.12, -0.35);
  anodePlant.add(bakeStack);

  // Riel monorriel aéreo desde planta de ánodos hacia la cuba Hall-Héroult
  const anodeRailPts = [
    new THREE.Vector3(-0.35, 1.78, -1.3),
    new THREE.Vector3(0.15, 1.78, -0.7),
    new THREE.Vector3(0.55, 1.78, -0.2),
  ];
  const anodeRailCurve = new THREE.CatmullRomCurve3(anodeRailPts);
  root.add(
    part(new THREE.TubeGeometry(anodeRailCurve, 24, 0.03, 10), M.dark, { outline: false })
  );

  // Ánodo viajero colgado del monorriel (se mueve hacia la cuba en la Fase 02)
  const travelingAnode = new THREE.Group();
  const travBlock = part(new THREE.BoxGeometry(0.34, 0.24, 0.26), M.carbon);
  travBlock.position.y = -0.36;
  const travRod = part(new THREE.CylinderGeometry(0.03, 0.03, 0.36, 10), M.copper);
  travRod.position.y = -0.14;
  travelingAnode.add(travBlock, travRod);
  root.add(travelingAnode);

  /* =========================================================================
     4. CUBA ELECTROLÍTICA HALL-HÉROULT EN CORTE ABIERTO (ESCALA HERO)
     ========================================================================= */
  const potGroup = new THREE.Group();
  potGroup.position.set(1.1, 0.15, 0.35);
  root.add(potGroup);

  // Cunas transversales de acero ("cradles")
  for (const cx of [-1.2, -0.6, 0, 0.6, 1.2]) {
    const cradle = part(new THREE.BoxGeometry(0.14, 0.22, 1.88), M.steel);
    cradle.position.set(cx, 0.11, 0);
    potGroup.add(cradle);
  }

  // Batea refractaria en U (abierta al frente +Z para ver todas las capas internas!)
  const potFloor = part(new THREE.BoxGeometry(2.9, 0.16, 1.72), M.refractory);
  potFloor.position.set(0, 0.28, 0);
  potGroup.add(potFloor);

  const potBackWall = part(new THREE.BoxGeometry(2.9, 0.66, 0.14), M.steel);
  potBackWall.position.set(0, 0.62, -0.79);
  potGroup.add(potBackWall);

  for (const sx of [-1.38, 1.38]) {
    const sideWall = part(new THREE.BoxGeometry(0.14, 0.66, 1.72), M.steel);
    sideWall.position.set(sx, 0.62, 0);
    potGroup.add(sideWall);
  }

  // Pared frontal como carcasa fantasma (ghost) para ver el interior sin perder volumen
  const frontCutShell = ghost(new THREE.BoxGeometry(2.62, 0.62, 0.1));
  frontCutShell.position.set(1.1, 0.77, 1.16);
  casingsGroup.add(frontCutShell);

  // Bloque catódico de grafito con barras colectoras saliendo al frente
  const cathodeBlock = part(new THREE.BoxGeometry(2.56, 0.18, 1.44), M.carbon);
  cathodeBlock.position.set(0, 0.45, 0);
  potGroup.add(cathodeBlock);

  for (const bx of [-0.9, -0.3, 0.3, 0.9]) {
    const collectorBar = part(new THREE.BoxGeometry(0.1, 0.07, 0.36), M.steel);
    collectorBar.position.set(bx, 0.44, 0.86);
    potGroup.add(collectorBar);
  }

  // Colchón inferior de Aluminio Líquido Puro (Al, 960 °C)
  const moltenAlPad = part(new THREE.BoxGeometry(2.5, 0.17, 1.38), M.moltenAl);
  moltenAlPad.position.set(0, 0.63, 0);
  potGroup.add(moltenAlPad);

  // Baño electrolítico fundido de Criolita (Na3AlF6, ocre brillante)
  const cryoliteBath = part(new THREE.BoxGeometry(2.5, 0.22, 1.38), M.ochreBath);
  cryoliteBath.position.set(0, 0.83, 0);
  potGroup.add(cryoliteBath);

  // Superestructura superior: pórticos, barra colectora DC cobalto y tolva central
  for (const gx of [-1.42, 1.42]) {
    const upright = part(new THREE.BoxGeometry(0.16, 1.85, 0.22), M.alloy);
    upright.position.set(gx, 1.28, 0);
    potGroup.add(upright);
  }
  const topBeam = part(new THREE.BoxGeometry(3.04, 0.2, 0.56), M.alloy);
  topBeam.position.set(0, 2.15, 0);
  potGroup.add(topBeam);

  // Barra ómnibus DC (13,51 MWh/t Al)
  const dcBusbar = part(new THREE.BoxGeometry(2.74, 0.14, 0.16), M.cobalt);
  dcBusbar.position.set(0, 1.72, 0.28);
  potGroup.add(dcBusbar);

  // Tolva dosificadora superior de alúmina sobre la cuba
  const potHopper = part(new THREE.BoxGeometry(1.65, 0.36, 0.48), M.ceramic);
  potHopper.position.set(0, 2.44, 0);
  potGroup.add(potHopper);

  // Capota de captación de gases en ghost
  const gasHoodGhost = ghost(new THREE.BoxGeometry(2.68, 0.72, 1.54));
  gasHoodGhost.position.set(1.1, 1.58, 0.35);
  casingsGroup.add(gasHoodGhost);

  // 4 Ánodos de carbono sumergidos en el baño con sus vástagos de cobre
  const submergedAnodes = new THREE.Group();
  potGroup.add(submergedAnodes);
  for (const ax of [-0.9, -0.3, 0.3, 0.9]) {
    const anodeBlock = part(new THREE.BoxGeometry(0.44, 0.32, 0.86), M.carbon);
    anodeBlock.position.set(ax, 1.06, 0);
    const stem = part(new THREE.CylinderGeometry(0.038, 0.038, 0.56, 12), M.copper);
    stem.position.set(ax, 1.48, 0.18);
    submergedAnodes.add(anodeBlock, stem);
  }

  // 2 Pistones Rompe-Costra móviles ("point-feeders") que bajan a inyectar Al2O3
  const crustBreakers = new THREE.Group();
  potGroup.add(crustBreakers);
  for (const px of [-0.6, 0.6]) {
    const chisel = part(new THREE.CylinderGeometry(0.045, 0.025, 0.62, 12), M.cobalt);
    chisel.position.set(px, 1.48, -0.02);
    crustBreakers.add(chisel);
  }

  // Transporte Neumático Denso: Cono del Silo -> Tolva de la Cuba
  const siloToPotCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.35, 0.5, 0.35),
    new THREE.Vector3(-1.75, 0.55, 0.55),
    new THREE.Vector3(-1.15, 2.55, 0.45),
    new THREE.Vector3(0.28, 2.62, 0.35),
  ]);
  root.add(
    part(new THREE.TubeGeometry(siloToPotCurve, 52, 0.08, 14), M.glass, {
      edges: false,
      outline: false,
    })
  );
  root.add(ghostRings(siloToPotCurve, 0.082, 7));

  /* =========================================================================
     5. CENTRO DE TRATAMIENTO DE GASES (GTC) Y RETORNO DE ALÚMINA FLUORADA
     ========================================================================= */
  const gtcGroup = new THREE.Group();
  gtcGroup.position.set(4.15, 0.15, -1.55);
  root.add(gtcGroup);

  for (const cx of [-0.45, 0.32]) {
    const cycBody = part(new THREE.CylinderGeometry(0.36, 0.36, 0.86, 24), M.emerald);
    cycBody.position.set(cx, 1.12, 0);
    const cycCone = part(new THREE.CylinderGeometry(0.36, 0.09, 0.48, 24), M.emerald);
    cycCone.position.set(cx, 0.45, 0);
    gtcGroup.add(cycBody, cycCone);
  }

  // Casa de filtros de mangas + chimenea de aire depurado
  const baghouse = part(new THREE.BoxGeometry(0.95, 1.35, 0.95), M.alloy);
  baghouse.position.set(1.18, 0.68, 0);
  gtcGroup.add(baghouse);

  const cleanStack = part(new THREE.CylinderGeometry(0.11, 0.14, 1.35, 18), M.steel);
  cleanStack.position.set(1.18, 2.02, 0);
  gtcGroup.add(cleanStack);

  // Ducto de aspiración de gases brutos (CO2 + HF): Capota Cuba -> GTC
  const rawGasCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.15, 2.15, 0.15),
    new THREE.Vector3(2.85, 2.48, -0.55),
    new THREE.Vector3(3.7, 1.65, -1.55),
  ]);
  root.add(
    part(new THREE.TubeGeometry(rawGasCurve, 44, 0.095, 14), M.glass, {
      edges: false,
      outline: false,
    })
  );
  root.add(ghostRings(rawGasCurve, 0.098, 6));

  // Ducto verde esmeralda de reciclo de alúmina fluorada (>99%): GTC -> Tolva Cuba
  const recycleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.7, 0.48, -1.55),
    new THREE.Vector3(2.85, 0.62, -0.85),
    new THREE.Vector3(2.2, 2.45, 0.25),
    new THREE.Vector3(1.85, 2.52, 0.35),
  ]);
  root.add(
    part(new THREE.TubeGeometry(recycleCurve, 48, 0.075, 14), M.glassEmerald, {
      edges: false,
      outline: false,
    })
  );
  root.add(ghostRings(recycleCurve, 0.078, 6));

  /* =========================================================================
     6. SIFONADO AL VACÍO, CRISOL VIAJERO, HORNO Y MESA DE COLADA CONTINUA
     ========================================================================= */
  // Vía de traslado del crisol entre la cuba y el horno de fundición
  for (const rz of [0.78, 1.26]) {
    const track = part(new THREE.BoxGeometry(2.15, 0.03, 0.04), M.dark, { outline: false });
    track.position.set(3.65, 0.165, rz);
    root.add(track);
  }

  // Crisol viajero de sifonado por vacío (se desplaza en X durante la Fase 05!)
  const siphonCrucible = new THREE.Group();
  siphonCrucible.position.set(3.05, 0.18, 1.02);
  root.add(siphonCrucible);

  const ladleBody = part(new THREE.CylinderGeometry(0.34, 0.26, 0.62, 24), M.steel);
  ladleBody.position.y = 0.34;
  const ladleLid = part(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 24), M.dark);
  ladleLid.position.y = 0.68;
  // Manga curva de sifón apuntando hacia el baño líquido de la cuba
  const snoutCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.15, 0.72, -0.05),
    new THREE.Vector3(-0.42, 0.92, -0.25),
    new THREE.Vector3(-0.68, 0.56, -0.45),
  ]);
  const snoutPipe = part(new THREE.TubeGeometry(snoutCurve, 20, 0.045, 10), M.refractory);
  siphonCrucible.add(ladleBody, ladleLid, snoutPipe);

  // Horno de mantenimiento y aleación + canal de colada + cinta de lingotes/barrotes/alambrón
  const foundryGroup = new THREE.Group();
  foundryGroup.position.set(5.35, 0.15, 1.15);
  root.add(foundryGroup);

  const holdingFurnace = part(new THREE.BoxGeometry(1.35, 0.86, 1.08), M.refractory);
  holdingFurnace.position.set(-0.25, 0.43, -0.05);
  const furnaceDoor = part(new THREE.BoxGeometry(0.48, 0.34, 0.08), M.ochreBath);
  furnaceDoor.position.set(-0.25, 0.38, 0.51);
  const furnaceStack = part(new THREE.CylinderGeometry(0.09, 0.11, 0.62, 16), M.steel);
  furnaceStack.position.set(-0.25, 1.16, -0.05);
  foundryGroup.add(holdingFurnace, furnaceDoor, furnaceStack);

  // Canal de colada (launder) hacia mesa de moldeo
  const launder = part(new THREE.BoxGeometry(0.75, 0.12, 0.22), M.alloy);
  launder.position.set(0.72, 0.38, 0.05);
  const moltenRunner = part(new THREE.BoxGeometry(0.72, 0.04, 0.12), M.moltenAl, {
    outline: false,
  });
  moltenRunner.position.set(0.72, 0.44, 0.05);
  foundryGroup.add(launder, moltenRunner);

  // Cinta de despacho con productos terminados (lingotes T, barrotes billets y bobina de alambrón)
  const conveyorBed = part(new THREE.BoxGeometry(1.65, 0.14, 1.45), M.concreteDark);
  conveyorBed.position.set(1.38, 0.07, 0.15);
  foundryGroup.add(conveyorBed);

  const castProducts = new THREE.Group();
  castProducts.position.set(1.25, 0.16, 0.15);
  foundryGroup.add(castProducts);

  // 2 Lingotes T
  for (const lz of [-0.42, -0.14]) {
    const ingot = part(new THREE.BoxGeometry(0.68, 0.14, 0.2), M.moltenAl);
    ingot.position.set(-0.08, 0.07, lz);
    const ingotTop = part(new THREE.BoxGeometry(0.68, 0.06, 0.26), M.ceramic);
    ingotTop.position.set(-0.08, 0.16, lz);
    castProducts.add(ingot, ingotTop);
  }

  // 3 Barrotes cilíndricos de extrusión (billets)
  for (const bz of [0.16, 0.32, 0.48]) {
    const billet = part(
      new THREE.CylinderGeometry(0.065, 0.065, 0.72, 16).rotateZ(Math.PI / 2),
      M.moltenAl
    );
    billet.position.set(0.05, 0.07, bz);
    castProducts.add(billet);
  }

  // Bobina de alambrón eléctrico
  const wireCoil = part(
    new THREE.TorusGeometry(0.18, 0.075, 14, 32).rotateX(Math.PI / 2),
    M.ceramic
  );
  wireCoil.position.set(0.55, 0.1, -0.22);
  castProducts.add(wireCoil);

  /* =========================================================================
     7. FLUJOS DE PARTÍCULAS DETERMINISTAS (`stream`) ACOPLADOS A `theta`
     ========================================================================= */
  const pierStream = stream(pierConveyorCurve.getPoints(24), ATLAS_PHASE_HUES.cobalt, {
    count: 34,
    size: 7.5,
    parent: flowsGroup,
  });

  const siloToPotStream = stream(siloToPotCurve.getPoints(24), ATLAS_PHASE_HUES.cobalt, {
    count: 30,
    size: 7,
    parent: flowsGroup,
  });

  const rawGasStream = stream(rawGasCurve.getPoints(20), ATLAS_PHASE_HUES.red, {
    count: 22,
    size: 6.5,
    parent: flowsGroup,
  });

  const recycleStream = stream(recycleCurve.getPoints(22), ATLAS_PHASE_HUES.emerald, {
    count: 26,
    size: 7,
    parent: flowsGroup,
  });

  const siphonTapStream = stream(
    [
      new THREE.Vector3(2.25, 0.78, 0.65),
      new THREE.Vector3(2.68, 0.98, 0.85),
      new THREE.Vector3(3.05, 0.75, 1.02),
      new THREE.Vector3(4.55, 0.72, 1.08),
      new THREE.Vector3(5.95, 0.58, 1.2),
    ],
    ATLAS_PHASE_HUES.ochre,
    { count: 24, size: 7.5, parent: flowsGroup }
  );

  /* =========================================================================
     8. CINEMÁTICA DETERMINISTA `pose(theta)` (REGLA #1 DE INKWORKS)
     ========================================================================= */
  let lastTheta = 0;

  function pose(thetaDeg: number, _dt: number, loadFactor: number) {
    const dThetaRaw = thetaDeg - lastTheta;
    lastTheta = thetaDeg;
    const stepDeg = Math.abs(dThetaRaw) < 180 ? Math.max(0, dThetaRaw) : 0;
    const phi = mod(thetaDeg, ALUAR_CYCLE_DEG);
    const rad = phi * D2R;

    // 1) Oleaje continuo del Golfo Nuevo + leve cabeceo natural del buque amarrado
    waveLines.forEach((ln, wIdx) => {
      const pos = ln.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i);
        const y = Math.sin(rad * 2 + z * 1.9 + wIdx * 0.9) * 0.024;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    });
    shipGroup.position.y = 0.12 + Math.sin(rad * 2) * 0.018;
    shipGroup.rotation.z = Math.sin(rad) * 0.012;

    // 2) Fase 01 (0°..72°): Grúa pórtico recorre las bodegas del buque y el tubo succionador baja
    const p1 = phi < 72 ? Math.sin((phi / 72) * Math.PI) : 0;
    unloaderGroup.position.x = -5.75 + Math.sin(rad) * 0.42;
    suctionPipe.position.y = 0.88 - 0.18 * p1;
    holdCones.forEach((cone, idx) => {
      const pulse = 0.88 + 0.12 * Math.cos(rad + idx * 1.1);
      cone.scale.set(1, pulse, 1);
    });

    // 3) Fase 02 (72°..144°): Ánodo precocido viaja por el monorriel desde el horno hacia la cuba
    const anodeProgress =
      phi >= 60 && phi <= 165 ? clamp01((phi - 60) / 105) : mod(phi / 360, 1);
    anodeRailCurve.getPointAt(anodeProgress, travelingAnode.position);

    // 4) Fase 03 (144°..240°): Pistones rompe-costra golpean y dosifican Al2O3 al baño fundido
    const breakerStroke =
      phi >= 140 && phi <= 245
        ? Math.abs(Math.sin(((phi - 140) / 105) * Math.PI * 3))
        : 0.12 * (0.5 + 0.5 * Math.sin(rad * 3));
    crustBreakers.position.y = -0.22 * breakerStroke;
    moltenAlPad.scale.y = 0.92 + 0.14 * loadFactor + 0.05 * Math.sin(rad * 2);

    // 5) Fase 05 (300°..360°): Crisol de sifonado viaja desde la cuba (+2.95) hasta el horno (+4.35) y los lingotes avanzan
    const ladleTravel =
      phi >= 292
        ? smooth(298, 348, phi) * (1 - smooth(350, 360, phi))
        : 0;
    siphonCrucible.position.x = 2.98 + 1.32 * ladleTravel;
    siphonCrucible.rotation.z = -0.18 * smooth(330, 350, phi) * (1 - smooth(352, 360, phi));
    castProducts.position.x = 1.18 + 0.22 * mod(phi / 90, 1);
    wireCoil.rotation.y = rad * 2;

    // 6) Avance determinista de todas las corrientes de transporte (ligado a `stepDeg`, jamás a reloj de pared!)
    const flowRate = stepDeg * (0.0042 + 0.002 * loadFactor);
    pierStream.advance(flowRate * 1.15);
    siloToPotStream.advance(flowRate * 1.0);
    rawGasStream.advance(flowRate * 1.25);
    recycleStream.advance(flowRate * 1.05);
    siphonTapStream.advance(flowRate * 0.95);

    // Destaque suave de opacidad según qué fase esté activa (manteniendo siempre visible el circuito continuo)
    const activePhase = getPhaseIndexAt(phi);
    pierStream.mat.opacity = activePhase === 0 ? 1.0 : 0.58;
    siloToPotStream.mat.opacity = activePhase === 2 || activePhase === 0 ? 0.98 : 0.55;
    rawGasStream.mat.opacity = activePhase === 3 || activePhase === 2 ? 0.96 : 0.48;
    recycleStream.mat.opacity = activePhase === 3 ? 1.0 : 0.58;
    siphonTapStream.mat.opacity = activePhase === 4 ? 1.0 : 0.45;
  }

  /* =========================================================================
     9. ETIQUETAS DESCRIPTIVAS POR ETAPA (SOLO 2-3 VISIBLES A LA VEZ POR DEFECTO)
     ========================================================================= */
  const callouts: CalloutAnchorDef[] = [
    {
      n: 1,
      name: 'Buque granelero en Golfo Nuevo',
      description: 'Trae alúmina calcinada (Al2O3) importada de Australia y Brasil hasta el Muelle Storni.',
      phaseIndex: 0,
      at: (v) => shipGroup.localToWorld(v.set(-0.2, 0.58, 0.15)),
    },
    {
      n: 2,
      name: 'Grúa succionadora y conducto cerrado',
      description: 'Aspira la alúmina desde las bodegas y la transporta por cinta hermética sobre pilotes.',
      phaseIndex: 0,
      at: (v) => unloaderGroup.localToWorld(v.set(0, 1.38, 0.65)),
    },
    {
      n: 3,
      name: 'Silos cónicos de alúmina',
      description: 'Almacenan el polvo seco de Al2O3 y alimentan por cañería neumática a la sala de cubas.',
      phaseIndex: 0,
      at: (v) => v.copy(siloAnchors[0]!),
    },
    {
      n: 4,
      name: 'Horno de cocción de ánodos',
      description: 'Hornea bloques prensados de coque de petróleo y brea a 1.150 °C durante días.',
      phaseIndex: 1,
      at: (v) => v.set(-0.55, 1.15, -1.85),
    },
    {
      n: 5,
      name: 'Monorriel de ánodos envarillados',
      description: 'Traslada cada ánodo con su varilla conductora de aluminio-cobre hacia las cubas.',
      phaseIndex: 1,
      at: (v) => travelingAnode.localToWorld(v.set(0, -0.2, 0)),
    },
    {
      n: 6,
      name: 'Barras DC y pistones rompe-costra',
      description: 'Inyectan corriente continua y perforan la costra superior para dosificar Al2O3 al baño.',
      phaseIndex: 2,
      at: (v) => v.set(1.1, 2.05, 0.58),
    },
    {
      n: 7,
      name: 'Baño de criolita (960 °C) y aluminio líquido',
      description: 'La alúmina se disuelve en criolita fundida y el aluminio puro se deposita en el fondo.',
      phaseIndex: 2,
      at: (v) => v.set(1.1, 0.85, 1.02),
    },
    {
      n: 8,
      name: 'Ducto de gases y ciclones GTC',
      description: 'Aspiran CO2 y fluoruros (HF) de la cuba y retienen más del 99% en filtros secos.',
      phaseIndex: 3,
      at: (v) => v.set(4.15, 1.65, -1.55),
    },
    {
      n: 9,
      name: 'Retorno de alúmina fluorada',
      description: 'Devuelve el polvo enriquecido con flúor desde GTC directo a la tolva de la cuba.',
      phaseIndex: 3,
      at: (v) => recycleCurve.getPointAt(0.45, v),
    },
    {
      n: 10,
      name: 'Crisol de sifonado al vacío',
      description: 'Succiona aluminio líquido del fondo de la cuba y lo traslada sobre vía hasta fundición.',
      phaseIndex: 4,
      at: (v) => siphonCrucible.localToWorld(v.set(0, 0.55, 0)),
    },
    {
      n: 11,
      name: 'Horno de mantenimiento y canal de colada',
      description: 'Ajusta la aleación a 720 °C y dosifica el metal fundido hacia los moldes refrigerados.',
      phaseIndex: 4,
      at: (v) => v.set(5.1, 0.95, 1.15),
    },
    {
      n: 12,
      name: 'Lingotes T, barrotes y alambrón',
      description: 'Formatos sólidos terminados listos para industria local o exportación desde el mismo puerto.',
      phaseIndex: 4,
      at: (v) => v.set(6.55, 0.42, 1.25),
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
