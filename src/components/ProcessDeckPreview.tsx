import { useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import type { Producto } from '@/schemas';
import type { ChainCardSummary, ProcesoCompleto } from '@/data';
import { ProductIcon } from './ProductIcon';
import { getCategoryAccent } from './ArgentinaMapExplorer';

interface ProcessDeckPreviewProps {
  productos: Producto[];
  procesosVerificados: ProcesoCompleto[];
  chainSummaries: ChainCardSummary[];
  esEjemplo: boolean;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const SPRING_TAB = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 34,
  mass: 0.85,
};

const SPRING_CARD = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 30,
};

const CATEGORIA_LABEL: Record<Producto['categoria'], string> = {
  metalurgia: 'Metalurgia',
  mineria_quimica: 'Minería química',
  fertilizantes: 'Fertilizantes',
  agroindustria: 'Agroindustria',
  petroquimica: 'Petroquímica',
  bioenergia: 'Bioenergía',
};

export function ProcessDeckPreview({
  productos,
  procesosVerificados,
  chainSummaries,
}: ProcessDeckPreviewProps) {
  const [activeView, setActiveView] = useState<'cadenas' | 'proceso'>('cadenas');
  const [selectedProcesoId, setSelectedProcesoId] = useState<string>(
    procesosVerificados[0]?.proceso.proceso_id ?? ''
  );

  const activeBundle =
    procesosVerificados.find((b) => b.proceso.proceso_id === selectedProcesoId) ??
    procesosVerificados[0] ??
    null;

  const pasosActivos = activeBundle?.pasos ?? [];
  const defaultStep =
    pasosActivos.find((p) => p.tipo_paso === 'reaccion') ?? pasosActivos[0] ?? null;

  const [selectedStepByProcess, setSelectedStepByProcess] = useState<Record<string, string>>({});

  const activeProcessId = activeBundle?.proceso.proceso_id ?? '';
  const selectedStepId = selectedStepByProcess[activeProcessId] ?? defaultStep?.paso_id ?? '';
  const selectedStep =
    pasosActivos.find((p) => p.paso_id === selectedStepId) ?? defaultStep ?? null;

  const energiaText =
    activeBundle?.proceso.energia_especifica.estado === 'dato'
      ? `${activeBundle.proceso.energia_especifica.valor.toLocaleString('es-AR', { minimumFractionDigits: 2 })} ${activeBundle.proceso.energia_especifica.unidad}`
      : 'Sin datos';

  const recicloCount =
    activeBundle?.conexiones.filter((c) => c.tipo_corriente === 'reciclo').length ?? 0;

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-6">
        {/* Cabecera limpia + switcher segmentado estilo Bencho */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-4">
          <div className="max-w-2xl">
            <h2 className="font-display text-[24px] font-bold tracking-[-0.02em] text-ink">
              Cadenas industriales y procesos químicos
            </h2>
            <p className="mt-1.5 text-[15px] text-ink-muted">
              Las {productos.length} cadenas verificadas con reacciones balanceadas, balances de
              masa, comercio exterior oficial y trazabilidad SHA-256 desde Supabase.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Vista de cadenas y procesos"
            className="inline-flex bg-stone-subtle p-1 text-[13px]"
          >
            {(
              [
                { id: 'cadenas', label: `Las ${productos.length} cadenas` },
                { id: 'proceso', label: 'Explorador paso a paso' },
              ] as const
            ).map((tab) => {
              const isActive = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => setActiveView(tab.id)}
                  className={`relative cursor-pointer px-3.5 py-1.5 font-medium transition-colors duration-150 ${
                    isActive ? 'text-white' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="process-section-tab"
                      transition={SPRING_TAB}
                      className="absolute inset-0 bg-ink"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Vista 1: Grid de cards táctiles inspiradas en bencho.dev (web + mobile) */}
          {activeView === 'cadenas' && (
            <motion.div
              key="cadenas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12"
            >
              {chainSummaries.map((item, idx) => {
                const { producto } = item;
                const accent = getCategoryAccent(producto.categoria);
                // Ritmo asimétrico editorial: primeras 3 cards en tercios (4 cols), siguientes 4 en cuartos (3 cols)
                const colSpan = idx < 3 ? 'lg:col-span-4' : 'lg:col-span-3';
                return (
                  <motion.a
                    key={producto.producto_id}
                    href={`/productos/${producto.producto_id}`}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.99 }}
                    transition={SPRING_CARD}
                    className={`group relative flex flex-col justify-between border border-rule bg-stone-surface p-5 transition-colors duration-150 hover:border-ink ${colSpan}`}
                  >
                    {/* Filete cromático superior de identidad de cadena */}
                    <span
                      className="absolute inset-x-0 top-0 h-[3px] transition-opacity duration-150"
                      style={{ backgroundColor: accent }}
                      aria-hidden="true"
                    />

                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center bg-stone-bg text-ink transition-colors duration-150 group-hover:bg-[var(--card-accent)] group-hover:text-white"
                          style={{ ['--card-accent' as string]: accent }}
                        >
                          <ProductIcon iconId={producto.icono_id} size={19} />
                        </span>
                        {producto.formula_quimica && (
                          <span className="text-[13px] font-semibold text-ink-muted tabular-nums">
                            {producto.formula_quimica}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 font-display text-[19px] font-bold leading-snug tracking-[-0.015em] text-ink group-hover:text-cobalt">
                        {producto.nombre}
                      </h3>
                      <p className="mt-1 text-[13px] text-ink-muted">
                        {CATEGORIA_LABEL[producto.categoria]} · {item.jurisdicciones}
                      </p>

                      <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
                        {producto.descripcion_corta}
                      </p>
                    </div>

                    <div className="mt-6 border-t border-rule pt-4">
                      <div className="flex items-end justify-between gap-3 tabular-nums">
                        <div>
                          <p className="text-[13px] text-ink-muted">{item.metricaLabel}</p>
                          <p className="mt-0.5 font-display text-[20px] font-bold leading-tight text-ink">
                            {item.metricaValor}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink transition-colors duration-150 group-hover:text-cobalt">
                          <span>Ficha</span>
                          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </motion.a>
                );
              })}
            </motion.div>
          )}

          {/* Vista 2: Explorador interactivo paso a paso de los 7 procesos */}
          {activeView === 'proceso' && activeBundle && (
            <motion.div
              key="proceso"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="space-y-4"
            >
              {/* Dock táctil horizontal de procesos verificados */}
              <div
                role="tablist"
                aria-label="Seleccionar proceso químico verificado"
                className="flex max-w-full items-center overflow-x-auto border border-rule bg-stone-surface p-1 text-[13px]"
              >
                {procesosVerificados.map((bundle) => {
                  const prod = productos.find(
                    (p) => p.producto_id === bundle.proceso.producto_id
                  );
                  const isSelected = bundle.proceso.proceso_id === activeProcessId;
                  const accent = prod ? getCategoryAccent(prod.categoria) : '#0A42E0';
                  return (
                    <button
                      key={bundle.proceso.proceso_id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setSelectedProcesoId(bundle.proceso.proceso_id)}
                      className={`relative inline-flex shrink-0 cursor-pointer items-center gap-2 px-3.5 py-1.5 font-medium transition-colors duration-150 ${
                        isSelected ? 'text-white' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="verified-process-switcher"
                          transition={SPRING_TAB}
                          style={{ backgroundColor: accent }}
                          className="absolute inset-0"
                        />
                      )}
                      <span className="relative z-10 inline-flex items-center gap-1.5">
                        {prod && <ProductIcon iconId={prod.icono_id} size={14} />}
                        <span>{prod?.nombre.split(' ')[0] ?? bundle.proceso.producto_id}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid border border-rule bg-stone-surface lg:grid-cols-12">
                {/* Secuencia interactiva de pasos */}
                <div className="flex flex-col justify-between p-6 lg:col-span-7 lg:border-r lg:border-rule">
                  <div>
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h3 className="font-display text-[22px] font-semibold tracking-tight text-ink">
                        {activeBundle.proceso.nombre}
                      </h3>
                      {activeBundle.proceso.reaccion_global && (
                        <span className="text-[14px] font-semibold text-cobalt tabular-nums">
                          {activeBundle.proceso.reaccion_global}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 max-w-[65ch] text-[15px] text-ink-muted">
                      {activeBundle.proceso.ruta_tecnologica}
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {pasosActivos.map((paso, index) => {
                        const isSelected = selectedStep?.paso_id === paso.paso_id;
                        return (
                          <motion.button
                            key={paso.paso_id}
                            type="button"
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.99 }}
                            transition={SPRING_CARD}
                            onClick={() =>
                              setSelectedStepByProcess((prev) => ({
                                ...prev,
                                [activeProcessId]: paso.paso_id,
                              }))
                            }
                            className={`group flex cursor-pointer flex-col justify-between border p-3.5 text-left transition-colors duration-150 ${
                              isSelected
                                ? 'border-ink bg-ink text-white'
                                : 'border-rule bg-stone-bg text-ink hover:border-ink'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[13px]">
                              <span
                                className={
                                  isSelected
                                    ? 'text-white/75 tabular-nums'
                                    : 'text-ink-muted tabular-nums'
                                }
                              >
                                Paso {paso.orden}
                              </span>
                              {index < pasosActivos.length - 1 && (
                                <ArrowRight
                                  className={`h-3.5 w-3.5 ${
                                    isSelected ? 'text-white/75' : 'text-ink-muted'
                                  }`}
                                />
                              )}
                            </div>
                            <p className="mt-2.5 text-[14px] font-semibold leading-snug">
                              {paso.nombre}
                            </p>
                            <p
                              className={`mt-3 text-[13px] tabular-nums ${
                                isSelected ? 'text-white/85' : 'text-ink-muted'
                              }`}
                            >
                              {paso.temperatura_c ? `${paso.temperatura_c} °C` : 'Sin datos de T'}
                            </p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-8 border-t border-rule pt-5">
                    <dl className="grid grid-cols-3 gap-4 tabular-nums">
                      <div>
                        <dt className="text-[13px] text-ink-muted">Etapas modeladas</dt>
                        <dd className="mt-1 font-display text-[22px] font-semibold text-ink">
                          {pasosActivos.length} pasos
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[13px] text-ink-muted">Energía específica</dt>
                        <dd className="mt-1 font-display text-[22px] font-semibold text-cobalt">
                          {energiaText}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[13px] text-ink-muted">Corrientes y reciclos</dt>
                        <dd className="mt-1 font-display text-[22px] font-semibold text-emerald-react">
                          {activeBundle.conexiones.length} ({recicloCount} rec.)
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5">
                      <a
                        href={`/productos/${activeBundle.proceso.producto_id}`}
                        className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-cobalt"
                      >
                        <span>Abrir diagrama interactivo React Flow y ficha completa</span>
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Detalle químico del paso seleccionado */}
                <div className="p-6 lg:col-span-5">
                  <AnimatePresence mode="wait">
                    {selectedStep && (
                      <motion.div
                        key={selectedStep.paso_id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        className="flex h-full flex-col justify-between space-y-5"
                      >
                        <div className="space-y-4">
                          <div>
                            <p className="text-[13px] font-medium text-cobalt">
                              Paso {selectedStep.orden} · {selectedStep.tipo_paso.replace('_', ' ')}
                            </p>
                            <h4 className="mt-1 font-display text-[22px] font-semibold leading-snug text-ink">
                              {selectedStep.nombre}
                            </h4>
                            <p className="mt-2 text-[15px] text-ink-muted">
                              {selectedStep.descripcion}
                            </p>
                          </div>

                          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-y border-rule py-4 text-[15px] tabular-nums">
                            <div>
                              <dt className="text-[13px] text-ink-muted">Temperatura</dt>
                              <dd className="font-medium text-ink">
                                {selectedStep.temperatura_c
                                  ? `${selectedStep.temperatura_c} °C`
                                  : 'Sin datos'}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[13px] text-ink-muted">Presión</dt>
                              <dd className="font-medium text-ink">
                                {selectedStep.presion_bar
                                  ? `${selectedStep.presion_bar} bar`
                                  : 'Sin datos'}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[13px] text-ink-muted">Consumo energético</dt>
                              <dd className="font-medium text-ink">
                                {selectedStep.energia.estado === 'dato'
                                  ? `${selectedStep.energia.valor.toLocaleString('es-AR', { minimumFractionDigits: 2 })} ${selectedStep.energia.unidad}`
                                  : 'Sin datos'}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[13px] text-ink-muted">Nivel de confianza</dt>
                              <dd className="font-medium text-emerald-react capitalize">
                                {selectedStep.procedencia.confianza}
                              </dd>
                            </div>
                          </dl>

                          {selectedStep.reaccion_balanceada && (
                            <div>
                              <p className="text-[13px] text-ink-muted">Reacción principal</p>
                              <p className="mt-1 text-[15px] font-semibold text-ink tabular-nums">
                                {selectedStep.reaccion_balanceada}
                              </p>
                            </div>
                          )}
                        </div>

                        <p className="border-t border-rule pt-4 text-[13px] text-ink-muted tabular-nums">
                          Fuente ({selectedStep.procedencia.anio}):{' '}
                          {selectedStep.procedencia.cita_ubicacion}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
