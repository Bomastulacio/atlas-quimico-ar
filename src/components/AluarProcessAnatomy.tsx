import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { Focus, Layers, Maximize2, Pause, Play, RotateCcw } from 'lucide-react';
import type { PasoProceso } from '@/schemas';
import {
  buildAluarAnatomyScene,
  buildDialNeedlePath,
  type AluarAssemblyId,
  type DrawnDots,
  type DrawnLine,
  type DrawnSolid,
  type DrawnTube,
  type StageCameraBox,
} from './aluar/aluarAnatomyGeometry';

interface AluarProcessAnatomyProps {
  pasos: PasoProceso[];
  produccionLiquidaT: number | null;
  aluminaImportadaT: number | null;
  energiaElectrolisisMwhT: number | null;
}

interface StageSpec {
  id: AluarAssemblyId;
  code: string;
  shortLabel: string;
  pasoId: string;
  dialTempC: number;
  calloutMetric: string;
  calloutCaption: string;
  physicalParts: string;
}

const SPRING_EXPLODE = {
  type: 'spring' as const,
  stiffness: 170,
  damping: 26,
  mass: 0.95,
};

const SPRING_TAB = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 34,
  mass: 0.85,
};

function SolidElement({ solid }: { solid: DrawnSolid }) {
  const {
    paths,
    tone = 'hi',
    crease = 'faint',
    lit = false,
    flat = false,
    className,
    innerLines,
    innerDots,
  } = solid;
  return (
    <g
      className={className ? `iso-solid ${className}` : 'iso-solid'}
      data-lit={lit ? '' : undefined}
      data-seamless={paths.seamless ? '' : undefined}
    >
      <path className="iso-fill" d={paths.fill} />
      {!flat &&
        paths.shades.map((d, idx) =>
          d ? <path key={idx} className="iso-shade" data-shade={String(idx)} d={d} /> : null
        )}
      {!flat && paths.top && <path className="iso-top" d={paths.top} />}
      {crease !== 'none' && paths.crease && (
        <path className="iso-line iso-crease" data-tone={crease} d={paths.crease} />
      )}
      {crease !== 'none' && paths.bevel && (
        <path className="iso-line iso-bevel" data-tone={crease} d={paths.bevel} />
      )}
      {innerLines?.map((ln, idx) => (
        <path key={idx} className="iso-line" data-tone={ln.tone ?? 'faint'} d={ln.d} />
      ))}
      {innerDots?.map((dt, idx) => (
        <g key={idx} className="iso-dots" data-tone={dt.tone ?? 'mid'}>
          {dt.points.map(([cx, cy], pIdx) => (
            <circle key={pIdx} cx={cx} cy={cy} r={dt.size ?? 0.5} />
          ))}
        </g>
      ))}
      {paths.outline && <path className="iso-line iso-edge" data-tone={tone} d={paths.outline} />}
    </g>
  );
}

function TubeElement({ tube }: { tube: DrawnTube }) {
  const { pieces, tone = 'hi', className } = tube;
  return (
    <g className={className ? `tb ${className}` : 'tb'}>
      {pieces.map((pc, idx) => (
        <g key={idx}>
          <path className="tb-body" d={pc.body} />
          {pc.wide && pc.shine && <path className="tb-shine" d={pc.shine} />}
          {pc.wide && pc.shade && <path className="tb-shade" d={pc.shade} />}
          <path className="iso-line tb-edge" data-tone={tone} d={pc.edges} />
        </g>
      ))}
    </g>
  );
}

function LinesLayer({ lines }: { lines: DrawnLine[] }) {
  return (
    <>
      {lines.map((ln) => (
        <path
          key={ln.id}
          className={ln.className ? `iso-line ${ln.className}` : 'iso-line'}
          data-tone={ln.tone ?? 'lo'}
          data-dashed={ln.dashed ? 'true' : undefined}
          data-flow={ln.flow ? 'true' : undefined}
          d={ln.d}
        />
      ))}
    </>
  );
}

