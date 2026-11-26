import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  Focus,
  Pause,
  Play,
  RotateCcw,
  Video,
} from 'lucide-react';
import type { PasoProceso } from '@/schemas';
import {
  D2R,
  INK_HEX,
  makeInkworksKit,
  mod,
  PAPER_HEX,
  projectCallouts2Columns,
  THREE,
  type InkworksKit,
} from '@/lib/inkworks-kit';
import {
  ALUAR_CYCLE_DEG,
  ALUAR_OVERVIEW_CAMERA,
  ALUAR_PHASES,
  buildAluarMechanism,
  getPhaseIndexAt,
  type AluarMechanismModel,
} from './aluar/aluarInkworksMechanism';

interface AluarProcessAnatomyProps {
  pasos: PasoProceso[];
  produccionLiquidaT: number | null;
  aluminaImportadaT: number | null;
  energiaElectrolisisMwhT: number | null;
}

const CALLOUT_METADATA = [
  {
    n: 1,
    name: 'Buque granelero en Golfo Nuevo',
    description: 'Trae alúmina calcinada (Al2O3) importada de Australia y Brasil hasta el Muelle Storni.',
    phaseIndex: 0,
  },
  {
    n: 2,
    name: 'Grúa succionadora y conducto cerrado',
    description: 'Aspira la alúmina desde las bodegas y la transporta por cinta hermética sobre pilotes.',
    phaseIndex: 0,
  },
  {
    n: 3,
    name: 'Silos cónicos de alúmina',
    description: 'Almacenan el polvo seco de Al2O3 y alimentan por cañería neumática a la sala de cubas.',
    phaseIndex: 0,
  },
  {
    n: 4,
    name: 'Horno de cocción de ánodos',
    description: 'Hornea bloques prensados de coque de petróleo y brea a 1.150 °C durante días.',
    phaseIndex: 1,
  },
  {
    n: 5,
    name: 'Monorriel de ánodos envarillados',
    description: 'Traslada cada ánodo con su varilla conductora de aluminio-cobre hacia las cubas.',
    phaseIndex: 1,
  },
  {
    n: 6,
    name: 'Barras DC y pistones rompe-costra',
    description: 'Inyectan corriente continua y perforan la costra superior para dosificar Al2O3 al baño.',
    phaseIndex: 2,
  },
  {
    n: 7,
    name: 'Baño de criolita (960 °C) y aluminio líquido',
    description: 'La alúmina se disuelve en criolita fundida y el aluminio puro se deposita en el fondo.',
    phaseIndex: 2,
  },
  {
    n: 8,
    name: 'Ducto de gases y ciclones GTC',
    description: 'Aspiran CO2 y fluoruros (HF) de la cuba y retienen más del 99% en filtros secos.',
    phaseIndex: 3,
  },
  {
    n: 9,
    name: 'Retorno de alúmina fluorada',
    description: 'Devuelve el polvo enriquecido con flúor desde GTC directo a la tolva de la cuba.',
    phaseIndex: 3,
  },
  {
    n: 10,
    name: 'Crisol de sifonado al vacío',
    description: 'Succiona aluminio líquido del fondo de la cuba y lo traslada sobre vía hasta fundición.',
    phaseIndex: 4,
  },
  {
    n: 11,
    name: 'Horno de mantenimiento y canal de colada',
    description: 'Ajusta la aleación a 720 °C y dosifica el metal fundido hacia los moldes refrigerados.',
    phaseIndex: 4,
  },
  {
    n: 12,
    name: 'Lingotes T, barrotes y alambrón',
    description: 'Formatos sólidos terminados listos para industria local o exportación desde el mismo puerto.',
    phaseIndex: 4,
  },
] as const;

const SPEED_OPTIONS = [
  { mult: 0.5, label: '0.5x' },
  { mult: 1, label: '1x' },
  { mult: 2, label: '2x' },
] as const;

