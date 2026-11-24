import { useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { ArrowUpRight, CheckCircle2, Database, FlaskConical, Layers, ShieldAlert } from 'lucide-react';
import type { PasoProceso, Producto, Proceso } from '@/schemas';

interface ProcessDeckPreviewProps {
  productos: Producto[];
  procesoEjemplo: Proceso | null;
  pasosEjemplo: PasoProceso[];
  esEjemplo: boolean;
}

const SPRING_TACTILE = {
  type: 'spring' as const,
  stiffness: 440,
  damping: 34,
  mass: 0.85,
};

const CATEGORIA_META: Record<
  Producto['categoria'],
  { label: string; accent: string; badgeClass: string }
> = {
  metalurgia: {
    label: 'Metalurgia',
    accent: '#0038FF',
    badgeClass: 'group-hover:border-cobalt group-hover:bg-cobalt group-hover:text-white',
  },
  mineria_quimica: {
    label: 'Minería química',
    accent: '#00A859',
    badgeClass: 'group-hover:border-emerald-react group-hover:bg-emerald-react group-hover:text-white',
  },
  fertilizantes: {
    label: 'Fertilizantes',
    accent: '#0038FF',
    badgeClass: 'group-hover:border-cobalt group-hover:bg-cobalt group-hover:text-white',
  },
  agroindustria: {
    label: 'Agroindustria',
    accent: '#F59E0B',
    badgeClass: 'group-hover:border-amber-molten group-hover:bg-amber-molten group-hover:text-ink',
  },
  petroquimica: {
    label: 'Petroquímica',
    accent: '#FF331F',
    badgeClass: 'group-hover:border-signal-red group-hover:bg-signal-red group-hover:text-white',
  },
  bioenergia: {
    label: 'Bioenergía',
    accent: '#00A859',
    badgeClass: 'group-hover:border-emerald-react group-hover:bg-emerald-react group-hover:text-white',
  },
};

export function ProcessDeckPreview({
  productos,
  procesoEjemplo,
  pasosEjemplo,
  esEjemplo,
}: ProcessDeckPreviewProps) {
  const [activeTab, setActiveTab] = useState<'proceso' | 'productos' | 'contrato'>('proceso');
  const [selectedStepId, setSelectedStepId] = useState<string>(
    pasosEjemplo[1]?.paso_id ?? pasosEjemplo[0]?.paso_id ?? ''
  );

  const selectedStep =
    pasosEjemplo.find((p) => p.paso_id === selectedStepId) ?? pasosEjemplo[0] ?? null;

  return (
    <MotionConfig reducedMotion="user">
      <section className="border border-rule bg-canvas">
        {/* Barra superior minimalista B&W con segmented control estilo Bencho + details.so */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-wider text-ink-muted">
            <span className="inline-flex h-5 w-5 items-center justify-center bg-ink text-[10px] font-semibold text-white">
              01
            </span>
            <span className="text-ink font-medium">Inspector de contrato & procesos</span>
          </div>

          <div
            role="tablist"
            aria-label="Vistas de demostración Etapa 1"
            className="inline-flex border border-rule bg-surface p-0.5 font-mono text-xs"
          >
            {(
              [
                { id: 'proceso', label: 'Flujo reactivo' },
                { id: 'productos', label: `Cadenas MVP (${productos.length})` },
                { id: 'contrato', label: 'Reglas Zod' },
              ] as const
            ).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative cursor-pointer px-3 py-1.5 transition-colors ${
                    isActive ? 'text-white' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="atlas-console-tab"
                      transition={SPRING_TACTILE}
                      className="absolute inset-0 bg-ink"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cuerpo */}
        <div className="p-4 sm:p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'proceso' && procesoEjemplo && (
              <motion.div
                key="proceso"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={SPRING_TACTILE}
                className="grid gap-6 lg:grid-cols-12"
              >
                <div className="space-y-5 lg:col-span-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-cobalt">
                        <span className="h-1.5 w-1.5 bg-cobalt" />
                        {esEjemplo ? 'EJEMPLO INTERACTIVO · NO OFICIAL' : 'PROCESO VERIFICADO'}
                      </span>
                      <h3 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                        {procesoEjemplo.nombre}
                      </h3>
                    </div>
                    {procesoEjemplo.reaccion_global && (
                      <code className="border border-ink bg-ink px-2.5 py-1 font-mono text-xs text-white">
                        {procesoEjemplo.reaccion_global}
                      </code>
                    )}
                  </div>

                  {/* Tarjetas táctiles de pasos (B&W en reposo → ruptura en azul cobalto al seleccionar) */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {pasosEjemplo.map((paso) => {
                      const isSelected = selectedStep?.paso_id === paso.paso_id;
                      return (
                        <motion.button
                          key={paso.paso_id}
                          type="button"
                          whileHover={{ y: -3 }}
                          whileTap={{ scale: 0.985 }}
                          transition={SPRING_TACTILE}
                          onClick={() => setSelectedStepId(paso.paso_id)}
                          className={`group relative flex cursor-pointer flex-col justify-between border p-4 text-left transition-colors ${
                            isSelected
                              ? 'border-cobalt bg-cobalt text-white'
                              : 'border-rule bg-canvas text-ink hover:border-ink'
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className={isSelected ? 'text-white/80' : 'text-ink-muted'}>
                              PASO 0{paso.orden}
                            </span>
                            <ArrowUpRight
                              className={`h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                                isSelected ? 'text-white' : 'text-ink-muted group-hover:text-ink'
                              }`}
                            />
                          </div>

                          <p className="mt-4 text-sm font-medium leading-snug">{paso.nombre}</p>

                          <div
                            className={`mt-4 flex items-center justify-between border-t pt-2.5 font-mono text-[11px] tabular-nums ${
                              isSelected
                                ? 'border-white/25 text-white/85'
                                : 'border-rule text-ink-muted'
                            }`}
                          >
                            <span>{paso.temperatura_c ? `${paso.temperatura_c} °C` : 'SIN DATOS'}</span>
                            <span>
                              {paso.energia.estado === 'dato'
                                ? `${paso.energia.valor} ${paso.energia.unidad}`
                                : '—'}
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Barra de balance visual minimalista */}
                  <div className="dot-matrix-bg border border-rule p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase text-ink-muted">
                      <span>Balance específico de ejemplo (Etapa 3 se carga con fuente oficial)</span>
                      <span className="text-ink">Base: 1.00 t Al</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs tabular-nums">
                      <div className="border border-rule bg-canvas p-2.5">
                        <span className="block text-[10px] text-ink-muted">ENTRADA Al₂O₃</span>
                        <span className="mt-0.5 block text-base font-semibold text-ink">1.93 t</span>
                      </div>
                      <div className="border border-rule bg-canvas p-2.5">
                        <span className="block text-[10px] text-ink-muted">ENERGÍA ELÉCTRICA</span>
                        <span className="mt-0.5 block text-base font-semibold text-cobalt">14.2 MWh</span>
                      </div>
                      <div className="border border-rule bg-canvas p-2.5">
                        <span className="block text-[10px] text-ink-muted">EMISIÓN CO₂</span>
                        <span className="mt-0.5 block text-base font-semibold text-signal-red">1.54 t</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel inspector lateral */}
                <div className="lg:col-span-5">
                  <AnimatePresence mode="wait">
                    {selectedStep && (
                      <motion.div
                        key={selectedStep.paso_id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={SPRING_TACTILE}
                        className="flex h-full flex-col justify-between border border-ink bg-surface p-5"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-rule pb-2.5">
                            <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase text-ink">
                              <FlaskConical className="h-3.5 w-3.5 text-cobalt" />
                              {selectedStep.tipo_paso}
                            </span>
                            <span className="font-mono text-[11px] text-ink-muted">
                              {selectedStep.paso_id}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-display text-xl font-semibold tracking-tight text-ink">
                              {selectedStep.nombre}
                            </h4>
                            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                              {selectedStep.descripcion}
                            </p>
                          </div>

                          <dl className="grid grid-cols-2 gap-3 border-y border-rule py-3 font-mono text-xs tabular-nums">
                            <div>
                              <dt className="text-[10px] uppercase text-ink-muted">Temperatura</dt>
                              <dd className="mt-0.5 font-medium text-ink">
                                {selectedStep.temperatura_c ? `${selectedStep.temperatura_c} °C` : 'SIN DATOS'}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[10px] uppercase text-ink-muted">Presión</dt>
                              <dd className="mt-0.5 font-medium text-ink">
                                {selectedStep.presion_bar ? `${selectedStep.presion_bar} bar` : 'SIN DATOS'}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[10px] uppercase text-ink-muted">Energía</dt>
                              <dd className="mt-0.5 font-medium text-ink">
                                {selectedStep.energia.estado === 'dato'
                                  ? `${selectedStep.energia.valor} ${selectedStep.energia.unidad}`
                                  : 'SIN DATOS'}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[10px] uppercase text-ink-muted">Confianza</dt>
                              <dd className="mt-0.5 font-medium uppercase text-amber-molten">
                                {selectedStep.procedencia.confianza}
                              </dd>
                            </div>
                          </dl>

                          {selectedStep.reaccion_balanceada && (
                            <div>
                              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                                Reacción balanceada
                              </p>
                              <code className="mt-1.5 block border border-rule bg-canvas px-3 py-2 font-mono text-xs text-ink">
                                {selectedStep.reaccion_balanceada}
                              </code>
                            </div>
                          )}
                        </div>

                        <div className="mt-5 border-t border-rule pt-3 font-mono text-[11px] text-ink-muted">
                          <div className="flex items-center justify-between">
                            <span>Año ref.: {selectedStep.procedencia.anio}</span>
                            <span>Fuente: {selectedStep.procedencia.fuente_id}</span>
                          </div>
                          <p className="mt-1 truncate">Cita: {selectedStep.procedencia.cita_ubicacion}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {activeTab === 'productos' && (
              <motion.div
                key="productos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={SPRING_TACTILE}
                className="grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3 border border-rule"
              >
                {productos.map((prod, idx) => {
                  const meta = CATEGORIA_META[prod.categoria];
                  return (
                    <motion.article
                      key={prod.producto_id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...SPRING_TACTILE, delay: idx * 0.025 }}
                      className="group relative flex flex-col justify-between bg-canvas p-5 transition-colors hover:bg-surface"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                          <span className="inline-flex items-center gap-1.5 text-ink-muted">
                            <span
                              className="h-2 w-2 rounded-full opacity-35 transition-opacity group-hover:opacity-100"
                              style={{ backgroundColor: meta.accent }}
                            />
                            {meta.label}
                          </span>
                          <span
                            className={`border border-rule px-1.5 py-0.5 text-ink transition-colors ${meta.badgeClass}`}
                          >
                            {prod.formula_quimica ?? 'COMPLEJO'}
                          </span>
                        </div>

                        <h3 className="mt-3 font-display text-xl font-semibold tracking-tight text-ink">
                          {prod.nombre}
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                          {prod.descripcion_corta}
                        </p>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-rule pt-3 font-mono text-[11px]">
                        <span className="text-ink-muted">{prod.icono_id}</span>
                        <span
                          className={
                            prod.estado_mvp === 'ejemplo'
                              ? 'font-medium text-cobalt'
                              : 'text-ink-muted'
                          }
                        >
                          {prod.estado_mvp.toUpperCase()}
                        </span>
                      </div>
                    </motion.article>
                  );
                })}
              </motion.div>
            )}

            {activeTab === 'contrato' && (
              <motion.div
                key="contrato"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={SPRING_TACTILE}
                className="grid gap-px border border-rule bg-rule md:grid-cols-3"
              >
                <div className="bg-canvas p-5">
                  <Database className="h-4 w-4 text-cobalt" />
                  <h4 className="mt-3 font-mono text-xs font-semibold uppercase tracking-wider text-ink">
                    Capa única src/data/
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    Ningún componente lee Google Sheets ni JSON crudos. Migrar a Supabase/Postgres
                    solo cambia el adaptador interno.
                  </p>
                </div>
                <div className="bg-canvas p-5">
                  <ShieldAlert className="h-4 w-4 text-signal-red" />
                  <h4 className="mt-3 font-mono text-xs font-semibold uppercase tracking-wider text-ink">
                    Cero cifras inventadas
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    Cada cifra exige año, fuente, URL, fecha, SHA-256, cita exacta y confianza. Lo
                    faltante se declara como <code className="font-mono text-ink">sin_datos</code>.
                  </p>
                </div>
                <div className="bg-canvas p-5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-react" />
                  <h4 className="mt-3 font-mono text-xs font-semibold uppercase tracking-wider text-ink">
                    Build con compuerta dura
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    <code className="font-mono text-ink">prebuild</code> valida Zod, hashes del
                    manifiesto y claves foráneas entre las 12 tablas antes de compilar Astro.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pie técnico */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule bg-surface px-4 py-2.5 font-mono text-[11px] text-ink-muted sm:px-6">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-ink" />
            Etapa 2: Mapa bicontinental IGN (24 jurisdicciones + recuadro Antártida e Islas)
          </span>
          <span className="text-ink">docs/datos.md → listo para revisión</span>
        </div>
      </section>
    </MotionConfig>
  );
}
