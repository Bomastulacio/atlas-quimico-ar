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
  type CalloutAnchorDef,
  type InkworksKit,
} from '@/lib/inkworks-kit';

export interface ProcessPhaseDef3D {
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

export interface OverviewCameraDef3D {
  target: [number, number, number];
  dir: [number, number, number];
  radius: number;
  worldBox: [[number, number, number], [number, number, number]];
}

export interface MechanismModel3D {
  root: THREE.Group;
  callouts: CalloutAnchorDef[];
  compactCalloutIds: number[];
  pose: (thetaDeg: number, dt: number, loadFactor: number) => void;
  setLayer: (key: 'casings' | 'flows', visible: boolean) => void;
}

export interface AnatomyCalloutMeta {
  n: number;
  name: string;
  description: string;
  phaseIndex: number;
}

export interface AnatomyKpiItem {
  label: string;
  value: string;
  accentClass?: string;
}

export interface ProcessAnatomy3DPlayerProps {
  plantTitle: string;
  exportPrefix: string;
  canvasAriaLabel: string;
  phases: ProcessPhaseDef3D[];
  overviewCamera: OverviewCameraDef3D;
  calloutsMeta: readonly AnatomyCalloutMeta[];
  buildMechanism: (kit: InkworksKit) => MechanismModel3D;
  pasos: PasoProceso[];
  kpis: AnatomyKpiItem[];
  cycleDeg?: number;
}

const SPEED_OPTIONS = [
  { mult: 0.5, label: '0.5x' },
  { mult: 1, label: '1x' },
  { mult: 2, label: '2x' },
] as const;

export function ProcessAnatomy3DPlayer({
  plantTitle,
  exportPrefix,
  canvasAriaLabel,
  phases,
  overviewCamera,
  calloutsMeta,
  buildMechanism,
  pasos,
  kpis,
  cycleDeg = 360,
}: ProcessAnatomy3DPlayerProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const calloutItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const leaderLineRefs = useRef<Array<SVGPolylineElement | null>>([]);
  const leaderDotRefs = useRef<Array<SVGCircleElement | null>>([]);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const [playbackMode, setPlaybackMode] = useState<'step_loop' | 'full_tour'>('step_loop');
  const [playing, setPlaying] = useState(true);
  const [speedMult, setSpeedMult] = useState<number>(1);
  const [activePhaseIdx, setActivePhaseIdx] = useState<number>(0);
  const [selectedPartNum, setSelectedPartNum] = useState<number>(calloutsMeta[0]?.n ?? 1);
  const [cameraView, setCameraView] = useState<'focused' | 'overview'>('focused');

  const [showCasings, setShowCasings] = useState(true);
  const [showFlows, setShowFlows] = useState(true);
  const [showCallouts, setShowCallouts] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [webglStatus, setWebglStatus] = useState<'ready' | 'lost' | 'error'>('ready');
  const [webglNonce, setWebglNonce] = useState(0);

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
    model: MechanismModel3D | null;
    phaseIdx: number;
  }>({
    theta: 6,
    playing: true,
    playbackMode: 'step_loop',
    speedMult: 1,
    showCallouts: true,
    cameraView: 'focused',
    userDraggingOrbit: false,
    desiredTarget: new THREE.Vector3(...phases[0]!.cameraTarget),
    desiredDir: new THREE.Vector3(...phases[0]!.cameraDir).normalize(),
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

  const getPhaseAt = useCallback(
    (deg: number) => {
      const phi = mod(deg, cycleDeg);
      for (let i = phases.length - 1; i >= 0; i--) {
        if (phi >= phases[i]!.startDeg) return i;
      }
      return 0;
    },
    [phases, cycleDeg]
  );

  const computeFitDistance = useCallback((kit: InkworksKit, radius: number, w: number, h: number) => {
    const vFov = kit.camera.fov * D2R;
    const tanV = Math.tan(vFov / 2);
    const tanH = tanV * (w / Math.max(1, h)) * 0.78;
    const compactBoost = w < 640 ? 1.15 : 1.0;
    return Math.max(6.8, Math.min(36, (radius * compactBoost) / Math.min(tanV, tanH)));
  }, []);

  const aimCameraAtPhase = useCallback(
    (phaseIdx: number) => {
      const ph = phases[phaseIdx];
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
    [phases, computeFitDistance]
  );

  const aimCameraOverview = useCallback(() => {
    const { kit } = simRef.current;
    const stage = stageRef.current;
    if (!kit || !stage) return;
    const rect = stage.getBoundingClientRect();
    simRef.current.desiredTarget.set(...overviewCamera.target);
    simRef.current.desiredDir.set(...overviewCamera.dir).normalize();
    simRef.current.desiredDist = computeFitDistance(
      kit,
      overviewCamera.radius,
      rect.width || 800,
      rect.height || 500
    );
    simRef.current.hasDesiredCam = true;
    setCameraView('overview');
  }, [overviewCamera, computeFitDistance]);

  const goToPhase = useCallback(
    (phaseIdx: number, mode: 'step_loop' | 'full_tour' = 'step_loop') => {
      const ph = phases[phaseIdx];
      if (!ph) return;
      setPlaybackMode(mode);
      simRef.current.playbackMode = mode;
      setActivePhaseIdx(phaseIdx);
      simRef.current.phaseIdx = phaseIdx;
      simRef.current.theta = ph.startDeg + 4;
      setPlaying(true);
      simRef.current.playing = true;

      const firstPartOfPhase = calloutsMeta.find((c) => c.phaseIndex === phaseIdx);
      if (firstPartOfPhase) setSelectedPartNum(firstPartOfPhase.n);

      aimCameraAtPhase(phaseIdx);
    },
    [phases, calloutsMeta, aimCameraAtPhase]
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

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setPlaying(false);
      simRef.current.playing = false;
    }

    let kit: InkworksKit;
    let model: MechanismModel3D;
    try {
      kit = makeInkworksKit(canvas);
      model = buildMechanism(kit);
      setWebglStatus('ready');
    } catch {
      setWebglStatus('error');
      return;
    }

    simRef.current.kit = kit;
    simRef.current.model = model;
    model.setLayer('casings', showCasings);
    model.setLayer('flows', showFlows);

    const onContextLost = (ev: Event) => {
      ev.preventDefault();
      setWebglStatus('lost');
    };
    const onContextRestored = () => {
      setWebglStatus('ready');
      setWebglNonce((n) => n + 1);
    };
    canvas.addEventListener('webglcontextlost', onContextLost, false);
    canvas.addEventListener('webglcontextrestored', onContextRestored, false);

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

    const p0 = phases[0]!;
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

      if (s.playing) {
        const degPerSec = 11 * s.speedMult;
        if (s.playbackMode === 'step_loop') {
          const ph = phases[s.phaseIdx]!;
          const span = Math.max(10, ph.endDeg - ph.startDeg);
          const localDeg = mod(s.theta - ph.startDeg + degPerSec * dt, span);
          s.theta = ph.startDeg + localDeg;
        } else {
          s.theta = mod(s.theta + degPerSec * dt, cycleDeg);
        }
      }

      model.pose(s.theta, dt, 0.75);

      const phi = mod(s.theta, cycleDeg);
      if (s.playbackMode === 'full_tour') {
        const nextIdx = getPhaseAt(phi);
        if (nextIdx !== s.phaseIdx) {
          s.phaseIdx = nextIdx;
          setActivePhaseIdx(nextIdx);
          const firstPart = calloutsMeta.find((c) => c.phaseIndex === nextIdx);
          if (firstPart) setSelectedPartNum(firstPart.n);

          if (s.cameraView === 'focused' && !s.userDraggingOrbit) {
            const nextPh = phases[nextIdx]!;
            s.desiredTarget.set(...nextPh.cameraTarget);
            s.desiredDir.set(...nextPh.cameraDir).normalize();
            s.desiredDist = computeFitDistance(kit, nextPh.cameraRadius, vw, vh);
            s.hasDesiredCam = true;
          }
        }
      }

      if (s.hasDesiredCam && !s.userDraggingOrbit) {
        const alpha = 1 - Math.exp(-dt * 4.2);
        kit.controls.target.lerp(s.desiredTarget, alpha);
        desiredCamPos.copy(s.desiredTarget).addScaledVector(s.desiredDir, s.desiredDist);
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

      if (progressBarRef.current) {
        const ph = phases[s.phaseIdx]!;
        const pct =
          s.playbackMode === 'step_loop'
            ? ((phi - ph.startDeg) / Math.max(1, ph.endDeg - ph.startDeg)) * 100
            : (phi / cycleDeg) * 100;
        progressBarRef.current.style.width = `${Math.min(100, Math.max(0, pct)).toFixed(1)}%`;
      }

      if (s.showCallouts) {
        const activeCallouts = model.callouts.filter((c) => c.phaseIndex === s.phaseIdx);
        const placed = projectCallouts2Columns(
          activeCallouts,
          kit.camera,
          vw,
          vh,
          overviewCamera.worldBox
        );
        const byNum = new Map(placed.map((p) => [p.n, p]));

        calloutsMeta.forEach((def, idx) => {
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
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      kit.controls.removeEventListener('start', onStartInteract);
      kit.controls.removeEventListener('end', onEndInteract);
      kit.dispose();
    };
  }, [buildMechanism, phases, overviewCamera, calloutsMeta, cycleDeg, getPhaseAt, computeFitDistance, webglNonce]);

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

    const ph = phases[simRef.current.phaseIdx]!;
    ctx.fillStyle = INK_HEX;
    ctx.fillRect(24, h - 68, Math.min(w - 48, 660), 44);
    ctx.fillStyle = ph.color;
    ctx.fillRect(24, h - 68, 6, 44);
    ctx.fillStyle = '#ffffff';
    ctx.font = '500 18px Inter, sans-serif';
    ctx.fillText(`${plantTitle} · Paso ${ph.code}: ${ph.name}`, 42, h - 40);

    const a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = `${exportPrefix}-paso-${ph.code}-3d.png`;
    a.click();
  }, [phases, plantTitle, exportPrefix]);

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

      const ph = phases[simRef.current.phaseIdx]!;
      ctx.fillStyle = INK_HEX;
      ctx.fillRect(24, h - 86, Math.min(w - 48, 740), 62);
      ctx.fillStyle = ph.color;
      ctx.fillRect(24, h - 86, 6, 62);
      ctx.fillStyle = '#ffffff';
      ctx.font = '500 18px Inter, sans-serif';
      ctx.fillText(`Paso ${ph.code} de 0${phases.length} · ${ph.name}`, 42, h - 59);
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
      a.download = `${exportPrefix}-proceso-3d.webm`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    };

    recorder.start();
    window.setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop();
    }, 18000);
  }, [isRecording, aimCameraAtPhase, phases, exportPrefix]);

  const activePhase = phases[activePhaseIdx] ?? phases[0]!;
  const phaseParts = useMemo(
    () => calloutsMeta.filter((c) => c.phaseIndex === activePhaseIdx),
    [calloutsMeta, activePhaseIdx]
  );
  const selectedPart =
    phaseParts.find((p) => p.n === selectedPartNum) ?? phaseParts[0] ?? null;

  const matchedPaso = useMemo(
    () => pasos.find((p) => p.paso_id === activePhase.pasoId) ?? pasos[activePhaseIdx] ?? null,
    [pasos, activePhase.pasoId, activePhaseIdx]
  );

  return (
    <div className="border border-rule bg-stone-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-stone-bg px-4 py-2.5 text-[12px] sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-ink px-2 py-0.5 font-medium text-white tabular-nums">
            Paso {activePhase.code} / 0{phases.length}
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
            className={`bencho-press inline-flex cursor-pointer items-center gap-1 border px-2.5 py-1 font-medium transition-colors duration-150 ${
              cameraView === 'overview'
                ? 'border-cobalt bg-cobalt text-white'
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
            className={`bencho-press cursor-pointer border px-2.5 py-1 font-medium transition-colors duration-150 ${
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
            className={`bencho-press cursor-pointer border px-2.5 py-1 font-medium transition-colors duration-150 ${
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
            className={`bencho-press cursor-pointer border px-2.5 py-1 font-medium transition-colors duration-150 ${
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
            className="bencho-press inline-flex cursor-pointer items-center gap-1 border border-rule bg-stone-surface px-2.5 py-1 font-medium text-ink transition-colors duration-150 hover:border-ink hover:text-cobalt"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>PNG</span>
          </button>

          <button
            type="button"
            onClick={handleRecordVideoClip}
            disabled={isRecording}
            title="Grabar video recorrido de las 5 etapas (18 segundos, WebM 60 fps)"
            className={`bencho-press inline-flex cursor-pointer items-center gap-1 border px-2.5 py-1 font-medium transition-colors duration-150 ${
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

      <div className="grid lg:grid-cols-12">
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
              key={webglNonce}
              ref={canvasRef}
              aria-label={canvasAriaLabel}
              className="block h-full w-full cursor-grab active:cursor-grabbing"
            />

            {webglStatus !== 'ready' && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-stone-surface/92 p-6 text-center">
                <p className="font-display text-[17px] font-medium text-ink">
                  {webglStatus === 'lost'
                    ? 'El navegador pausó el contexto gráfico WebGL'
                    : 'No se pudo iniciar la vista 3D WebGL en esta pestaña'}
                </p>
                <p className="mt-1.5 max-w-md text-[13px] text-ink-muted">
                  Suele ocurrir al dejar varias pestañas abiertas o al recargar el servidor local.
                  Tocá el botón para reactivar la animación 3D.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setWebglStatus('ready');
                    setWebglNonce((n) => n + 1);
                  }}
                  className="bencho-press mt-4 inline-flex cursor-pointer items-center gap-2 bg-ink px-4 py-2 text-[13px] font-medium text-white hover:bg-cobalt"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reactivar escena 3D</span>
                </button>
              </div>
            )}

            <svg
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-150 ${
                showCallouts ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {calloutsMeta.map((item, idx) => (
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

            <div
              className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-150 ${
                showCallouts ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {calloutsMeta.map((item, idx) => {
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

            <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-2 text-[12px]">
              <span className="border border-rule bg-stone-surface/92 px-2.5 py-1 text-ink-muted backdrop-blur-xs">
                Arrastrá para girar en 3D · Rueda para acercar
              </span>
              {cameraView === 'focused' && (
                <button
                  type="button"
                  onClick={() => aimCameraAtPhase(activePhaseIdx)}
                  className="bencho-press pointer-events-auto inline-flex cursor-pointer items-center gap-1 border border-rule bg-stone-surface/95 px-2.5 py-1 font-medium text-ink transition-colors duration-150 hover:border-ink hover:text-cobalt"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reencuadrar</span>
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-rule bg-stone-bg px-4 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  className="bencho-press inline-flex cursor-pointer items-center gap-1.5 bg-ink px-3 py-1.5 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-cobalt"
                >
                  {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{playing ? 'Pausar' : 'Reproducir'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleFullTour}
                  className={`bencho-press inline-flex cursor-pointer items-center gap-1.5 border px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
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

            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
              {phases.map((ph) => {
                const isCurrent = ph.index === activePhaseIdx;
                return (
                  <button
                    key={ph.code}
                    type="button"
                    onClick={() => goToPhase(ph.index, 'step_loop')}
                    className={`bencho-press relative cursor-pointer overflow-hidden border px-2.5 py-2 text-left transition-colors duration-150 ${
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

            <div className="mt-2.5 h-1 w-full bg-stone-subtle">
              <div
                ref={progressBarRef}
                style={{ width: '10%', backgroundColor: activePhase.color }}
                className="h-full"
              />
            </div>
          </div>
        </div>

        <aside className="flex flex-col justify-between p-5 sm:p-6 lg:col-span-4">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-rule pb-4">
              <button
                type="button"
                onClick={() => goToPhase((activePhaseIdx - 1 + phases.length) % phases.length)}
                className="bencho-press inline-flex cursor-pointer items-center gap-1 border border-rule bg-stone-bg px-3 py-1.5 text-[13px] font-medium text-ink transition-colors duration-150 hover:border-ink"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Anterior</span>
              </button>

              <span className="text-[13px] font-medium text-ink-muted tabular-nums">
                Paso {activePhaseIdx + 1} de {phases.length}
              </span>

              <button
                type="button"
                onClick={() => goToPhase((activePhaseIdx + 1) % phases.length)}
                className="bencho-press inline-flex cursor-pointer items-center gap-1 bg-ink px-3 py-1.5 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-cobalt"
              >
                <span>Siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              <div className="flex items-center gap-2 text-[12px] text-ink-muted tabular-nums">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: activePhase.color }}
                />
                <span>Temperatura en esta etapa: {activePhase.tempDisplay}</span>
              </div>

              <h3 className="mt-1.5 font-display text-[20px] font-medium leading-[1.2] tracking-[-0.018em] text-ink">
                {activePhase.code} · {activePhase.name}
              </h3>

              <p className="mt-2.5 text-[14px] leading-relaxed text-ink-muted">
                {activePhase.summary}
              </p>

              <dl className="mt-4 space-y-2.5 border-t border-rule pt-4 text-[13px]">
                <div>
                  <dt className="text-[11px] font-medium text-ink-muted">Qué ingresa</dt>
                  <dd className="mt-0.5 text-ink">{activePhase.inputLabel}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-ink-muted">Máquina y transporte</dt>
                  <dd className="mt-0.5 font-medium text-ink">{activePhase.machineAction}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-ink-muted">Qué sale hacia el siguiente paso</dt>
                  <dd className="mt-0.5 text-ink">{activePhase.outputLabel}</dd>
                </div>
              </dl>

              {matchedPaso?.reaccion_balanceada && (
                <div className="mt-4 border border-rule bg-stone-bg px-3.5 py-2.5 text-[12px]">
                  <span className="block text-[11px] text-ink-muted">Reacción química balanceada</span>
                  <code className="mt-1 block font-mono text-[13px] font-medium text-cobalt">
                    {matchedPaso.reaccion_balanceada}
                  </code>
                </div>
              )}

              <div className="mt-5 border-t border-rule pt-4">
                <p className="text-[12px] font-medium text-ink-muted">
                  Qué estás viendo en el 3D (tocá una pieza)
                </p>
                <div className="mt-2.5 space-y-1.5">
                  {phaseParts.map((part) => {
                    const isSel = selectedPart?.n === part.n;
                    return (
                      <button
                        key={part.n}
                        type="button"
                        onClick={() => setSelectedPartNum(part.n)}
                        className={`w-full cursor-pointer border px-3 py-2 text-left transition-colors duration-150 ${
                          isSel
                            ? 'border-ink bg-stone-bg text-ink'
                            : 'border-rule bg-stone-surface text-ink-muted hover:border-rule-strong/50 hover:text-ink'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center text-[11px] font-medium tabular-nums ${
                              isSel ? 'bg-ink text-white' : 'bg-stone-subtle text-ink'
                            }`}
                          >
                            {part.n}
                          </span>
                          <div className="min-w-0">
                            <span className="block text-[13px] font-medium text-ink">
                              {part.name}
                            </span>
                            <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted">
                              {part.description}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-rule pt-4 text-[12px] tabular-nums">
            {kpis.map((kpi) => (
              <div key={kpi.label}>
                <dt className="text-ink-muted">{kpi.label}</dt>
                <dd className={`mt-0.5 font-medium ${kpi.accentClass ?? 'text-ink'}`}>
                  {kpi.value}
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </div>
  );
}