export function AluarProcessAnatomy({
  pasos,
  produccionLiquidaT,
  aluminaImportadaT,
  energiaElectrolisisMwhT,
}: AluarProcessAnatomyProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const calloutItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const leaderLineRefs = useRef<Array<SVGPolylineElement | null>>([]);
  const leaderDotRefs = useRef<Array<SVGCircleElement | null>>([]);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Modo paso guiado (repite la maquinaria de la etapa elegida sin escaparse) vs Recorrido continuo (video 32s)
  const [playbackMode, setPlaybackMode] = useState<'step_loop' | 'full_tour'>('step_loop');
  const [playing, setPlaying] = useState(true);
  const [speedMult, setSpeedMult] = useState<number>(1);
  const [activePhaseIdx, setActivePhaseIdx] = useState<number>(0);
  const [selectedPartNum, setSelectedPartNum] = useState<number>(1);
  const [cameraView, setCameraView] = useState<'focused' | 'overview'>('focused');

  const [showCasings, setShowCasings] = useState(true);
  const [showFlows, setShowFlows] = useState(true);
  const [showCallouts, setShowCallouts] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  const simRef = useRef<{
    theta: number;
    playing: boolean;
    playbackMode: 'step_loop' | 'full_tour';
    speedMult: number;
    showCallouts: boolean;
    cameraView: 'focused' | 'overview';
    userDraggingOrbit: boolean;
    desiredTarget: THREE.Vector3;
    desiredDir: THREE.Vector3;
    desiredDist: number;
    hasDesiredCam: boolean;
    kit: InkworksKit | null;
    model: AluarMechanismModel | null;
    phaseIdx: number;
  }>({
    theta: 6,
    playing: true,
    playbackMode: 'step_loop',
    speedMult: 1,
    showCallouts: true,
    cameraView: 'focused',
    userDraggingOrbit: false,
    desiredTarget: new THREE.Vector3(...ALUAR_PHASES[0]!.cameraTarget),
    desiredDir: new THREE.Vector3(...ALUAR_PHASES[0]!.cameraDir).normalize(),
    desiredDist: 14,
    hasDesiredCam: false,
    kit: null,
    model: null,
    phaseIdx: 0,
  });

  useEffect(() => {
    simRef.current.playing = playing;
  }, [playing]);

  useEffect(() => {
    simRef.current.playbackMode = playbackMode;
  }, [playbackMode]);

  useEffect(() => {
    simRef.current.speedMult = speedMult;
  }, [speedMult]);

  useEffect(() => {
    simRef.current.showCallouts = showCallouts;
  }, [showCallouts]);

  useEffect(() => {
    simRef.current.cameraView = cameraView;
  }, [cameraView]);

  useEffect(() => {
    simRef.current.model?.setLayer('casings', showCasings);
  }, [showCasings]);

  useEffect(() => {
    simRef.current.model?.setLayer('flows', showFlows);
  }, [showFlows]);

  const computeFitDistance = useCallback((kit: InkworksKit, radius: number, w: number, h: number) => {
    const vFov = kit.camera.fov * D2R;
    const tanV = Math.tan(vFov / 2);
    // Reserva margen lateral para que las etiquetas entren cómodas sin tapar la máquina ni obligar a hacer zoom out
    const tanH = tanV * (w / Math.max(1, h)) * 0.78;
    const compactBoost = w < 640 ? 1.15 : 1.0;
    return Math.max(6.8, Math.min(36, (radius * compactBoost) / Math.min(tanV, tanH)));
  }, []);

  const aimCameraAtPhase = useCallback(
    (phaseIdx: number) => {
      const ph = ALUAR_PHASES[phaseIdx];
      const { kit } = simRef.current;
      const stage = stageRef.current;
      if (!ph || !kit || !stage) return;
      const rect = stage.getBoundingClientRect();
      simRef.current.desiredTarget.set(...ph.cameraTarget);
      simRef.current.desiredDir.set(...ph.cameraDir).normalize();
      simRef.current.desiredDist = computeFitDistance(
        kit,
        ph.cameraRadius,
        rect.width || 800,
        rect.height || 500
      );
      simRef.current.hasDesiredCam = true;
      setCameraView('focused');
    },
    [computeFitDistance]
  );

  const aimCameraOverview = useCallback(() => {
    const { kit } = simRef.current;
    const stage = stageRef.current;
    if (!kit || !stage) return;
    const rect = stage.getBoundingClientRect();
    simRef.current.desiredTarget.set(...ALUAR_OVERVIEW_CAMERA.target);
    simRef.current.desiredDir.set(...ALUAR_OVERVIEW_CAMERA.dir).normalize();
    simRef.current.desiredDist = computeFitDistance(
      kit,
      ALUAR_OVERVIEW_CAMERA.radius,
      rect.width || 800,
      rect.height || 500
    );
    simRef.current.hasDesiredCam = true;
    setCameraView('overview');
  }, [computeFitDistance]);

  const goToPhase = useCallback(
    (phaseIdx: number, mode: 'step_loop' | 'full_tour' = 'step_loop') => {
      const ph = ALUAR_PHASES[phaseIdx];
      if (!ph) return;
      setPlaybackMode(mode);
      simRef.current.playbackMode = mode;
      setActivePhaseIdx(phaseIdx);
      simRef.current.phaseIdx = phaseIdx;
      simRef.current.theta = ph.startDeg + 4;
      setPlaying(true);
      simRef.current.playing = true;

      const firstPartOfPhase = CALLOUT_METADATA.find((c) => c.phaseIndex === phaseIdx);
      if (firstPartOfPhase) setSelectedPartNum(firstPartOfPhase.n);

      aimCameraAtPhase(phaseIdx);
    },
    [aimCameraAtPhase]
  );

  const handleToggleFullTour = useCallback(() => {
    if (playbackMode === 'full_tour' && playing) {
      setPlaying(false);
      return;
    }
    setPlaybackMode('full_tour');
    simRef.current.playbackMode = 'full_tour';
    setPlaying(true);
    simRef.current.playing = true;
    aimCameraAtPhase(simRef.current.phaseIdx);
  }, [playbackMode, playing, aimCameraAtPhase]);

  // Montaje WebGL Three.js + bucle pausado a 60 fps
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setPlaying(false);
      simRef.current.playing = false;
    }

    const kit = makeInkworksKit(canvas);
    const model = buildAluarMechanism(kit);
    simRef.current.kit = kit;
    simRef.current.model = model;

    kit.controls.minDistance = 6.2;
    kit.controls.maxDistance = 40;

    const onStartInteract = () => {
      simRef.current.userDraggingOrbit = true;
      simRef.current.hasDesiredCam = false;
    };
    const onEndInteract = () => {
      simRef.current.userDraggingOrbit = false;
    };
    kit.controls.addEventListener('start', onStartInteract);
    kit.controls.addEventListener('end', onEndInteract);

    let vw = stage.clientWidth || 800;
    let vh = stage.clientHeight || 500;

    const updateLayout = () => {
      const r = stage.getBoundingClientRect();
      vw = Math.max(280, r.width);
      vh = Math.max(260, r.height);
      kit.renderer.setSize(vw, vh, false);
      kit.camera.aspect = vw / vh;
      kit.camera.updateProjectionMatrix();
      const vFov = kit.camera.fov * D2R;
      kit.outlineMat.uniforms.uPx!.value = ((2 * Math.tan(vFov / 2)) / vh) * 1.45;
    };

    updateLayout();

    // Arrancar directamente enfocado en Etapa 01 (Muelle Storni + Mar + Barco + Silos) para entender de inmediato!
    const p0 = ALUAR_PHASES[0]!;
    const initDist = computeFitDistance(kit, p0.cameraRadius, vw, vh);
    const initDir = new THREE.Vector3(...p0.cameraDir).normalize();
    kit.controls.target.set(...p0.cameraTarget);
    kit.camera.position.copy(kit.controls.target).addScaledVector(initDir, initDist);
    kit.controls.update();

    const ro = new ResizeObserver(() => updateLayout());
    ro.observe(stage);

    let lastTimeMs = performance.now();
    const desiredCamPos = new THREE.Vector3();
    let rafId = 0;

    const frame = (nowMs: number) => {
      const dt = Math.min(Math.max(0, (nowMs - lastTimeMs) / 1000), 0.05);
      lastTimeMs = nowMs;
      const s = simRef.current;

      // Ritmo mucho más tranquilo: ~11°/seg a 1x (cada etapa dura ~6.5 segundos y el ciclo completo ~33 segundos!)
      if (s.playing) {
        const degPerSec = 11 * s.speedMult;
        if (s.playbackMode === 'step_loop') {
          const ph = ALUAR_PHASES[s.phaseIdx]!;
          const span = Math.max(10, ph.endDeg - ph.startDeg);
          const localDeg = mod(s.theta - ph.startDeg + degPerSec * dt, span);
          s.theta = ph.startDeg + localDeg;
        } else {
          s.theta = mod(s.theta + degPerSec * dt, ALUAR_CYCLE_DEG);
        }
      }

      model.pose(s.theta, dt, 0.75);

      const phi = mod(s.theta, ALUAR_CYCLE_DEG);
      if (s.playbackMode === 'full_tour') {
        const nextIdx = getPhaseIndexAt(phi);
        if (nextIdx !== s.phaseIdx) {
          s.phaseIdx = nextIdx;
          setActivePhaseIdx(nextIdx);
          const firstPart = CALLOUT_METADATA.find((c) => c.phaseIndex === nextIdx);
          if (firstPart) setSelectedPartNum(firstPart.n);

          if (s.cameraView === 'focused' && !s.userDraggingOrbit) {
            const nextPh = ALUAR_PHASES[nextIdx]!;
            s.desiredTarget.set(...nextPh.cameraTarget);
            s.desiredDir.set(...nextPh.cameraDir).normalize();
            s.desiredDist = computeFitDistance(kit, nextPh.cameraRadius, vw, vh);
            s.hasDesiredCam = true;
          }
        }
      }

      // Desplazamiento cinematográfico suave de cámara (target + ángulo + distancia)
      if (s.hasDesiredCam && !s.userDraggingOrbit) {
        const alpha = 1 - Math.exp(-dt * 4.2);
        kit.controls.target.lerp(s.desiredTarget, alpha);
        desiredCamPos
          .copy(s.desiredTarget)
          .addScaledVector(s.desiredDir, s.desiredDist);
        kit.camera.position.lerp(desiredCamPos, alpha);
        if (
          kit.controls.target.distanceTo(s.desiredTarget) < 0.025 &&
          kit.camera.position.distanceTo(desiredCamPos) < 0.06
        ) {
          s.hasDesiredCam = false;
        }
      }

      kit.controls.update();
      kit.renderer.render(kit.scene, kit.camera);

      // Barra de progreso real de la etapa o ciclo
      if (progressBarRef.current) {
        const ph = ALUAR_PHASES[s.phaseIdx]!;
        const pct =
          s.playbackMode === 'step_loop'
            ? ((phi - ph.startDeg) / Math.max(1, ph.endDeg - ph.startDeg)) * 100
            : (phi / ALUAR_CYCLE_DEG) * 100;
        progressBarRef.current.style.width = `${Math.min(100, Math.max(0, pct)).toFixed(1)}%`;
      }

      // Proyectar SOLO las 2 o 3 etiquetas de la etapa actual (cero caos de 12 carteles cruzados!)
      if (s.showCallouts) {
        const activeCallouts = model.callouts.filter((c) => c.phaseIndex === s.phaseIdx);
        const placed = projectCallouts2Columns(
          activeCallouts,
          kit.camera,
          vw,
          vh,
          ALUAR_OVERVIEW_CAMERA.worldBox
        );
        const byNum = new Map(placed.map((p) => [p.n, p]));

        CALLOUT_METADATA.forEach((def, idx) => {
          const btn = calloutItemRefs.current[idx];
          const poly = leaderLineRefs.current[idx];
          const dot = leaderDotRefs.current[idx];
          if (!btn || !poly || !dot) return;

          const item = byNum.get(def.n);
          if (!item) {
            btn.style.opacity = '0';
            btn.style.pointerEvents = 'none';
            poly.style.opacity = '0';
            dot.style.opacity = '0';
            return;
          }

          const isLeft = item.side === 'L';
          btn.style.opacity = '1';
          btn.style.pointerEvents = 'auto';
          btn.style.maxWidth = `${item.maxWidth}px`;
          btn.style.left = `${item.colX.toFixed(1)}px`;
          btn.style.top = `${item.ly.toFixed(1)}px`;
          btn.style.transform = isLeft ? 'translate(-100%, -50%)' : 'translate(0%, -50%)';

          poly.style.opacity = '1';
          poly.setAttribute(
            'points',
            `${item.ax.toFixed(1)},${item.ay.toFixed(1)} ${item.elbowX.toFixed(1)},${item.ly.toFixed(1)} ${item.colX.toFixed(1)},${item.ly.toFixed(1)}`
          );
          dot.style.opacity = '1';
          dot.setAttribute('cx', item.ax.toFixed(1));
          dot.setAttribute('cy', item.ay.toFixed(1));
        });
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
      kit.controls.removeEventListener('start', onStartInteract);
      kit.controls.removeEventListener('end', onEndInteract);
      kit.dispose();
    };
  }, [computeFitDistance]);

  // Captura PNG nítida de la etapa o vista actual con subtítulo explicativo
  const handleDownloadPng = useCallback(() => {
    const glCanvas = canvasRef.current;
    if (!glCanvas) return;
    const w = glCanvas.width;
    const h = glCanvas.height;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = PAPER_HEX;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(20, 23, 31, 0.055)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.drawImage(glCanvas, 0, 0);

    const ph = ALUAR_PHASES[simRef.current.phaseIdx]!;
    ctx.fillStyle = INK_HEX;
    ctx.fillRect(24, h - 68, Math.min(w - 48, 620), 44);
    ctx.fillStyle = ph.color;
    ctx.fillRect(24, h - 68, 6, 44);
    ctx.fillStyle = '#ffffff';
    ctx.font = '500 18px Inter, sans-serif';
    ctx.fillText(`Aluar Puerto Madryn · Paso ${ph.code}: ${ph.name}`, 42, h - 40);

    const a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = `aluar-paso-${ph.code}-3d.png`;
    a.click();
  }, []);

  // Grabar video WebM limpio de 18s recorriendo las 5 etapas con cámara guiada y subtítulos
  const handleRecordVideoClip = useCallback(() => {
    const glCanvas = canvasRef.current;
    if (!glCanvas || isRecording || typeof MediaRecorder === 'undefined') return;

    setIsRecording(true);
    setPlaybackMode('full_tour');
    simRef.current.playbackMode = 'full_tour';
    setSpeedMult(1.8);
    simRef.current.speedMult = 1.8;
    simRef.current.theta = 2;
    simRef.current.phaseIdx = 0;
    setActivePhaseIdx(0);
    setPlaying(true);
    simRef.current.playing = true;
    aimCameraAtPhase(0);

    const w = glCanvas.width;
    const h = glCanvas.height;
    const recCanvas = document.createElement('canvas');
    recCanvas.width = w;
    recCanvas.height = h;
    const ctx = recCanvas.getContext('2d')!;

    let active = true;
    const drawComposite = () => {
      if (!active) return;
      ctx.fillStyle = PAPER_HEX;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(20, 23, 31, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.drawImage(glCanvas, 0, 0);

      const ph = ALUAR_PHASES[simRef.current.phaseIdx]!;
      ctx.fillStyle = INK_HEX;
      ctx.fillRect(24, h - 86, Math.min(w - 48, 720), 62);
      ctx.fillStyle = ph.color;
      ctx.fillRect(24, h - 86, 6, 62);
      ctx.fillStyle = '#ffffff';
      ctx.font = '500 18px Inter, sans-serif';
      ctx.fillText(`Paso ${ph.code} de 05 · ${ph.name}`, 42, h - 59);
      ctx.fillStyle = '#d5d8e0';
      ctx.font = '400 14px Inter, sans-serif';
      ctx.fillText(ph.machineAction, 42, h - 36);

      window.requestAnimationFrame(drawComposite);
    };
    window.requestAnimationFrame(drawComposite);

    const stream = recCanvas.captureStream(60);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 6_000_000,
    });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };
    recorder.onstop = () => {
      active = false;
      setSpeedMult(1);
      simRef.current.speedMult = 1;
      setPlaybackMode('step_loop');
      simRef.current.playbackMode = 'step_loop';
      setIsRecording(false);
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aluar-proceso-paso-a-paso-3d.webm';
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    };

    recorder.start();
    window.setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop();
    }, 18000);
  }, [isRecording, aimCameraAtPhase]);

  const activePhase = ALUAR_PHASES[activePhaseIdx] ?? ALUAR_PHASES[0]!;
  const phaseParts = useMemo(
    () => CALLOUT_METADATA.filter((c) => c.phaseIndex === activePhaseIdx),
    [activePhaseIdx]
  );
  const selectedPart =
    phaseParts.find((p) => p.n === selectedPartNum) ?? phaseParts[0] ?? null;

  const matchedPaso = useMemo(
    () => pasos.find((p) => p.paso_id === activePhase.pasoId) ?? pasos[activePhaseIdx] ?? null,
    [pasos, activePhase.pasoId, activePhaseIdx]
  );

  return (
    <div className="border border-rule bg-stone-surface">
      {/* Barra superior compacta: modo de cámara, capas y exportación */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-stone-bg px-4 py-2.5 text-[12px] sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-ink px-2 py-0.5 font-medium text-white tabular-nums">
            Paso {activePhase.code} / 05
          </span>
          <span className="text-ink-muted">
            {playbackMode === 'step_loop'
              ? 'Viendo esta máquina en bucle'
              : 'Recorrido automático completo'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              cameraView === 'focused' ? aimCameraOverview() : aimCameraAtPhase(activePhaseIdx)
            }
            className={`inline-flex cursor-pointer items-center gap-1 border px-2.5 py-1 font-medium transition-colors duration-150 ${
              cameraView === 'overview'
                ? 'border-ink bg-ink text-white'
                : 'border-rule bg-stone-surface text-ink hover:border-ink'
            }`}
          >
            {cameraView === 'focused' ? (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>Ver planta completa</span>
              </>
            ) : (
              <>
                <Focus className="h-3.5 w-3.5" />
                <span>Acercar al paso {activePhase.code}</span>
              </>
            )}
          </button>

          <button
            type="button"
            aria-pressed={showCallouts}
            onClick={() => setShowCallouts((v) => !v)}
            className={`cursor-pointer border px-2.5 py-1 font-medium transition-colors duration-150 ${
              showCallouts
                ? 'border-ink bg-ink text-white'
                : 'border-rule bg-stone-surface text-ink-muted hover:border-ink hover:text-ink'
            }`}
          >
            Etiquetas ({phaseParts.length})
          </button>

          <button
            type="button"
            aria-pressed={showCasings}
            onClick={() => setShowCasings((v) => !v)}
            className={`cursor-pointer border px-2.5 py-1 font-medium transition-colors duration-150 ${
              showCasings
                ? 'border-ink bg-ink text-white'
                : 'border-rule bg-stone-surface text-ink-muted hover:border-ink hover:text-ink'
            }`}
          >
            Carcasas
          </button>

          <button
            type="button"
            aria-pressed={showFlows}
            onClick={() => setShowFlows((v) => !v)}
            className={`cursor-pointer border px-2.5 py-1 font-medium transition-colors duration-150 ${
              showFlows
                ? 'border-ink bg-ink text-white'
                : 'border-rule bg-stone-surface text-ink-muted hover:border-ink hover:text-ink'
            }`}
          >
            Flujos
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            title="Guardar captura PNG"
            className="inline-flex cursor-pointer items-center gap-1 border border-rule bg-stone-surface px-2.5 py-1 font-medium text-ink transition-colors duration-150 hover:border-ink hover:text-cobalt"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>PNG</span>
          </button>

          <button
            type="button"
            onClick={handleRecordVideoClip}
            disabled={isRecording}
            title="Grabar video recorrido de las 5 etapas (18 segundos, WebM 60 fps)"
            className={`inline-flex cursor-pointer items-center gap-1 border px-2.5 py-1 font-medium transition-colors duration-150 ${
              isRecording
                ? 'border-signal-red bg-signal-red text-white'
                : 'border-rule bg-stone-surface text-ink hover:border-ink hover:text-cobalt'
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            <span>{isRecording ? 'Grabando...' : 'Grabar video'}</span>
          </button>
        </div>
      </div>

      {/* Vista principal Split: Modelo 3D a la izquierda + Relato Paso a Paso visible sin scrollear a la derecha */}
      <div className="grid lg:grid-cols-12">
        {/* Columna izquierda (8 cols): Escenario 3D nítido + SOLO las 2-3 etiquetas del paso activo */}
        <div className="flex flex-col lg:col-span-8 lg:border-r lg:border-rule">
          <div
            ref={stageRef}
            className="relative h-[380px] w-full overflow-hidden select-none sm:h-[460px] lg:h-[520px]"
            style={{
              backgroundColor: PAPER_HEX,
              backgroundImage:
                'linear-gradient(to right, rgba(20,23,31,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,23,31,0.045) 1px, transparent 1px), linear-gradient(to right, rgba(20,23,31,0.085) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,23,31,0.085) 1px, transparent 1px)',
              backgroundSize: '20px 20px, 20px 20px, 100px 100px, 100px 100px',
            }}
          >
            <canvas
              ref={canvasRef}
              aria-label="Simulación 3D interactiva del proceso completo de Aluar en Puerto Madryn"
              className="block h-full w-full cursor-grab active:cursor-grabbing"
            />

            {/* Líneas guía quebradas SOLO para las 2 o 3 piezas de la etapa actual */}
            <svg
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-150 ${
                showCallouts ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {CALLOUT_METADATA.map((item, idx) => (
                <g key={item.n}>
                  <polyline
                    ref={(el) => {
                      leaderLineRefs.current[idx] = el;
                    }}
                    fill="none"
                    stroke="rgba(20, 23, 31, 0.55)"
                    strokeWidth="1.1"
                  />
                  <circle
                    ref={(el) => {
                      leaderDotRefs.current[idx] = el;
                    }}
                    r="3"
                    fill={activePhase.color}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                </g>
              ))}
            </svg>

            {/* Globos interactivos SOLO de la etapa activa: click muestra su explicación en el panel derecho */}
            <div
              className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-150 ${
                showCallouts ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {CALLOUT_METADATA.map((item, idx) => {
                const isSelected = selectedPartNum === item.n;
                return (
                  <button
                    key={item.n}
                    ref={(el) => {
                      calloutItemRefs.current[idx] = el;
                    }}
                    type="button"
                    onClick={() => setSelectedPartNum(item.n)}
                    style={{ opacity: 0 }}
                    className={`absolute inline-flex cursor-pointer items-start gap-1.5 border px-2 py-1.5 text-left text-[11px] leading-snug shadow-2xs transition-colors duration-150 sm:text-[12px] ${
                      isSelected
                        ? 'border-ink bg-ink text-white'
                        : 'border-rule-strong/35 bg-stone-surface/95 text-ink hover:border-ink'
                    }`}
                  >
                    <span
                      className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center text-[10px] font-medium tabular-nums sm:text-[11px] ${
                        isSelected ? 'bg-white text-ink' : 'bg-stone-subtle text-ink'
                      }`}
                    >
                      {item.n}
                    </span>
                    <span className="font-normal whitespace-normal">{item.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Ayuda discreta de órbita 3D */}
            <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-2 text-[12px]">
              <span className="border border-rule bg-stone-surface/92 px-2.5 py-1 text-ink-muted backdrop-blur-xs">
                Arrastrá para girar en 3D · Rueda para acercar
              </span>
              {cameraView === 'focused' && (
                <button
                  type="button"
                  onClick={() => aimCameraAtPhase(activePhaseIdx)}
                  className="pointer-events-auto inline-flex cursor-pointer items-center gap-1 border border-rule bg-stone-surface/95 px-2.5 py-1 font-medium text-ink transition-colors duration-150 hover:border-ink hover:text-cobalt"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reencuadrar</span>
                </button>
              )}
            </div>
          </div>

          {/* Controles de reproducción lentos + 5 botones de etapas con contraste AAA */}
          <div className="border-t border-rule bg-stone-bg px-4 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  className="inline-flex cursor-pointer items-center gap-1.5 bg-ink px-3 py-1.5 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-cobalt"
                >
                  {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{playing ? 'Pausar' : 'Reproducir'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleFullTour}
                  className={`inline-flex cursor-pointer items-center gap-1.5 border px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                    playbackMode === 'full_tour'
                      ? 'border-cobalt bg-cobalt text-white'
                      : 'border-rule bg-stone-surface text-ink hover:border-ink'
                  }`}
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Recorrido completo (32s)</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-[12px]">
                <span className="text-ink-muted">Velocidad:</span>
                <div className="flex border border-rule bg-stone-surface p-0.5">
                  {SPEED_OPTIONS.map((sp) => (
                    <button
                      key={sp.mult}
                      type="button"
                      onClick={() => setSpeedMult(sp.mult)}
                      className={`cursor-pointer px-2 py-0.5 font-medium tabular-nums transition-colors duration-150 ${
                        speedMult === sp.mult
                          ? 'bg-ink text-white'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 5 pasos claros y legibles (contraste AAA en activos e inactivos) */}
            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
              {ALUAR_PHASES.map((ph) => {
                const isCurrent = ph.index === activePhaseIdx;
                return (
                  <button
                    key={ph.code}
                    type="button"
                    onClick={() => goToPhase(ph.index, 'step_loop')}
                    className={`relative cursor-pointer overflow-hidden border px-2.5 py-2 text-left transition-colors duration-150 ${
                      isCurrent
                        ? 'border-ink bg-ink text-white'
                        : 'border-rule bg-stone-surface text-ink hover:border-ink'
                    }`}
                  >
                    <span
                      className="absolute inset-x-0 top-0 h-[3px]"
                      style={{ backgroundColor: ph.color }}
                    />
                    <span
                      className={`block text-[11px] tabular-nums ${
                        isCurrent ? 'text-white/75' : 'text-ink-muted'
                      }`}
                    >
                      Paso {ph.code}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] font-medium">
                      {ph.short}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Barra fina de progreso dentro de la etapa o recorrido */}
            <div className="mt-2.5 h-1 w-full bg-stone-subtle">
              <div
                ref={progressBarRef}
                style={{ width: '10%', backgroundColor: activePhase.color }}
                className="h-full"
              />
            </div>
          </div>
        </div>

        {/* Columna derecha (4 cols): Relato Paso a Paso estilo Aluar + ingeniería real, siempre visible */}
        <aside className="flex flex-col justify-between p-5 sm:p-6 lg:col-span-4">
          <div>
            {/* Navegación grande Anterior / Siguiente */}
            <div className="flex items-center justify-between gap-2 border-b border-rule pb-4">
              <button
                type="button"
                onClick={() =>
                  goToPhase((activePhaseIdx - 1 + ALUAR_PHASES.length) % ALUAR_PHASES.length)
                }
                className="inline-flex cursor-pointer items-center gap-1 border border-rule bg-stone-bg px-3 py-1.5 text-[13px] font-medium text-ink transition-colors duration-150 hover:border-ink"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Anterior</span>
              </button>

              <span className="text-[13px] font-medium text-ink-muted tabular-nums">
                Paso {activePhaseIdx + 1} de {ALUAR_PHASES.length}
              </span>

              <button
                type="button"
                onClick={() => goToPhase((activePhaseIdx + 1) % ALUAR_PHASES.length)}
                className="inline-flex cursor-pointer items-center gap-1 bg-ink px-3 py-1.5 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-cobalt"
              >
                <span>Siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Título y explicación humana clara de qué ocurre en este paso */}
            <div className="mt-5">
              <div className="flex items-center gap-2 text-[12px] text-ink-muted tabular-nums">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: activePhase.color }}
                />
                <span>Temperatura en esta etapa: {activePhase.tempDisplay}</span>
              </div>

              <h3 className="mt-1.5 font-display text-[20px] font-medium leading-[1.2] tracking-[-0.02em] text-ink">
                {activePhase.code} · {activePhase.name}
              </h3>

              <p className="mt-2.5 text-[14px] font-normal leading-relaxed text-ink-muted">
                {activePhase.summary}
              </p>
            </div>

            {/* Resumen práctico: Qué entra -> Qué máquina trabaja -> Qué sale */}
            <dl className="mt-5 space-y-2.5 border-y border-rule py-4 text-[13px]">
              <div>
                <dt className="text-[12px] text-ink-muted">Qué ingresa</dt>
                <dd className="mt-0.5 text-ink">{activePhase.inputLabel}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-ink-muted">Máquina y transporte</dt>
                <dd className="mt-0.5 font-medium text-ink">{activePhase.machineAction}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-ink-muted">Qué sale hacia el siguiente paso</dt>
                <dd className="mt-0.5 text-ink">{activePhase.outputLabel}</dd>
              </div>
            </dl>

            {matchedPaso?.reaccion_balanceada && (
              <div className="mt-4 bg-stone-bg px-3.5 py-2.5 text-[13px] tabular-nums">
                <span className="block text-[11px] text-ink-muted">Reacción química balanceada</span>
                <span className="mt-0.5 block font-medium text-cobalt">
                  {matchedPaso.reaccion_balanceada}
                </span>
              </div>
            )}

            {/* Piezas visibles en esta etapa CON SU DESCRIPCIÓN (sincronizadas con los globos 3D!) */}
            <div className="mt-5">
              <p className="text-[12px] font-medium text-ink-muted">
                Qué estás viendo en el 3D (tocá una pieza)
              </p>
              <ul className="mt-2 space-y-1.5">
                {phaseParts.map((part) => {
                  const isSel = selectedPart?.n === part.n;
                  return (
                    <li key={part.n}>
                      <button
                        type="button"
                        onClick={() => setSelectedPartNum(part.n)}
                        className={`w-full cursor-pointer border p-2.5 text-left transition-colors duration-150 ${
                          isSel
                            ? 'border-ink bg-stone-bg'
                            : 'border-rule bg-stone-surface hover:border-ink/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-[13px]">
                          <span
                            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center text-[11px] font-medium tabular-nums ${
                              isSel ? 'bg-ink text-white' : 'bg-stone-subtle text-ink'
                            }`}
                          >
                            {part.n}
                          </span>
                          <span className="font-medium text-ink">{part.name}</span>
                        </div>
                        <p className="mt-1 pl-7 text-[12px] leading-snug text-ink-muted">
                          {part.description}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Cifras reales de Aluar al pie del panel */}
          <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-rule pt-4 text-[12px] tabular-nums">
            <div>
              <dt className="text-ink-muted">Alúmina (2024)</dt>
              <dd className="mt-0.5 font-medium text-ink">
                {aluminaImportadaT !== null
                  ? `${Math.round(aluminaImportadaT / 1000).toLocaleString('es-AR')} kt`
                  : 'Sin datos'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Energía cubas</dt>
              <dd className="mt-0.5 font-medium text-cobalt">
                {energiaElectrolisisMwhT !== null
                  ? `${energiaElectrolisisMwhT.toLocaleString('es-AR', { minimumFractionDigits: 2 })} MWh/t`
                  : 'Sin datos'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Aluminio (FY25)</dt>
              <dd className="mt-0.5 font-medium text-ink">
                {produccionLiquidaT !== null
                  ? `${Math.round(produccionLiquidaT / 1000).toLocaleString('es-AR')} kt`
                  : 'Sin datos'}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