function DotsLayer({ dots }: { dots: DrawnDots[] }) {
  return (
    <>
      {dots.map((dt) => (
        <g key={dt.id} className="iso-dots" data-tone={dt.tone ?? 'mid'}>
          {dt.points.map(([cx, cy], idx) => (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={dt.size ?? 0.55}
              data-pulse={dt.pulse ? 'true' : undefined}
            />
          ))}
        </g>
      ))}
    </>
  );
}

export function AluarProcessAnatomy({
  pasos,
  produccionLiquidaT,
  aluminaImportadaT,
  energiaElectrolisisMwhT,
}: AluarProcessAnatomyProps) {
  const scene = useMemo(() => buildAluarAnatomyScene(), []);

  const stages: StageSpec[] = useMemo(() => {
    const aluminaStr =
      aluminaImportadaT !== null
        ? `${Math.round(aluminaImportadaT).toLocaleString('es-AR')} t/año`
        : '1,96 t Al2O3/t Al';
    const energiaStr =
      energiaElectrolisisMwhT !== null
        ? `${energiaElectrolisisMwhT.toLocaleString('es-AR', { minimumFractionDigits: 2 })} MWh/t Al`
        : '14,20 MWh/t Al';
    const prodStr =
      produccionLiquidaT !== null
        ? `${produccionLiquidaT.toLocaleString('es-AR')} t Al`
        : '445.327 t Al';

    return [
      {
        id: 'silo',
        code: '01',
        shortLabel: 'Muelle Storni, buque y silos',
        pasoId: 'al-p2-recepcion-storni',
        dialTempC: 25,
        calloutMetric: aluminaStr,
        calloutCaption: 'Alúmina importada HS 2818.20 (UN Comtrade 2024)',
        physicalParts:
          'Golfo Nuevo, muelle sobre pilotes, buque granelero con bodegas de alúmina, torre neumática, galería cubierta y silos cónicos.',
      },
      {
        id: 'anodos',
        code: '02',
        shortLabel: 'Horno de ánodos y envarillado',
        pasoId: 'al-p3-planta-anodos',
        dialTempC: 1150,
        calloutMetric: '0,43 t C/t Al',
        calloutCaption: 'Consumo neto anódico · cocción 1.100 a 1.200 °C',
        physicalParts:
          'Horno de fosas incandescentes, puente quemador, mesa de envarillado y bloques de carbono precocido.',
      },
      {
        id: 'cuba',
        code: '03',
        shortLabel: 'Cuba Hall-Héroult en corte',
        pasoId: 'al-p4-electrolisis-hall-heroult',
        dialTempC: 960,
        calloutMetric: energiaStr,
        calloutCaption: `${prodStr} líquido FY 2024-25 · baño criolita 950 a 970 °C`,
        physicalParts:
          'Carcasa en corte, refractario, cátodo de carbono, colchón de Al líquido, baño criolita, 4 ánodos precocidos y viga CC.',
      },
      {
        id: 'gtc',
        code: '04',
        shortLabel: 'Gases GTC y reciclo HF',
        pasoId: 'al-p5-tratamiento-gases',
        dialTempC: 100,
        calloutMetric: '1,6 t CO2/t Al',
        calloutCaption: 'Captura seca de HF en reciclo cerrado · IPCC Table 4.10',
        physicalParts:
          'Ducto extractor, 2 ciclones reactores secos, filtros de mangas, chimenea cónica y ducto verde de retorno.',
      },
      {
        id: 'fundicion',
        code: '05',
        shortLabel: 'Fundición, lingotes y barrotes',
        pasoId: 'al-p6-fundicion-colada',
        dialTempC: 720,
        calloutMetric: '0,86 MWh/t Al',
        calloutCaption: '425.409 t solidificadas + 17.028 t líquido · 700 a 740 °C',
        physicalParts:
          'Crisol de vacío, horno de mantenimiento a 720 °C, lingotes T, barrotes cilíndricos de extrusión y bobina de alambrón.',
      },
    ];
  }, [aluminaImportadaT, energiaElectrolisisMwhT, produccionLiquidaT]);

  const [selectedId, setSelectedId] = useState<AluarAssemblyId>('cuba');
  const [hoveredId, setHoveredId] = useState<AluarAssemblyId | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [autoTour, setAutoTour] = useState(false);

  const activeId = hoveredId ?? selectedId;
  const activeStage = stages.find((s) => s.id === activeId) ?? stages[2]!;
  const activePaso = pasos.find((p) => p.paso_id === activeStage.pasoId) ?? null;

  // Interpolación suave de la cámara SVG (viewBox) al enfocar una etapa o volver a planta completa
  const targetCamera: StageCameraBox = zoomed ? scene.cameraViews[selectedId] : scene.cameraViews.all;
  const [cam, setCam] = useState<StageCameraBox>(scene.cameraViews.all);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setCam(targetCamera);
      return;
    }

    let frame = 0;
    let cur = { ...cam };
    const step = () => {
      const dx = targetCamera.x - cur.x;
      const dy = targetCamera.y - cur.y;
      const dw = targetCamera.w - cur.w;
      const dh = targetCamera.h - cur.h;
      if (
        Math.abs(dx) < 0.4 &&
        Math.abs(dy) < 0.4 &&
        Math.abs(dw) < 0.4 &&
        Math.abs(dh) < 0.4
      ) {
        setCam(targetCamera);
        return;
      }
      cur = {
        x: cur.x + dx * 0.16,
        y: cur.y + dy * 0.16,
        w: cur.w + dw * 0.16,
        h: cur.h + dh * 0.16,
      };
      setCam(cur);
      frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCamera.x, targetCamera.y, targetCamera.w, targetCamera.h]);

  // Interpolación suave de la aguja del dial de temperatura
  const [needleTemp, setNeedleTemp] = useState(activeStage.dialTempC);
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setNeedleTemp(activeStage.dialTempC);
      return;
    }
    let frame = 0;
    let current = needleTemp;
    const target = activeStage.dialTempC;
    const step = () => {
      const diff = target - current;
      if (Math.abs(diff) < 1.2) {
        setNeedleTemp(target);
        return;
      }
      current += diff * 0.14;
      setNeedleTemp(current);
      frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStage.dialTempC]);

  // Recorrido automático por las 5 etapas
  useEffect(() => {
    if (!autoTour) return;
    const timer = window.setInterval(() => {
      setSelectedId((curr) => {
        const idx = stages.findIndex((s) => s.id === curr);
        return stages[(idx + 1) % stages.length]!.id;
      });
    }, 3800);
    return () => window.clearInterval(timer);
  }, [autoTour, stages]);

  const needlePath = useMemo(() => buildDialNeedlePath(needleTemp, scene), [needleTemp, scene]);

  const isDimmed = (id: AluarAssemblyId) => hoveredId !== null && hoveredId !== id;
  const isActive = (id: AluarAssemblyId) => activeId === id;

  const handleSelectAssembly = (id: AluarAssemblyId, shouldZoom?: boolean) => {
    setAutoTour(false);
    setSelectedId(id);
    if (shouldZoom !== undefined) {
      setZoomed(shouldZoom);
    }
  };

  const viewBoxStr = `${cam.x.toFixed(1)} ${cam.y.toFixed(1)} ${cam.w.toFixed(1)} ${cam.h.toFixed(1)}`;

  return (
    <MotionConfig reducedMotion="user">
      <div className="border border-rule bg-stone-surface">
        {/* Cabecera de controles táctiles: Vista planta / Enfocar etapa + Despiece + Recorrido */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-3.5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[13px] font-medium text-ink tabular-nums">Fig. 01</span>
            <span className="text-rule-strong/30">/</span>
            <span className="text-[13px] text-ink-muted">
              Diorama costero e industrial Aluar (Golfo Nuevo, Muelle Storni y planta Puerto Madryn)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Switch cámara: Planta completa / Zoom en etapa */}
            <div
              role="group"
              aria-label="Encuadre de cámara"
              className="inline-flex bg-stone-subtle p-0.5 text-[13px]"
            >
              <button
                type="button"
                aria-pressed={!zoomed}
                onClick={() => setZoomed(false)}
                className={`relative inline-flex cursor-pointer items-center gap-1.5 px-3 py-1 font-medium transition-colors duration-150 ${
                  !zoomed ? 'text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {!zoomed && (
                  <motion.span
                    layoutId="aluar-camera-mode"
                    transition={SPRING_TAB}
                    className="absolute inset-0 bg-ink"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <Maximize2 className="h-3.5 w-3.5" />
                  Planta completa
                </span>
              </button>
              <button
                type="button"
                aria-pressed={zoomed}
                onClick={() => setZoomed(true)}
                className={`relative inline-flex cursor-pointer items-center gap-1.5 px-3 py-1 font-medium transition-colors duration-150 ${
                  zoomed ? 'text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {zoomed && (
                  <motion.span
                    layoutId="aluar-camera-mode"
                    transition={SPRING_TAB}
                    className="absolute inset-0 bg-cobalt"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <Focus className="h-3.5 w-3.5" />
                  Zoom etapa {activeStage.code}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setExploded((prev) => !prev);
                if (!exploded) setSelectedId('cuba');
              }}
              aria-pressed={exploded}
              className={`inline-flex cursor-pointer items-center gap-1.5 border px-3 py-1 text-[13px] font-medium transition-colors duration-150 ${
                exploded
                  ? 'border-cobalt bg-cobalt text-white'
                  : 'border-rule bg-stone-bg text-ink hover:border-ink'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{exploded ? 'Cerrar cuba' : 'Despiece cuba'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAutoTour((prev) => {
                  const next = !prev;
                  if (next) setZoomed(true);
                  return next;
                });
              }}
              aria-pressed={autoTour}
              className={`inline-flex cursor-pointer items-center gap-1.5 border px-3 py-1 text-[13px] font-medium transition-colors duration-150 ${
                autoTour
                  ? 'border-ink bg-ink text-white'
                  : 'border-rule bg-stone-bg text-ink hover:border-ink'
              }`}
            >
              {autoTour ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{autoTour ? 'Pausar' : 'Recorrido'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAutoTour(false);
                setExploded(false);
                setZoomed(false);
                setSelectedId('cuba');
                setHoveredId(null);
              }}
              aria-label="Restablecer vista completa"
              title="Restablecer vista completa"
              className="inline-flex cursor-pointer items-center justify-center border border-rule bg-stone-bg p-1.5 text-ink-muted transition-colors duration-150 hover:border-ink hover:text-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Cuerpo widescreen: Placa isométrica 3D (8 cols) + Inspector técnico (4 cols) */}
        <div className="grid lg:grid-cols-12">
          <div className="atlas-iso relative flex flex-col justify-between bg-stone-surface p-4 sm:p-6 lg:col-span-8 lg:border-r lg:border-rule">
            {/* Cabecera del plate */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-muted">
              <span className="font-medium text-ink">
                {activeStage.code} · {activeStage.shortLabel}
              </span>
              <span className="tabular-nums">
                {zoomed ? 'Detalle enfocado (click doble para alejar)' : 'Vista general 1× (click doble en una etapa para acercar)'}
              </span>
            </div>

            {/* Lienzo SVG isométrico con cámara suavizada y ductos 3D */}
            <div className="my-3 overflow-hidden border border-rule/70 bg-[#F4F3EE]">
              <svg
                viewBox={viewBoxStr}
                role="img"
                aria-label="Diorama isométrico interactivo del complejo Aluar en Puerto Madryn: Golfo Nuevo, Muelle Almirante Storni, buque alúminero, silos, horno de ánodos, cuba Hall-Héroult en corte, GTC y fundición"
                className="iso-svg mx-auto w-full"
              >
                {/* 1. Halo y terreno escalonado (Golfo Nuevo + Terraza Puerto Madryn) */}
                <g aria-hidden="true">
                  <path className="iso-halo" d={scene.baseHalo} />
                  {scene.terrainSolids.map((s) => (
                    <SolidElement key={s.id} solid={s} />
                  ))}
                  <LinesLayer lines={scene.terrainLines} />
                  <DotsLayer dots={scene.terrainDots} />
                  <g transform={scene.plateLabelTransform}>
                    <text
                      x="0"
                      y="0"
                      fontSize="5.2"
                      fontWeight="700"
                      letterSpacing="0.08em"
                      fill="#424650"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      ALUAR · CHUBUT
                    </text>
                  </g>
                </g>

                {/* 2. Ensamble 02 (atrás-izquierda): Planta de ánodos y horno de cocción */}
                <g
                  role="button"
                  tabIndex={0}
                  aria-label="02 Planta de ánodos precocidos y horno de cocción 1.150 °C"
                  className="iso-assembly"
                  data-active={isActive('anodos')}
                  data-dim={isDimmed('anodos')}
                  onMouseEnter={() => setHoveredId('anodos')}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleSelectAssembly('anodos')}
                  onDoubleClick={() => handleSelectAssembly('anodos', !zoomed)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectAssembly('anodos');
                    }
                  }}
                >
                  {scene.anodosPlantSolids.map((s) => (
                    <SolidElement key={s.id} solid={s} />
                  ))}
                  <LinesLayer lines={scene.anodosPlantLines} />
                  <DotsLayer dots={scene.anodosPlantDots} />
                </g>

                {/* 3. Ensamble 04 (atrás-derecha): Centro de Tratamiento de Gases (GTC) */}
                <g
                  role="button"
                  tabIndex={0}
                  aria-label="04 Centro de Tratamiento de Gases (GTC) y reciclo de fluoruros"
                  className="iso-assembly"
                  data-active={isActive('gtc')}
                  data-dim={isDimmed('gtc')}
                  onMouseEnter={() => setHoveredId('gtc')}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleSelectAssembly('gtc')}
                  onDoubleClick={() => handleSelectAssembly('gtc', !zoomed)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectAssembly('gtc');
                    }
                  }}
                >
                  {scene.gtcSolids.map((s) => (
                    <SolidElement key={s.id} solid={s} />
                  ))}
                  {scene.gtcTubes.map((tb) => (
                    <TubeElement key={tb.id} tube={tb} />
                  ))}
                  <LinesLayer lines={scene.gtcLines} />
                  <DotsLayer dots={scene.gtcDots} />
                </g>

                {/* 4. Ensamble 01 (izquierda costera): Muelle Storni, Buque, Grúa y Silos */}
                <g
                  role="button"
                  tabIndex={0}
                  aria-label="01 Muelle Almirante Storni, buque granelero, grúa descargadora y silos"
                  className="iso-assembly"
                  data-active={isActive('silo')}
                  data-dim={isDimmed('silo')}
                  onMouseEnter={() => setHoveredId('silo')}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleSelectAssembly('silo')}
                  onDoubleClick={() => handleSelectAssembly('silo', !zoomed)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectAssembly('silo');
                    }
                  }}
                >
                  {scene.pierSolids.map((s) => (
                    <SolidElement key={s.id} solid={s} />
                  ))}
                  {scene.pierTubes.map((tb) => (
                    <TubeElement key={tb.id} tube={tb} />
                  ))}
                  <LinesLayer lines={scene.pierLines} />
                  <DotsLayer dots={scene.pierDots} />
                </g>

                {/* 5. Ensamble 03 (centro hero): Cuba Hall-Héroult en corte abierto */}
                <g
                  role="button"
                  tabIndex={0}
                  aria-label="03 Cuba electrolítica Hall-Héroult en corte abierto"
                  className="iso-assembly"
                  data-active={isActive('cuba')}
                  data-dim={isDimmed('cuba')}
                  onMouseEnter={() => setHoveredId('cuba')}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleSelectAssembly('cuba')}
                  onDoubleClick={() => handleSelectAssembly('cuba', !zoomed)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectAssembly('cuba');
                    }
                  }}
                >
                  {scene.cubaBackSolids.map((s) => (
                    <SolidElement key={s.id} solid={s} />
                  ))}
                  <LinesLayer lines={scene.cubaBackLines} />
                  {scene.cubaCathodeSolids.map((s) => (
                    <SolidElement key={s.id} solid={s} />
                  ))}

                  {/* Colchón de aluminio líquido */}
                  <motion.g
                    animate={{
                      x: exploded ? scene.explodeVectors.metal[0] : 0,
                      y: exploded ? scene.explodeVectors.metal[1] : 0,
                    }}
                    transition={SPRING_EXPLODE}
                  >
                    {scene.cubaMetalSolids.map((s) => (
                      <SolidElement key={s.id} solid={s} />
                    ))}
                  </motion.g>

                  {/* Baño fundido de criolita */}
                  <motion.g
                    animate={{
                      x: exploded ? scene.explodeVectors.bath[0] : 0,
                      y: exploded ? scene.explodeVectors.bath[1] : 0,
                    }}
                    transition={{ ...SPRING_EXPLODE, delay: exploded ? 0.04 : 0 }}
                  >
                    {scene.cubaBathSolids.map((s) => (
                      <SolidElement key={s.id} solid={s} />
                    ))}
                    <DotsLayer dots={scene.cubaBathDots} />
                  </motion.g>
                </g>

                {/* Ánodos suspendidos + viga CC (vinculados a etapa 02 y 03, suben en Despiece) */}
                <motion.g
                  className="iso-assembly"
                  data-active={isActive('anodos') || isActive('cuba')}
                  data-dim={hoveredId !== null && hoveredId !== 'anodos' && hoveredId !== 'cuba'}
                  animate={{
                    x: exploded ? scene.explodeVectors.anodos[0] : 0,
                    y: exploded ? scene.explodeVectors.anodos[1] : 0,
                  }}
                  transition={{ ...SPRING_EXPLODE, delay: exploded ? 0.08 : 0 }}
                  onMouseEnter={() => setHoveredId('cuba')}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleSelectAssembly('cuba')}
                >
                  {scene.cubaAnodesSolids.map((s) => (
                    <SolidElement key={s.id} solid={s} />
                  ))}
                  <DotsLayer dots={scene.cubaAnodesDots} />
                  <path
                    className="iso-line"
                    data-tone="blue"
                    data-flow={isActive('anodos') || isActive('cuba') ? 'true' : undefined}
                    d={scene.flowPaths.dcBusbar}
                  />
                </motion.g>

                {/* Labio frontal cortado + barras colectoras de cátodo + pórtico frontal */}
                <g
                  className="iso-assembly"
                  data-active={isActive('cuba')}
                  data-dim={isDimmed('cuba')}
                  onMouseEnter={() => setHoveredId('cuba')}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleSelectAssembly('cuba')}
                >
                  {scene.cubaFrontSolids.map((s) => (
                    <SolidElement key={s.id} solid={s} />
                  ))}
                </g>

                {/* Superestructura tolva y campana superior */}
                <motion.g
                  className="iso-assembly"
                  data-active={isActive('cuba')}
                  data-dim={hoveredId !== null && hoveredId !== 'cuba' && hoveredId !== 'silo'}
                  animate={{
                    x: exploded ? scene.explodeVectors.hood[0] : 0,
                    y: exploded ? scene.explodeVectors.hood[1] : 0,
                  }}
                  transition={{ ...SPRING_EXPLODE, delay: exploded ? 0.12 : 0 }}
                  onMouseEnter={() => setHoveredId('cuba')}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleSelectAssembly('cuba')}
                >
                  {scene.cubaHoodSolids.map((s) => (
                    <SolidElement key={s.id} solid={s} />
                  ))}
                  <LinesLayer lines={scene.cubaHoodLines} />
                </motion.g>

                {/* 6. Ensamble 05 (frente-derecha): Crisol, Horno 720 °C, Lingotes, Barrotes y Alambrón */}
                <g
                  role="button"
                  tabIndex={0}
                  aria-label="05 Sala de fundición, crisol de vacío, horno 720 °C, lingotes y barrotes"
                  className="iso-assembly"
                  data-active={isActive('fundicion')}
                  data-dim={isDimmed('fundicion')}
                  onMouseEnter={() => setHoveredId('fundicion')}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleSelectAssembly('fundicion')}
                  onDoubleClick={() => handleSelectAssembly('fundicion', !zoomed)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectAssembly('fundicion');
                    }
                  }}
                >
                  {scene.fundicionTubes.map((tb) => (
                    <TubeElement key={tb.id} tube={tb} />
                  ))}
                  {scene.fundicionSolids.map((s) => (
                    <SolidElement key={s.id} solid={s} />
                  ))}
                  <LinesLayer lines={scene.fundicionLines} />
                  <DotsLayer dots={scene.fundicionDots} />
                </g>

                {/* Corrientes animadas sutiles cuando se selecciona la etapa correspondiente */}
                {isActive('silo') && (
                  <path className="iso-line" data-tone="ochre" data-flow="true" d={scene.flowPaths.aluminaFeed} />
                )}
                {isActive('gtc') && (
                  <>
                    <path className="iso-line" data-tone="red" data-flow="true" d={scene.flowPaths.gasToGtc} />
                    <path className="iso-line" data-tone="green" data-flow="true" d={scene.flowPaths.gtcRecycle} />
                  </>
                )}
                {isActive('fundicion') && (
                  <path className="iso-line" data-tone="blue" data-flow="true" d={scene.flowPaths.metalTap} />
                )}

                {/* 7. Dial térmico isométrico (0 a 1.250 °C) */}
                <g aria-hidden="true">
                  {scene.dialSolids.map((s) => (
                    <SolidElement key={s.id} solid={s} />
                  ))}
                  <LinesLayer lines={scene.dialLines} />
                  <path className="iso-line" data-tone="lit" d={needlePath} />
                  <DotsLayer dots={scene.dialDots} />
                </g>

                {/* 8. Pins numerados interactivos (01..05) para lectura instantánea de cada estación */}
                <g>
                  {scene.pins.map((pin) => {
                    const active = isActive(pin.id);
                    const scaleFactor = cam.w / scene.width;
                    return (
                      <g
                        key={pin.id}
                        transform={`translate(${pin.x.toFixed(1)} ${pin.y.toFixed(1)}) scale(${scaleFactor.toFixed(3)})`}
                        role="button"
                        tabIndex={0}
                        aria-label={`${pin.code} ${pin.label}`}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredId(pin.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => handleSelectAssembly(pin.id, true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectAssembly(pin.id, true);
                          }
                        }}
                      >
                        <circle
                          r={active ? 12 : 10.5}
                          fill={active ? '#0A42E0' : '#111214'}
                          stroke="#F7F7F5"
                          strokeWidth="1.8"
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="9.5"
                          fontWeight="700"
                          fill="#FFFFFF"
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          {pin.code}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>

            {/* Pie del plate: pista interactiva + lectura en vivo del dial */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-3 text-[13px]">
              <span className="text-ink-muted">
                Hacé click en los pins 01 a 05 para enfocar cada etapa en detalle
              </span>
              <span className="font-medium text-ink tabular-nums">
                Dial térmico: {Math.round(needleTemp).toLocaleString('es-AR')} °C ·{' '}
                {activeStage.calloutMetric}
              </span>
            </div>

            {/* Leyenda material compacta */}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-muted">
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 border border-ink/30 bg-[#A3BCD2]" />
                Golfo Nuevo y Muelle Storni
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 border border-ink/40 bg-[#393F4A]" />
                Carbono (ánodos y cátodo)
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 border border-ink/30 bg-[#E39538]" />
                Baño criolita / hornos
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 border border-ink/30 bg-[#C4D5E8]" />
                Aluminio líquido y colada
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 bg-cobalt" />
                Grúa portuaria y viga CC
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 bg-emerald-react" />
                GTC y reciclo HF
              </span>
            </div>
          </div>

          {/* Panel lateral técnico sincronizado con los datos verificados de Aluar */}
          <div className="flex flex-col justify-between border-t border-rule bg-stone-surface lg:col-span-4 lg:border-t-0">
            <div>
              <div className="border-b border-rule p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-ink-muted">
                    Etapas del complejo Aluar
                  </p>
                  {zoomed && (
                    <button
                      type="button"
                      onClick={() => setZoomed(false)}
                      className="cursor-pointer text-[13px] font-medium text-cobalt hover:underline"
                    >
                      Ver planta 1×
                    </button>
                  )}
                </div>
                <div
                  className="mt-3 flex flex-col gap-1.5"
                  role="tablist"
                  aria-label="Etapas de planta Aluar"
                >
                  {stages.map((st) => {
                    const selected = activeId === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onMouseEnter={() => setHoveredId(st.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => handleSelectAssembly(st.id, true)}
                        className={`flex cursor-pointer items-center justify-between gap-3 border px-3 py-2 text-left text-[14px] transition-colors duration-150 ${
                          selected
                            ? 'border-ink bg-ink text-white'
                            : 'border-rule bg-stone-bg text-ink hover:border-ink'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={`text-[13px] font-medium tabular-nums ${
                              selected ? 'text-white/75' : 'text-ink-muted'
                            }`}
                          >
                            {st.code}
                          </span>
                          <span className="font-medium">{st.shortLabel}</span>
                        </span>
                        <span
                          className={`text-[13px] tabular-nums ${
                            selected ? 'text-white/85' : 'text-ink-muted'
                          }`}
                        >
                          {st.dialTempC} °C
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStage.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="p-5 sm:p-6"
                >
                  <h3 className="font-display text-[20px] font-medium leading-snug text-ink">
                    {activePaso?.nombre ?? activeStage.shortLabel}
                  </h3>

                  <p className="mt-2 font-display text-[26px] font-medium leading-tight text-cobalt tabular-nums">
                    {activeStage.calloutMetric}
                  </p>
                  <p className="mt-1 text-[13px] text-ink-muted">{activeStage.calloutCaption}</p>

                  {activePaso?.reaccion_balanceada && (
                    <div className="mt-4 border-l-2 border-cobalt bg-stone-bg px-3.5 py-2.5">
                      <p className="text-[13px] text-ink-muted">Reacción balanceada</p>
                      <p className="mt-0.5 font-display text-[15px] font-medium text-ink tabular-nums">
                        {activePaso.reaccion_balanceada}
                      </p>
                    </div>
                  )}

                  <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-rule py-3.5 text-[13px] tabular-nums">
                    <div>
                      <dt className="text-ink-muted">Temperatura</dt>
                      <dd className="mt-0.5 font-medium text-ink">
                        {activePaso?.temperatura_c ? `${activePaso.temperatura_c} °C` : 'Sin datos'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Presión</dt>
                      <dd className="mt-0.5 font-medium text-ink">
                        {activePaso?.presion_bar ? `${activePaso.presion_bar} bar` : 'Sin datos'}
                      </dd>
                    </div>
                  </dl>

                  {activePaso && (
                    <p className="mt-4 text-[14px] leading-relaxed text-ink-muted">
                      {activePaso.descripcion}
                    </p>
                  )}

                  <p className="mt-3 text-[13px] text-ink-muted">
                    <strong className="font-medium text-ink">En el diorama:</strong>{' '}
                    {activeStage.physicalParts}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {activePaso && (
              <div className="border-t border-rule bg-stone-bg px-5 py-3 text-[13px] text-ink-muted">
                Fuente ({activePaso.procedencia.anio}): {activePaso.procedencia.fuente}
              </div>
            )}
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
