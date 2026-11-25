import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { Layers, Pause, Play, RotateCcw } from 'lucide-react';
import type { PasoProceso } from '@/schemas';
import {
  buildAluarAnatomyScene,
  buildDialNeedlePath,
  type AluarAssemblyId,
  type DrawnDots,
  type DrawnLine,
  type DrawnSolid,
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
  accentColor: string;
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
  const { paths, tone = 'hi', crease = 'faint', lit = false, flat = false, className, innerLines, innerDots } = solid;
  return (
    <g
      className={className ? `iso-solid ${className}` : 'iso-solid'}
      data-lit={lit ? '' : undefined}
    >
      <path className="iso-fill" d={paths.fill} />
      {!flat &&
        paths.shades.map((d, idx) =>
          d ? <path key={idx} className="iso-shade" data-shade={String(idx)} d={d} /> : null
        )}
      {!flat && <path className="iso-top" d={paths.top} />}
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
      <path className="iso-line iso-edge" data-tone={tone} d={paths.outline} />
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
        shortLabel: 'Silo y alúmina (Storni)',
        pasoId: 'al-p2-recepcion-storni',
        dialTempC: 25,
        accentColor: '#C86A11',
        calloutMetric: aluminaStr,
        calloutCaption: 'Alúmina importada HS 2818.20 (UN Comtrade 2024)',
        physicalParts: 'Silo cilíndrico con anillo rigidizador, válvula rotativa y cinta aérea hacia tolva.',
      },
      {
        id: 'anodos',
        code: '02',
        shortLabel: 'Ánodos precocidos y CC',
        pasoId: 'al-p3-planta-anodos',
        dialTempC: 1150,
        accentColor: '#111214',
        calloutMetric: '0,43 t C/t Al',
        calloutCaption: 'Consumo neto anódico · cocción 1.100 a 1.200 °C',
        physicalParts: '4 bloques de carbono precocido, yugos, vástagos, grampas y viga colectora CC.',
      },
      {
        id: 'cuba',
        code: '03',
        shortLabel: 'Cuba Hall-Héroult (corte)',
        pasoId: 'al-p4-electrolisis-hall-heroult',
        dialTempC: 960,
        accentColor: '#0A42E0',
        calloutMetric: energiaStr,
        calloutCaption: `${prodStr} líquido FY 2024-25 · baño criolita 950 a 970 °C`,
        physicalParts: 'Carcasa de acero en corte, refractario, cátodo de carbono, colchón de Al y baño Na3AlF6.',
      },
      {
        id: 'gtc',
        code: '04',
        shortLabel: 'Tratamiento de gases (GTC)',
        pasoId: 'al-p5-tratamiento-gases',
        dialTempC: 100,
        accentColor: '#0B7A53',
        calloutMetric: '1,6 t CO2/t Al',
        calloutCaption: 'Captura seca de HF en reciclo cerrado · IPCC Table 4.10',
        physicalParts: 'Reactor seco GTC, filtro de mangas, chimenea y válvula de retorno de alúmina fluorada.',
      },
      {
        id: 'fundicion',
        code: '05',
        shortLabel: 'Crisol, colada y lingotes',
        pasoId: 'al-p6-fundicion-colada',
        dialTempC: 720,
        accentColor: '#0A42E0',
        calloutMetric: '0,86 MWh/t Al',
        calloutCaption: '425.409 t solidificadas + 17.028 t líquido · 700 a 740 °C',
        physicalParts: 'Crisol de vacío para sifonado desde cuba y mesa de lingotes T / barrotes de colada.',
      },
    ];
  }, [aluminaImportadaT, energiaElectrolisisMwhT, produccionLiquidaT]);

  const [selectedId, setSelectedId] = useState<AluarAssemblyId>('cuba');
  const [hoveredId, setHoveredId] = useState<AluarAssemblyId | null>(null);
  const [exploded, setExploded] = useState(false);
  const [autoTour, setAutoTour] = useState(false);

  const activeId = hoveredId ?? selectedId;
  const activeStage = stages.find((s) => s.id === activeId) ?? stages[2]!;
  const activePaso = pasos.find((p) => p.paso_id === activeStage.pasoId) ?? null;

  // Interpolación suave de la aguja del dial de temperatura (0-1250 °C)
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

  // Recorrido automático calmo cuando el usuario lo activa
  useEffect(() => {
    if (!autoTour) return;
    const timer = window.setInterval(() => {
      setSelectedId((curr) => {
        const idx = stages.findIndex((s) => s.id === curr);
        return stages[(idx + 1) % stages.length]!.id;
      });
    }, 3600);
    return () => window.clearInterval(timer);
  }, [autoTour, stages]);

  const needlePath = useMemo(() => buildDialNeedlePath(needleTemp, scene), [needleTemp, scene]);

  const isDimmed = (id: AluarAssemblyId) => hoveredId !== null && hoveredId !== id;
  const isActive = (id: AluarAssemblyId) => activeId === id;

  const handleSelectAssembly = (id: AluarAssemblyId) => {
    setAutoTour(false);
    setSelectedId(id);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="border border-rule bg-stone-surface">
        {/* Cabecera de control integrada: vista armada / despiece + recorrido */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-3.5 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[13px] font-semibold text-ink tabular-nums">Fig. 01</span>
            <span className="text-rule-strong/30">/</span>
            <span className="text-[13px] text-ink-muted">
              Corte isométrico de una cuba Hall-Héroult y circuito integrado en Aluar Puerto Madryn
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Switch segmentado Vista armada / Despiece vertical */}
            <div
              role="group"
              aria-label="Modo de visualización del corte"
              className="inline-flex bg-stone-subtle p-0.5 text-[13px]"
            >
              <button
                type="button"
                aria-pressed={!exploded}
                onClick={() => setExploded(false)}
                className={`relative cursor-pointer px-3 py-1 font-medium transition-colors duration-150 ${
                  !exploded ? 'text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {!exploded && (
                  <motion.span
                    layoutId="aluar-anatomy-mode"
                    transition={SPRING_TAB}
                    className="absolute inset-0 bg-ink"
                  />
                )}
                <span className="relative z-10">Armada</span>
              </button>
              <button
                type="button"
                aria-pressed={exploded}
                onClick={() => setExploded(true)}
                className={`relative inline-flex cursor-pointer items-center gap-1.5 px-3 py-1 font-medium transition-colors duration-150 ${
                  exploded ? 'text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {exploded && (
                  <motion.span
                    layoutId="aluar-anatomy-mode"
                    transition={SPRING_TAB}
                    className="absolute inset-0 bg-cobalt"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Despiece vertical
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAutoTour((prev) => !prev)}
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
                setSelectedId('cuba');
                setHoveredId(null);
              }}
              aria-label="Restablecer figura"
              title="Restablecer vista"
              className="inline-flex cursor-pointer items-center justify-center border border-rule bg-stone-bg p-1.5 text-ink-muted transition-colors duration-150 hover:border-ink hover:text-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Cuerpo widescreen: Placa isométrica Anatomy (8 cols) + Inspector técnico (4 cols) */}
        <div className="grid lg:grid-cols-12">
          <div className="atlas-iso relative flex flex-col justify-between bg-stone-surface p-4 sm:p-6 lg:col-span-8 lg:border-r lg:border-rule">
            {/* Esquinas discretas del plate estilo Anatomy (sin texto flotando sobre la máquina) */}
            <div className="flex items-center justify-between gap-4 text-[13px] text-ink-muted">
              <span className="font-medium text-ink">
                {activeStage.code} · {activeStage.shortLabel}
              </span>
              <span className="tabular-nums">
                {exploded ? 'Despiece activo (+Z)' : 'Corte ensamblado'}
              </span>
            </div>

            {/* Figura SVG isométrica construida en 4 tonos con painter's order */}
            <div className="my-2 overflow-hidden">
              <svg
                viewBox={`0 0 ${scene.width} ${scene.height}`}
                role="img"
                aria-label="Corte isométrico interactivo del proceso Hall-Héroult en Aluar Puerto Madryn: silo de alúmina, ánodos precocidos, cuba electrolítica, tratamiento de gases GTC y colada"
                className="iso-svg mx-auto max-w-[780px]"
              >
                {/* 1. Halo y placa base maquinada */}
                <g aria-hidden="true">
                  <path className="iso-halo" d={scene.baseHalo} />
                  {scene.baseSolids.map((s) => (
                    <SolidElement key={s.id} solid={s} />
                  ))}
                  <LinesLayer lines={scene.baseLines} />
                  <DotsLayer dots={scene.baseDots} />
                  <g transform={scene.plateLabelTransform}>
                    <text
                      x="0"
                      y="0"
                      fontSize="5.4"
                      fontWeight="600"
                      letterSpacing="0.08em"
                      fill="#52555E"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      ALUAR · CHUBUT
                    </text>
                  </g>
                </g>

                {/* 2. Ensamble 01: Silo de alúmina y cinta Muelle Storni */}
                <g
                  role="button"
                  tabIndex={0}
                  aria-label="01 Silo y dosificación de alúmina (Muelle Storni)"
                  className="iso-assembly"
                  data-active={isActive('silo')}
                  data-dim={isDimmed('silo')}
                  onMouseEnter={() => setHoveredId('silo')}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleSelectAssembly('silo')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectAssembly('silo');
                    }
                  }}
                >
                  {scene.siloSolids.map((s) => (
                    <SolidElement key={s.id} solid={s} />
                  ))}
                  <LinesLayer lines={scene.siloLines} />
                  <DotsLayer dots={scene.siloDots} />
                </g>

                {/* Corriente de alúmina desde el silo hacia la cuba */}
                <path
                  className="iso-line"
                  data-tone={isActive('silo') ? 'lit' : 'mid'}
                  data-flow={isActive('silo') || isActive('cuba') ? 'true' : undefined}
                  d={scene.flowPaths.aluminaFeed}
                />

                {/* 3. Ensamble 04: Centro de Tratamiento de Gases (GTC) y reciclo HF */}
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
                  <LinesLayer lines={scene.gtcLines} />
                  <DotsLayer dots={scene.gtcDots} />
                </g>

                {/* Corrientes de extracción de gases y reciclo cerrado GTC */}
                <path
                  className="iso-line"
                  data-tone={isActive('gtc') ? 'red' : 'lo'}
                  data-flow={isActive('gtc') ? 'true' : undefined}
                  d={scene.flowPaths.gasToGtc}
                />
                <path
                  className="iso-line"
                  data-tone={isActive('gtc') ? 'green' : 'lo'}
                  data-flow={isActive('gtc') || isActive('cuba') ? 'true' : undefined}
                  d={scene.flowPaths.gtcRecycle}
                />

                {/* 4. Ensamble 03 (parte trasera): Pilotes, piso y paredes traseras de la cuba */}
                <g
                  role="button"
                  tabIndex={0}
                  aria-label="03 Cuba electrolítica Hall-Héroult en corte"
                  className="iso-assembly"
                  data-active={isActive('cuba')}
                  data-dim={isDimmed('cuba')}
                  onMouseEnter={() => setHoveredId('cuba')}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleSelectAssembly('cuba')}
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
                  {/* Refractario y cátodo de carbono (fijo en la base de la cuba) */}
                  {scene.cubaCathodeSolids.map((s) => (
                    <SolidElement key={s.id} solid={s} />
                  ))}

                  {/* Colchón de aluminio líquido (sube suavemente en Despiece vertical) */}
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

                  {/* Baño electrolítico fundido de criolita Na3AlF6 + Al2O3 */}
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

                {/* 5. Ensamble 02: 4 ánodos precocidos de carbono + viga colectora CC */}
                <motion.g
                  role="button"
                  tabIndex={0}
                  aria-label="02 Ánodos precocidos de carbono y viga de corriente continua"
                  className="iso-assembly"
                  data-active={isActive('anodos')}
                  data-dim={isDimmed('anodos')}
                  animate={{
                    x: exploded ? scene.explodeVectors.anodos[0] : 0,
                    y: exploded ? scene.explodeVectors.anodos[1] : 0,
                  }}
                  transition={{ ...SPRING_EXPLODE, delay: exploded ? 0.08 : 0 }}
                  onMouseEnter={() => setHoveredId('anodos')}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleSelectAssembly('anodos')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectAssembly('anodos');
                    }
                  }}
                >
                  {scene.anodosSolids.map((s) => (
                    <SolidElement key={s.id} solid={s} />
                  ))}
                  <LinesLayer lines={scene.anodosLines} />
                  <DotsLayer dots={scene.anodosDots} />
                  <path
                    className="iso-line"
                    data-tone="blue"
                    data-flow={isActive('anodos') || isActive('cuba') ? 'true' : undefined}
                    d={scene.flowPaths.dcBusbar}
                  />
                </motion.g>

                {/* 6. Borde frontal cortado de la cuba, barras colectoras de cátodo y pórtico frontal */}
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
                  <LinesLayer lines={scene.cubaFrontLines} />
                </g>

                {/* Superestructura superior: tolva dosificadora y campana (sube al máximo en Despiece) */}
                <motion.g
                  className="iso-assembly"
                  data-active={isActive('cuba') || isActive('silo')}
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

                {/* Corriente de sifonado de aluminio líquido hacia el crisol */}
                <path
                  className="iso-line"
                  data-tone={isActive('fundicion') ? 'blue' : 'lo'}
                  data-flow={isActive('fundicion') || isActive('cuba') ? 'true' : undefined}
                  d={scene.flowPaths.metalTap}
                />

                {/* 7. Ensamble 05 (frente-derecha): Crisol de vacío y lingotes solidificados */}
                <g
                  role="button"
                  tabIndex={0}
                  aria-label="05 Crisol de sifonado y lingotes de aluminio solidificado"
                  className="iso-assembly"
                  data-active={isActive('fundicion')}
                  data-dim={isDimmed('fundicion')}
                  onMouseEnter={() => setHoveredId('fundicion')}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleSelectAssembly('fundicion')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectAssembly('fundicion');
                    }
                  }}
                >
                  {scene.fundicionSolids.map((s) => (
                    <SolidElement key={s.id} solid={s} />
                  ))}
                  <LinesLayer lines={scene.fundicionLines} />
                  <DotsLayer dots={scene.fundicionDots} />
                </g>

                {/* 8. Dial de telemetría de temperatura (0-1250 °C) con aguja viva */}
                <g aria-hidden="true">
                  {scene.dialSolids.map((s) => (
                    <SolidElement key={s.id} solid={s} />
                  ))}
                  <LinesLayer lines={scene.dialLines} />
                  <path className="iso-line" data-tone="lit" d={needlePath} />
                  <DotsLayer dots={scene.dialDots} />
                </g>
              </svg>
            </div>

            {/* Pie del plate: pista interactiva + lectura en vivo del dial */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-3 text-[13px]">
              <span className="text-ink-muted">
                Pasá o hacé click en cualquier módulo para aislarlo
              </span>
              <span className="font-medium text-ink tabular-nums">
                Dial térmico: {Math.round(needleTemp).toLocaleString('es-AR')} °C ·{' '}
                {activeStage.calloutMetric}
              </span>
            </div>

            {/* Leyenda material compacta bajo la figura (regla Anatomy: nada de carteles flotantes en el dibujo) */}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-muted">
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 border border-ink/40 bg-[#41454F]" />
                Ánodos y cátodo de carbono (C)
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 border border-ink/30 bg-[#E1AB67]" />
                Baño criolita (Na3AlF6 + Al2O3)
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 border border-ink/30 bg-[#D1D8E3]" />
                Aluminio líquido y lingotes
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 bg-cobalt" />
                Corriente continua (CC)
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 bg-emerald-react" />
                Reciclo cerrado GTC (HF)
              </span>
            </div>
          </div>

          {/* Panel lateral técnico sincronizado con los datos verificados de Aluar */}
          <div className="flex flex-col justify-between border-t border-rule bg-stone-surface lg:col-span-4 lg:border-t-0">
            <div>
              {/* Lista numerada de ensambles (estilo Anatomy legend selector) */}
              <div className="border-b border-rule p-4 sm:p-5">
                <p className="text-[13px] font-medium text-ink-muted">
                  Ensambles del circuito Aluar
                </p>
                <div className="mt-3 flex flex-col gap-1.5" role="tablist" aria-label="Ensambles de planta Aluar">
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
                        onClick={() => handleSelectAssembly(st.id)}
                        className={`flex cursor-pointer items-center justify-between gap-3 border px-3 py-2 text-left text-[14px] transition-colors duration-150 ${
                          selected
                            ? 'border-ink bg-ink text-white'
                            : 'border-rule bg-stone-bg text-ink hover:border-ink'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={`text-[13px] font-semibold tabular-nums ${
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

              {/* Detalle verificado de la etapa activa */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStage.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="p-5 sm:p-6"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-[20px] font-bold leading-snug text-ink">
                      {activePaso?.nombre ?? activeStage.shortLabel}
                    </h3>
                  </div>

                  <p className="mt-2 font-display text-[26px] font-bold leading-tight text-cobalt tabular-nums">
                    {activeStage.calloutMetric}
                  </p>
                  <p className="mt-1 text-[13px] text-ink-muted">{activeStage.calloutCaption}</p>

                  {activePaso?.reaccion_balanceada && (
                    <div className="mt-4 border-l-2 border-cobalt bg-stone-bg px-3.5 py-2.5">
                      <p className="text-[13px] text-ink-muted">Reacción balanceada</p>
                      <p className="mt-0.5 font-display text-[15px] font-semibold text-ink tabular-nums">
                        {activePaso.reaccion_balanceada}
                      </p>
                    </div>
                  )}

                  <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-rule py-3.5 text-[13px] tabular-nums">
                    <div>
                      <dt className="text-ink-muted">Temperatura</dt>
                      <dd className="mt-0.5 font-semibold text-ink">
                        {activePaso?.temperatura_c ? `${activePaso.temperatura_c} °C` : 'Sin datos'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Presión</dt>
                      <dd className="mt-0.5 font-semibold text-ink">
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
                    <strong className="font-medium text-ink">En el corte:</strong>{' '}
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
