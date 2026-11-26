import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Focus,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
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

const SPEEDS = [
  { divisor: 4, label: '1/4x' },
  { divisor: 2, label: '1/2x' },
  { divisor: 1, label: '1x' },
] as const;

export function AluarProcessAnatomy({
  pasos,
  produccionLiquidaT,
  aluminaImportadaT,
  energiaElectrolisisMwhT,
}: AluarProcessAnatomyProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const leadersSvgRef = useRef<SVGSVGElement | null>(null);
  const calloutItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const leaderLineRefs = useRef<Array<SVGPolylineElement | null>>([]);
  const leaderDotRefs = useRef<Array<SVGCircleElement | null>>([]);
  const playheadRef = useRef<HTMLDivElement | null>(null);
  const degreeLabelRef = useRef<HTMLSpanElement | null>(null);
  const gaugeNeedleRef = useRef<SVGGElement | null>(null);
  const gaugeTextRef = useRef<HTMLSpanElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const [playing, setPlaying] = useState(true);
  const [speedDivisor, setSpeedDivisor] = useState<number>(2);
  const [loadPct, setLoadPct] = useState<number>(78);
  const [activePhaseIdx, setActivePhaseIdx] = useState<number>(0);

  const [showCasings, setShowCasings] = useState(true);
  const [showFlows, setShowFlows] = useState(true);
  const [showCallouts, setShowCallouts] = useState(true);
  const [followPhaseCam, setFollowPhaseCam] = useState(false);
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Estado mutable leído a 60 fps sin disparar re-renders de React en cada frame
  const simRef = useRef<{
    theta: number;
    playing: boolean;
    speedDivisor: number;
    loadFactor: number;
    tween: { from: number; to: number; t: number; dur: number } | null;
    scrubbing: boolean;
    showCallouts: boolean;
    followPhaseCam: boolean;
    userDraggingOrbit: boolean;
    desiredTarget: THREE.Vector3;
    desiredDist: number;
    hasDesiredCam: boolean;
    kit: InkworksKit | null;
    model: AluarMechanismModel | null;
    phaseIdx: number;
  }>({
    theta: 14,
    playing: true,
    speedDivisor: 2,
    loadFactor: 0.78,
    tween: null,
    scrubbing: false,
    showCallouts: true,
    followPhaseCam: false,
    userDraggingOrbit: false,
    desiredTarget: new THREE.Vector3(...ALUAR_OVERVIEW_CAMERA.target),
    desiredDist: 22,
    hasDesiredCam: false,
    kit: null,
    model: null,
    phaseIdx: 0,
  });

  useEffect(() => {
    simRef.current.playing = playing;
  }, [playing]);

  useEffect(() => {
    simRef.current.speedDivisor = speedDivisor;
  }, [speedDivisor]);

  useEffect(() => {
    simRef.current.loadFactor = loadPct / 100;
  }, [loadPct]);

  useEffect(() => {
    simRef.current.showCallouts = showCallouts;
  }, [showCallouts]);

  useEffect(() => {
    simRef.current.followPhaseCam = followPhaseCam;
    if (followPhaseCam) {
      const ph = ALUAR_PHASES[simRef.current.phaseIdx]!;
      simRef.current.desiredTarget.set(...ph.cameraTarget);
      simRef.current.hasDesiredCam = true;
    }
  }, [followPhaseCam]);

  useEffect(() => {
    simRef.current.model?.setLayer('casings', showCasings);
  }, [showCasings]);

  useEffect(() => {
    simRef.current.model?.setLayer('flows', showFlows);
  }, [showFlows]);

  useEffect(() => {
    if (simRef.current.kit) {
      simRef.current.kit.controls.autoRotate = autoOrbit;
    }
  }, [autoOrbit]);

  const computeFitDistance = useCallback((kit: InkworksKit, radius: number, w: number, h: number) => {
    const vFov = kit.camera.fov * D2R;
    const tanV = Math.tan(vFov / 2);
    const tanH = tanV * (w / Math.max(1, h));
    const compactBoost = w < 720 ? 1.18 : 1.0;
    return Math.max(8.5, Math.min(38, (radius * compactBoost) / Math.min(tanV, tanH)));
  }, []);

  const resetCamera = useCallback(() => {
    const { kit } = simRef.current;
    const stage = stageRef.current;
    if (!kit || !stage) return;
    setFollowPhaseCam(false);
    const rect = stage.getBoundingClientRect();
    const dist = computeFitDistance(
      kit,
      ALUAR_OVERVIEW_CAMERA.radius,
      rect.width || 960,
      rect.height || 540
    );
    const dir = new THREE.Vector3(...ALUAR_OVERVIEW_CAMERA.dir).normalize();
    simRef.current.desiredTarget.set(...ALUAR_OVERVIEW_CAMERA.target);
    simRef.current.desiredDist = dist;
    kit.controls.target.copy(simRef.current.desiredTarget);
    kit.camera.position.copy(simRef.current.desiredTarget).addScaledVector(dir, dist);
    kit.controls.update();
    simRef.current.hasDesiredCam = false;
  }, [computeFitDistance]);

  const jumpToPhase = useCallback(
    (phaseIdx: number, direction: -1 | 0 | 1 = 0, focusCam = false) => {
      const targetPhase = ALUAR_PHASES[phaseIdx];
      if (!targetPhase) return;
      const cur = mod(simRef.current.theta, ALUAR_CYCLE_DEG);
      const dest = targetPhase.startDeg + 6;
      let d = mod(dest - cur, ALUAR_CYCLE_DEG);
      if (direction < 0 && d > 0) d -= ALUAR_CYCLE_DEG;
      else if (direction === 0 && d > ALUAR_CYCLE_DEG / 2) d -= ALUAR_CYCLE_DEG;

      simRef.current.tween = {
        from: simRef.current.theta,
        to: simRef.current.theta + d,
        t: 0,
        dur: 0.52,
      };
      setActivePhaseIdx(phaseIdx);
      simRef.current.phaseIdx = phaseIdx;

      if (focusCam || simRef.current.followPhaseCam) {
        const { kit } = simRef.current;
        const stage = stageRef.current;
        if (kit && stage) {
          const rect = stage.getBoundingClientRect();
          simRef.current.desiredTarget.set(...targetPhase.cameraTarget);
          simRef.current.desiredDist = computeFitDistance(
            kit,
            targetPhase.cameraRadius,
            rect.width || 960,
            rect.height || 540
          );
          simRef.current.hasDesiredCam = true;
        }
      }
    },
    [computeFitDistance]
  );

  const stepPhase = useCallback(
    (dir: -1 | 1) => {
      setPlaying(false);
      const curIdx = getPhaseIndexAt(simRef.current.theta);
      const nextIdx = (curIdx + dir + ALUAR_PHASES.length) % ALUAR_PHASES.length;
      jumpToPhase(nextIdx, dir);
    },
    [jumpToPhase]
  );

  // Montaje WebGL Three.js + bucle determinista a 60 fps
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

    kit.controls.minDistance = 7.5;
    kit.controls.maxDistance = 42;

    const onStartInteract = () => {
      simRef.current.userDraggingOrbit = true;
      simRef.current.hasDesiredCam = false;
    };
    const onEndInteract = () => {
      simRef.current.userDraggingOrbit = false;
    };
    kit.controls.addEventListener('start', onStartInteract);
    kit.controls.addEventListener('end', onEndInteract);

    let vw = stage.clientWidth || 960;
    let vh = stage.clientHeight || 540;

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
    const initDist = computeFitDistance(kit, ALUAR_OVERVIEW_CAMERA.radius, vw, vh);
    const initDir = new THREE.Vector3(...ALUAR_OVERVIEW_CAMERA.dir).normalize();
    kit.controls.target.set(...ALUAR_OVERVIEW_CAMERA.target);
    kit.camera.position.copy(kit.controls.target).addScaledVector(initDir, initDist);
    kit.controls.update();

    const ro = new ResizeObserver(() => updateLayout());
    ro.observe(stage);

    let lastTimeMs = performance.now();
    const camDirTmp = new THREE.Vector3();
    let rafId = 0;

    const frame = (nowMs: number) => {
      const dt = Math.min(Math.max(0, (nowMs - lastTimeMs) / 1000), 0.05);
      lastTimeMs = nowMs;
      const s = simRef.current;

      if (s.tween) {
        s.tween.t += dt / s.tween.dur;
        const k = s.tween.t >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * s.tween.t);
        s.theta = s.tween.from + (s.tween.to - s.tween.from) * k;
        if (s.tween.t >= 1) s.tween = null;
      } else if (s.playing && !s.scrubbing) {
        const baseDegPerSec = 34 + 26 * s.loadFactor;
        s.theta += (baseDegPerSec / s.speedDivisor) * dt;
      }

      model.pose(s.theta, dt, s.loadFactor);

      const phi = mod(s.theta, ALUAR_CYCLE_DEG);
      const pIdx = getPhaseIndexAt(phi);
      if (pIdx !== s.phaseIdx) {
        s.phaseIdx = pIdx;
        setActivePhaseIdx(pIdx);
        if (s.followPhaseCam && !s.userDraggingOrbit) {
          const ph = ALUAR_PHASES[pIdx]!;
          s.desiredTarget.set(...ph.cameraTarget);
          s.desiredDist = computeFitDistance(kit, ph.cameraRadius, vw, vh);
          s.hasDesiredCam = true;
        }
      }

      if (s.hasDesiredCam && !s.userDraggingOrbit) {
        const alpha = 1 - Math.exp(-dt * 4.5);
        kit.controls.target.lerp(s.desiredTarget, alpha);
        camDirTmp.copy(kit.camera.position).sub(kit.controls.target);
        const curDist = Math.max(0.1, camDirTmp.length());
        const nextDist = curDist + (s.desiredDist - curDist) * alpha;
        camDirTmp.normalize().multiplyScalar(nextDist);
        kit.camera.position.copy(kit.controls.target).add(camDirTmp);
        if (
          kit.controls.target.distanceTo(s.desiredTarget) < 0.02 &&
          Math.abs(curDist - s.desiredDist) < 0.05
        ) {
          s.hasDesiredCam = false;
        }
      }

      kit.controls.update();
      kit.renderer.render(kit.scene, kit.camera);

      // Actualizar aguja del dial de temperatura/carga y barra de ciclo directo en DOM (60 fps limpios)
      if (playheadRef.current) {
        playheadRef.current.style.left = `${(phi / ALUAR_CYCLE_DEG) * 100}%`;
      }
      if (degreeLabelRef.current) {
        degreeLabelRef.current.textContent = `${Math.round(phi)}°`;
      }

      // Temperatura / intensidad instantánea según fase
      const gaugeTemp =
        pIdx === 0
          ? 28 + 12 * Math.sin(phi * D2R * 2)
          : pIdx === 1
            ? 1120 + 35 * s.loadFactor
            : pIdx === 2
              ? 955 + 12 * s.loadFactor
              : pIdx === 3
                ? 115 + 15 * s.loadFactor
                : 715 + 20 * s.loadFactor;
      if (gaugeNeedleRef.current) {
        const norm = Math.min(1, Math.max(0, gaugeTemp / 1200));
        const angle = -120 + norm * 240;
        gaugeNeedleRef.current.setAttribute('transform', `rotate(${angle.toFixed(1)} 100 100)`);
      }
      if (gaugeTextRef.current) {
        gaugeTextRef.current.textContent = `${Math.round(gaugeTemp)} °C`;
      }

      // Proyectar globos numerados en 2 columnas sin superposición
      if (s.showCallouts) {
        const placed = projectCallouts2Columns(
          model.callouts,
          kit.camera,
          vw,
          vh,
          ALUAR_OVERVIEW_CAMERA.worldBox,
          model.compactCalloutIds
        );
        const byNum = new Map(placed.map((p) => [p.n, p]));

        model.callouts.forEach((def, idx) => {
          const btn = calloutItemRefs.current[idx];
          const poly = leaderLineRefs.current[idx];
          const dot = leaderDotRefs.current[idx];
          const item = byNum.get(def.n);
          if (!btn || !poly || !dot) return;

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

  // Scrubbing directo sobre la barra de ciclo (como barra de progreso de video)
  const scrubTimelineAt = useCallback((clientX: number) => {
    const el = timelineRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const targetDeg = frac * ALUAR_CYCLE_DEG;
    const cur = mod(simRef.current.theta, ALUAR_CYCLE_DEG);
    let d = targetDeg - cur;
    if (d > ALUAR_CYCLE_DEG / 2) d -= ALUAR_CYCLE_DEG;
    if (d < -ALUAR_CYCLE_DEG / 2) d += ALUAR_CYCLE_DEG;
    simRef.current.theta += d;
  }, []);

  // Exportar imagen PNG HD nítida (papel cuadriculado + modelo 3D + rótulo)
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
    ctx.strokeStyle = 'rgba(20, 23, 31, 0.06)';
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
    ctx.fillStyle = INK_HEX;
    ctx.font = '500 22px Inter, sans-serif';
    ctx.fillText('FIG. 01 · Aluar Puerto Madryn (Golfo Nuevo a Fundición)', 28, h - 28);

    const a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = 'aluar-circuito-inkworks-3d.png';
    a.click();
  }, []);

  // Grabar clip de video WebM a 60 fps del recorrido completo (8 segundos) directo en el navegador
  const handleRecordVideoClip = useCallback(() => {
    const glCanvas = canvasRef.current;
    if (!glCanvas || isRecording || typeof MediaRecorder === 'undefined') return;

    setIsRecording(true);
    setPlaying(true);
    simRef.current.playing = true;
    const prevSpeed = simRef.current.speedDivisor;
    simRef.current.speedDivisor = 1;
    setSpeedDivisor(1);

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
      ctx.fillRect(24, h - 62, 540, 38);
      ctx.fillStyle = ph.color;
      ctx.fillRect(24, h - 62, 6, 38);
      ctx.fillStyle = '#ffffff';
      ctx.font = '500 18px Inter, sans-serif';
      ctx.fillText(`Etapa ${ph.code} · ${ph.name}`, 42, h - 37);

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
      simRef.current.speedDivisor = prevSpeed;
      setSpeedDivisor(prevSpeed);
      setIsRecording(false);
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aluar-proceso-3d-inkworks.webm';
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    };

    recorder.start();
    window.setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop();
    }, 8000);
  }, [isRecording]);

  const activePhase = ALUAR_PHASES[activePhaseIdx] ?? ALUAR_PHASES[0]!;
  const matchedPaso = useMemo(
    () => pasos.find((p) => p.paso_id === activePhase.pasoId) ?? pasos[activePhaseIdx] ?? null,
    [pasos, activePhase.pasoId, activePhaseIdx]
  );

  const currentKa = Math.round(175 + (loadPct / 100) * 55);

  return (
    <div className="border border-rule bg-stone-surface">
      {/* Barra superior de lámina de ingeniería (estilo Inkworks) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-stone-bg px-4 py-2.5 text-[12px] sm:px-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="bg-ink px-2 py-0.5 font-medium text-white tabular-nums">FIG. 01</span>
          <span className="text-ink-muted">
            Lámina 3D en movimiento · Golfo Nuevo, Muelle Storni, electrólisis y colada
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              {
                key: 'casings',
                label: 'Carcasas',
                on: showCasings,
                toggle: () => setShowCasings((v) => !v),
              },
              {
                key: 'flows',
                label: 'Flujos',
                on: showFlows,
                toggle: () => setShowFlows((v) => !v),
              },
              {
                key: 'labels',
                label: 'Etiquetas (12)',
                on: showCallouts,
                toggle: () => setShowCallouts((v) => !v),
              },
              {
                key: 'focus',
                label: 'Seguir etapa',
                on: followPhaseCam,
                toggle: () => setFollowPhaseCam((v) => !v),
              },
              {
                key: 'orbit',
                label: 'Giro 3D',
                on: autoOrbit,
                toggle: () => setAutoOrbit((v) => !v),
              },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={item.on}
              onClick={item.toggle}
              className={`cursor-pointer border px-2.5 py-1 font-medium transition-colors duration-150 ${
                item.on
                  ? 'border-ink bg-ink text-white'
                  : 'border-rule bg-stone-surface text-ink-muted hover:border-ink hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          ))}

          <button
            type="button"
            onClick={handleDownloadPng}
            title="Descargar imagen PNG de alta nitidez"
            className="inline-flex cursor-pointer items-center gap-1 border border-rule bg-stone-surface px-2.5 py-1 font-medium text-ink transition-colors duration-150 hover:border-ink hover:text-cobalt"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>PNG</span>
          </button>

          <button
            type="button"
            onClick={handleRecordVideoClip}
            disabled={isRecording}
            title="Grabar clip de video WebM a 60 fps (8 segundos)"
            className={`inline-flex cursor-pointer items-center gap-1 border px-2.5 py-1 font-medium transition-colors duration-150 ${
              isRecording
                ? 'border-signal-red bg-signal-red text-white'
                : 'border-rule bg-stone-surface text-ink hover:border-ink hover:text-cobalt'
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            <span>{isRecording ? 'Grabando 8s...' : 'Clip WebM'}</span>
          </button>
        </div>
      </div>

      {/* Escenario 3D sobre papel milimetrado técnico + 12 globos numerados sin colisión */}
      <div
        ref={stageRef}
        className="relative h-[460px] w-full overflow-hidden select-none sm:h-[540px] lg:h-[580px]"
        style={{
          backgroundColor: PAPER_HEX,
          backgroundImage:
            'linear-gradient(to right, rgba(20,23,31,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,23,31,0.05) 1px, transparent 1px), linear-gradient(to right, rgba(20,23,31,0.095) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,23,31,0.095) 1px, transparent 1px)',
          backgroundSize: '20px 20px, 20px 20px, 100px 100px, 100px 100px',
        }}
      >
        {/* Coordenadas de zona en el margen superior como hoja de ingeniería */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden grid-cols-8 border-b border-rule/60 text-center text-[10px] text-ink-muted/70 tabular-nums sm:grid"
        >
          {['1 · MAR', '2 · MUELLE', '3 · SILOS', '4 · ÁNODOS', '5 · CUBA', '6 · GTC', '7 · SIFÓN', '8 · COLADA'].map(
            (zone) => (
              <span key={zone} className="border-r border-rule/40 py-0.5 last:border-r-0">
                {zone}
              </span>
            )
          )}
        </div>

        <canvas
          ref={canvasRef}
          aria-label="Simulación 3D interactiva del proceso completo de Aluar en Puerto Madryn"
          className="block h-full w-full cursor-grab active:cursor-grabbing"
        />

        {/* Líneas guía quebradas (leaders) en SVG sincronizadas a 60 fps */}
        <svg
          ref={leadersSvgRef}
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-150 ${
            showCallouts ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {Array.from({ length: 12 }, (_, idx) => (
            <g key={idx}>
              <polyline
                ref={(el) => {
                  leaderLineRefs.current[idx] = el;
                }}
                fill="none"
                stroke="rgba(20, 23, 31, 0.58)"
                strokeWidth="1"
              />
              <circle
                ref={(el) => {
                  leaderDotRefs.current[idx] = el;
                }}
                r="2.6"
                fill={INK_HEX}
              />
            </g>
          ))}
        </svg>

        {/* 12 globos numerados interactivos en 2 columnas laterales */}
        <div
          className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-150 ${
            showCallouts ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {[
            { n: 1, name: 'Golfo Nuevo y Muelle Storni', phaseIndex: 0 },
            { n: 2, name: 'Buque granelero (Al2O3)', phaseIndex: 0 },
            { n: 3, name: 'Grúa succionadora neumática', phaseIndex: 0 },
            { n: 4, name: 'Conducto hermético a silos', phaseIndex: 0 },
            { n: 5, name: 'Silos cónicos de alúmina', phaseIndex: 0 },
            { n: 6, name: 'Horno de cocción de ánodos', phaseIndex: 1 },
            { n: 7, name: 'Monorriel de ánodos (C)', phaseIndex: 1 },
            { n: 8, name: 'Barras DC y rompe-costra', phaseIndex: 2 },
            { n: 9, name: 'Cuba Hall-Héroult (960 °C)', phaseIndex: 2 },
            { n: 10, name: 'Ciclones y reciclo GTC (>99%)', phaseIndex: 3 },
            { n: 11, name: 'Crisol de sifonado al vacío', phaseIndex: 4 },
            { n: 12, name: 'Horno y colada de lingotes', phaseIndex: 4 },
          ].map((item, idx) => {
            const isPhaseActive = activePhaseIdx === item.phaseIndex;
            return (
              <button
                key={item.n}
                ref={(el) => {
                  calloutItemRefs.current[idx] = el;
                }}
                type="button"
                onClick={() => jumpToPhase(item.phaseIndex, 0, true)}
                style={{ opacity: 0 }}
                className={`group absolute inline-flex cursor-pointer items-center gap-1.5 border px-2 py-0.5 text-[12px] whitespace-nowrap shadow-2xs transition-colors duration-150 ${
                  isPhaseActive
                    ? 'border-ink bg-ink text-white'
                    : 'border-rule-strong/30 bg-stone-surface/95 text-ink hover:border-ink'
                }`}
              >
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center text-[11px] font-medium tabular-nums ${
                    isPhaseActive ? 'bg-white text-ink' : 'bg-stone-subtle text-ink'
                  }`}
                >
                  {item.n}
                </span>
                <span className="font-normal">{item.name}</span>
              </button>
            );
          })}
        </div>

        {/* Controles flotantes discretos abajo del lienzo 3D */}
        <div className="pointer-events-none absolute inset-x-4 bottom-3 z-20 flex flex-wrap items-center justify-between gap-2 text-[12px]">
          <span className="border border-rule bg-stone-surface/92 px-2.5 py-1 text-ink-muted backdrop-blur-xs">
            Arrastrá para orbitar en 3D · Rueda para zoom · Click en globo para acercar máquina
          </span>
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => jumpToPhase(activePhaseIdx, 0, true)}
              className="inline-flex cursor-pointer items-center gap-1 border border-rule bg-stone-surface/95 px-2.5 py-1 font-medium text-ink transition-colors duration-150 hover:border-ink hover:text-cobalt"
            >
              <Focus className="h-3.5 w-3.5" />
              <span>Acercar a etapa {activePhase.code}</span>
            </button>
            <button
              type="button"
              onClick={resetCamera}
              className="inline-flex cursor-pointer items-center gap-1 border border-rule bg-stone-surface/95 px-2.5 py-1 font-medium text-ink transition-colors duration-150 hover:border-ink hover:text-cobalt"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Vista general</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de reproducción y línea de tiempo arrastrable 0°..360° (Chart C de Inkworks) */}
      <div className="border-t border-rule bg-stone-bg px-4 py-3.5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Transporte Play / Pause / Prev / Next */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => stepPhase(-1)}
              aria-label="Etapa anterior"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center border border-rule bg-stone-surface text-ink transition-colors duration-150 hover:border-ink"
            >
              <SkipBack className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                simRef.current.tween = null;
                setPlaying((p) => !p);
              }}
              aria-label={playing ? 'Pausar simulación' : 'Reproducir simulación'}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center bg-ink text-white transition-colors duration-150 hover:bg-cobalt"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => stepPhase(1)}
              aria-label="Siguiente etapa"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center border border-rule bg-stone-surface text-ink transition-colors duration-150 hover:border-ink"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>

            <div className="ml-2 flex border border-rule bg-stone-surface p-0.5 text-[12px]">
              {SPEEDS.map((sp) => (
                <button
                  key={sp.divisor}
                  type="button"
                  onClick={() => setSpeedDivisor(sp.divisor)}
                  className={`cursor-pointer px-2 py-0.5 font-medium tabular-nums transition-colors duration-150 ${
                    speedDivisor === sp.divisor
                      ? 'bg-ink text-white'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slider conductor (intensidad de serie en kA) */}
          <div className="flex items-center gap-3 text-[12px] tabular-nums">
            <label htmlFor="aluar-potline-ka" className="text-ink-muted">
              Corriente de serie:
            </label>
            <input
              id="aluar-potline-ka"
              type="range"
              min={25}
              max={100}
              value={loadPct}
              onChange={(e) => setLoadPct(Number(e.target.value))}
              className="w-28 accent-ink sm:w-36"
            />
            <span className="w-14 font-medium text-ink">{currentKa} kA</span>
            <span className="text-ink-muted">
              Ciclo: <strong ref={degreeLabelRef} className="font-medium text-ink">14°</strong>
            </span>
          </div>
        </div>

        {/* Cronograma de ciclo arrastrable (scrubbable) dividido en las 5 etapas */}
        <div
          ref={timelineRef}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            simRef.current.scrubbing = true;
            simRef.current.tween = null;
            scrubTimelineAt(e.clientX);
          }}
          onPointerMove={(e) => {
            if (simRef.current.scrubbing) scrubTimelineAt(e.clientX);
          }}
          onPointerUp={() => {
            simRef.current.scrubbing = false;
          }}
          onPointerCancel={() => {
            simRef.current.scrubbing = false;
          }}
          role="slider"
          tabIndex={0}
          aria-label="Línea de tiempo del ciclo industrial de Aluar (arrastrá para avanzar o retroceder)"
          aria-valuemin={0}
          aria-valuemax={360}
          className="relative mt-3 h-8 w-full cursor-ew-resize select-none border border-rule bg-stone-surface"
        >
          <div className="flex h-full w-full">
            {ALUAR_PHASES.map((ph) => {
              const widthPct = ((ph.endDeg - ph.startDeg) / ALUAR_CYCLE_DEG) * 100;
              const isCurrent = ph.index === activePhaseIdx;
              return (
                <div
                  key={ph.code}
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: ph.color,
                    opacity: isCurrent ? 0.92 : 0.24,
                  }}
                  className="flex h-full items-center border-r border-white/40 px-2 transition-opacity duration-150 last:border-r-0"
                >
                  <span
                    className={`truncate text-[11px] font-medium tracking-wide ${
                      isCurrent ? 'text-white' : 'text-ink'
                    }`}
                  >
                    {ph.code} · {ph.short}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Cabezal móvil (playhead) */}
          <div
            ref={playheadRef}
            style={{ left: '4%' }}
            className="pointer-events-none absolute inset-y-0 z-10 w-[2px] -translate-x-1/2 bg-ink"
          >
            <span className="absolute -top-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-ink" />
          </div>
        </div>
      </div>

      {/* Ficha inferior: Detalle de máquina, transporte físico, reacción e instrumento de aguja */}
      <div className="grid border-t border-rule lg:grid-cols-12">
        {/* Bloque A: Explicación de la etapa activa y cómo se transporta el material */}
        <div className="flex flex-col justify-between p-6 lg:col-span-8 lg:border-r lg:border-rule">
          <div>
            {/* Selector directo de las 5 fases */}
            <div className="flex flex-wrap gap-1.5 border-b border-rule pb-4">
              {ALUAR_PHASES.map((ph) => {
                const isSel = ph.index === activePhaseIdx;
                return (
                  <button
                    key={ph.code}
                    type="button"
                    onClick={() => {
                      setPlaying(false);
                      jumpToPhase(ph.index, 0, true);
                    }}
                    className={`inline-flex cursor-pointer items-center gap-2 border px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                      isSel
                        ? 'border-ink bg-ink text-white'
                        : 'border-rule bg-stone-bg text-ink hover:border-ink'
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: isSel ? '#ffffff' : ph.color }}
                    />
                    <span className="tabular-nums">{ph.code}</span>
                    <span>{ph.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="font-display text-[20px] font-medium leading-[1.2] tracking-[-0.018em] text-ink">
                Etapa {activePhase.code}: {activePhase.name}
              </h3>
              {matchedPaso?.reaccion_balanceada && (
                <span className="bg-stone-subtle px-2.5 py-1 text-[13px] font-medium text-cobalt tabular-nums">
                  {matchedPaso.reaccion_balanceada}
                </span>
              )}
            </div>

            <p className="mt-2.5 max-w-[70ch] text-[14px] font-normal leading-relaxed text-ink">
              {activePhase.summary}
            </p>

            <p className="mt-3 border-l-2 border-cobalt bg-stone-bg px-3.5 py-2.5 text-[13px] font-normal text-ink-muted">
              {activePhase.transportDetail}
            </p>
          </div>

          {/* 4 magnitudes reales verificadas en pie tabular */}
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-rule pt-4 text-[13px] sm:grid-cols-4 tabular-nums">
            <div>
              <dt className="text-[12px] text-ink-muted">Alúmina en puerto (2024)</dt>
              <dd className="mt-0.5 font-display text-[17px] font-medium text-ink">
                {aluminaImportadaT !== null
                  ? `${Math.round(aluminaImportadaT).toLocaleString('es-AR')} t`
                  : 'Sin datos'}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink-muted">Energía en cubas</dt>
              <dd className="mt-0.5 font-display text-[17px] font-medium text-cobalt">
                {energiaElectrolisisMwhT !== null
                  ? `${energiaElectrolisisMwhT.toLocaleString('es-AR', { minimumFractionDigits: 2 })} MWh/t`
                  : 'Sin datos'}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink-muted">Captura seca GTC</dt>
              <dd className="mt-0.5 font-display text-[17px] font-medium text-emerald-react">
                &gt;99% HF
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink-muted">Aluminio líquido (FY25)</dt>
              <dd className="mt-0.5 font-display text-[17px] font-medium text-ink">
                {produccionLiquidaT !== null
                  ? `${produccionLiquidaT.toLocaleString('es-AR')} t`
                  : 'Sin datos'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Bloque B: Instrumento térmico de aguja (estilo Inkworks Block B) + rótulo de plano */}
        <div className="flex flex-col justify-between bg-stone-bg/60 p-6 lg:col-span-4">
          <div>
            <div className="flex items-center justify-between border-b border-rule pb-2.5 text-[12px] text-ink-muted">
              <span className="font-medium text-ink">Instrumento de etapa</span>
              <span>Régimen térmico</span>
            </div>

            <div className="mt-4 flex flex-col items-center">
              <svg viewBox="0 0 200 132" className="h-32 w-48">
                <path
                  d="M 28 106 A 78 78 0 1 1 172 106"
                  fill="none"
                  stroke="#cfd5df"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M 145 42 A 78 78 0 0 1 172 106"
                  fill="none"
                  stroke="#d93025"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                {[0, 300, 600, 900, 1200].map((val) => {
                  const a = (-210 + (val / 1200) * 240) * D2R;
                  const x0 = 100 + Math.cos(a) * 66;
                  const y0 = 100 + Math.sin(a) * 66;
                  const x1 = 100 + Math.cos(a) * 76;
                  const y1 = 100 + Math.sin(a) * 76;
                  const tx = 100 + Math.cos(a) * 52;
                  const ty = 100 + Math.sin(a) * 52;
                  return (
                    <g key={val}>
                      <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={INK_HEX} strokeWidth="1.4" />
                      <text
                        x={tx}
                        y={ty + 3}
                        textAnchor="middle"
                        fontSize="9"
                        fontFamily="Inter, sans-serif"
                        fill="#52555e"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}
                <g ref={gaugeNeedleRef} transform="rotate(-110 100 100)">
                  <line
                    x1="100"
                    y1="108"
                    x2="100"
                    y2="32"
                    stroke="#d93025"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </g>
                <circle cx="100" cy="100" r="5.5" fill={PAPER_HEX} stroke={INK_HEX} strokeWidth="1.5" />
              </svg>
              <span
                ref={gaugeTextRef}
                className="-mt-2 font-display text-[20px] font-medium text-ink tabular-nums"
              >
                960 °C
              </span>
              <span className="text-[12px] text-ink-muted">Temperatura operativa en foco</span>
            </div>
          </div>

          {/* Rótulo técnico de plano (Title Block de Inkworks) */}
          <div className="mt-5 border border-rule bg-stone-surface p-3 text-[12px] tabular-nums">
            <div className="flex items-baseline justify-between border-b border-rule pb-1.5">
              <span className="text-ink-muted">Plano</span>
              <span className="font-medium text-ink">ALU-PMY-INK-01</span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-ink-muted">Ubicación</span>
              <span className="text-ink">Puerto Madryn, Chubut</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
