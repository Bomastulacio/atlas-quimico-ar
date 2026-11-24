import { useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { ArrowRight, CheckCircle2, Database, FlaskConical, MapPin, ShieldAlert } from 'lucide-react';
import type { PasoProceso, Producto, Proceso } from '@/schemas';

interface ProcessDeckPreviewProps {
  productos: Producto[];
  procesoEjemplo: Proceso | null;
  pasosEjemplo: PasoProceso[];
  esEjemplo: boolean;
}

const SPRING_TACTILE = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 34,
  mass: 0.9,
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
  procesoEjemplo,
  pasosEjemplo,
  esEjemplo,
}: ProcessDeckPreviewProps) {
  const [activeTab, setActiveTab] = useState<'productos' | 'proceso' | 'contrato'>('proceso');
  const [selectedStepId, setSelectedStepId] = useState<string>(pasosEjemplo[1]?.paso_id ?? pasosEjemplo[0]?.paso_id ?? '');

  const selectedStep = pasosEjemplo.find((p) => p.paso_id === selectedStepId) ?? pasosEjemplo[0] ?? null;

  return (
    <MotionConfig reducedMotion="user">
      <section className="border border-rule bg-paper-elevated">
        {/* Barra superior de control con layoutId estilo Bencho */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink-muted">
            <span>[01]</span>
            <span>Consola de contrato de datos</span>
          </div>

          <div
            role="tablist"
            aria-label="Vistas de demostración Etapa 1"
            className="inline-flex rounded-sm border border-rule bg-paper p-0.5 font-mono text-xs"
          >
            {(
              [
                { id: 'proceso', label: 'Esquema ASCII' },
                { id: 'productos', label: `MVP (${productos.length})` },
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
                    isActive ? 'text-paper-elevated' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="atlas-console-tab"
                      transition={SPRING_TACTILE}
                      className="absolute inset-0 rounded-[2px] bg-ink"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenido animado por pestaña */}
        <div className="p-4 sm:p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'proceso' && procesoEjemplo && (
              <motion.div
                key="proceso"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={SPRING_TACTILE}
                className="grid gap-6 lg:grid-cols-12"
              >
                <div className="space-y-4 lg:col-span-7">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-wider text-copper">
                        {esEjemplo ? 'EJEMPLO INTERACTIVO // NO OFICIAL' : 'PROCESO VERIFICADO'}
                      </p>
                      <h3 className="font-display text-2xl text-ink sm:text-3xl">
                        {procesoEjemplo.nombre}
                      </h3>
                    </div>
                    {procesoEjemplo.reaccion_global && (
                      <code className="border border-rule bg-paper px-2.5 py-1 font-mono text-xs text-ink">
                        {procesoEjemplo.reaccion_global}
                      </code>
                    )}
                  </div>

                  {/* Diagrama táctil + ASCII adaptable a mobile y desktop */}
                  <div className="overflow-x-auto border border-rule bg-ink p-4 text-paper">
                    <pre className="ascii-frame text-[11px] text-paper/80 sm:text-xs">
{`+-------------------------------------------------------------------+
|  FLUJO DE PROCESO (DEFINIDO DESDE JSON :: NO HARDCODEADO)         |
+-------------------------------------------------------------------+
  [Al2O3: 1.93 t/t] ──▶ [Celda 960°C · 14.2 MWh/t] ──▶ [Al: 1.00 t]
                               │
                               └──▶ [CO2: 1.54 t/t (emisión)]`}
                    </pre>
                  </div>

                  {/* Tarjetas clickeables de pasos con spring */}
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {pasosEjemplo.map((paso, index) => {
                      const isSelected = selectedStep?.paso_id === paso.paso_id;
                      return (
                        <motion.button
                          key={paso.paso_id}
                          type="button"
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          transition={SPRING_TACTILE}
                          onClick={() => setSelectedStepId(paso.paso_id)}
                          className={`group relative cursor-pointer border p-3 text-left transition-colors ${
                            isSelected
                              ? 'border-ink bg-paper shadow-[3px_3px_0_0_#141513]'
                              : 'border-rule bg-paper-elevated hover:border-ink/60'
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono text-[11px] text-ink-muted">
                            <span>PASO 0{paso.orden}</span>
                            {index < pasosEjemplo.length - 1 && (
                              <ArrowRight className="h-3.5 w-3.5 text-copper opacity-70" />
                            )}
                          </div>
                          <p className="mt-1.5 text-sm font-medium leading-snug text-ink">
                            {paso.nombre}
                          </p>
                          <p className="mt-2 font-mono text-[11px] text-ink-muted">
                            {paso.temperatura_c ? `T: ${paso.temperatura_c} °C` : 'T: sin datos'}
                          </p>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Inspector lateral del paso seleccionado */}
                <div className="lg:col-span-5">
                  <AnimatePresence mode="wait">
                    {selectedStep && (
                      <motion.div
                        key={selectedStep.paso_id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={SPRING_TACTILE}
                        className="flex h-full flex-col justify-between border border-rule bg-paper p-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-rule pb-2">
                            <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase text-cobalt">
                              <FlaskConical className="h-3.5 w-3.5" />
                              {selectedStep.tipo_paso}
                            </span>
                            <span className="font-mono text-[11px] text-ink-muted">
                              ID: {selectedStep.paso_id}
                            </span>
                          </div>

                          <h4 className="text-base font-semibold text-ink">{selectedStep.nombre}</h4>
                          <p className="text-sm leading-relaxed text-ink-muted">
                            {selectedStep.descripcion}
                          </p>

                          <dl className="grid grid-cols-2 gap-2 border-y border-rule py-3 font-mono text-xs">
                            <div>
                              <dt className="text-[10px] uppercase text-ink-muted">Temperatura</dt>
                              <dd className="mt-0.5 tabular-nums text-ink">
                                {selectedStep.temperatura_c ? `${selectedStep.temperatura_c} °C` : 'SIN DATOS'}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[10px] uppercase text-ink-muted">Energía</dt>
                              <dd className="mt-0.5 tabular-nums text-ink">
                                {selectedStep.energia.estado === 'dato'
                                  ? `${selectedStep.energia.valor} ${selectedStep.energia.unidad}`
                                  : 'SIN DATOS'}
                              </dd>
                            </div>
                          </dl>

                          {selectedStep.reaccion_balanceada && (
                            <div>
                              <p className="font-mono text-[10px] uppercase text-ink-muted">
                                Reacción balanceada
                              </p>
                              <code className="mt-1 block border border-rule bg-paper-elevated px-2.5 py-1.5 font-mono text-xs text-ink">
                                {selectedStep.reaccion_balanceada}
                              </code>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 border-t border-rule pt-3 font-mono text-[11px] text-ink-muted">
                          <div className="flex items-center justify-between">
                            <span>Confianza: {selectedStep.procedencia.confianza.toUpperCase()}</span>
                            <span>Año: {selectedStep.procedencia.anio}</span>
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
                exit={{ opacity: 0, y: -8 }}
                transition={SPRING_TACTILE}
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              >
                {productos.map((prod, idx) => (
                  <motion.article
                    key={prod.producto_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...SPRING_TACTILE, delay: idx * 0.03 }}
                    whileHover={{ y: -2 }}
                    className="flex flex-col justify-between border border-rule bg-paper p-4 transition-shadow hover:shadow-[3px_3px_0_0_#141513]"
                  >
                    <div>
                      <div className="flex items-center justify-between font-mono text-[11px] text-ink-muted">
                        <span>{CATEGORIA_LABEL[prod.categoria]}</span>
                        <span className="border border-rule bg-paper-elevated px-1.5 py-0.5 text-ink">
                          {prod.formula_quimica ?? 'MEZCLA'}
                        </span>
                      </div>
                      <h3 className="mt-2 font-display text-2xl text-ink">{prod.nombre}</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                        {prod.descripcion_corta}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-rule pt-2.5 font-mono text-[11px]">
                      <span className="text-ink-muted">icono: {prod.icono_id}</span>
                      <span
                        className={
                          prod.estado_mvp === 'ejemplo'
                            ? 'text-copper'
                            : 'text-ink-muted'
                        }
                      >
                        [{prod.estado_mvp}]
                      </span>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            )}

            {activeTab === 'contrato' && (
              <motion.div
                key="contrato"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={SPRING_TACTILE}
                className="grid gap-4 md:grid-cols-3"
              >
                <div className="border border-rule bg-paper p-4">
                  <Database className="h-4 w-4 text-cobalt" />
                  <h4 className="mt-2 font-mono text-xs font-semibold uppercase text-ink">
                    Capa única src/data/
                  </h4>
                  <p className="mt-1.5 text-sm text-ink-muted">
                    Ningún componente lee Google Sheets ni JSON crudos. Migrar a Postgres/Supabase
                    solo cambia el adaptador interno.
                  </p>
                </div>
                <div className="border border-rule bg-paper p-4">
                  <ShieldAlert className="h-4 w-4 text-copper" />
                  <h4 className="mt-2 font-mono text-xs font-semibold uppercase text-ink">
                    Cero cifras inventadas
                  </h4>
                  <p className="mt-1.5 text-sm text-ink-muted">
                    Toda cifra exige año, fuente, URL, fecha de descarga, hash SHA-256, cita exacta
                    y nivel de confianza. Lo faltante entra como <code className="font-mono">sin_datos</code>.
                  </p>
                </div>
                <div className="border border-rule bg-paper p-4">
                  <CheckCircle2 className="h-4 w-4 text-forest" />
                  <h4 className="mt-2 font-mono text-xs font-semibold uppercase text-ink">
                    Build con compuerta dura
                  </h4>
                  <p className="mt-1.5 text-sm text-ink-muted">
                    <code className="font-mono">prebuild</code> valida esquema Zod, hashes de
                    manifiesto e integridad referencial entre las 12 tablas antes de compilar Astro.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pie técnico */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule bg-paper-muted/60 px-4 py-2.5 font-mono text-[11px] text-ink-muted sm:px-6">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-copper" />
            Próxima etapa: Mapa bicontinental IGN (24 jurisdicciones + recuadro Antártida e Islas)
          </span>
          <span>docs/datos.md → esperando aprobación</span>
        </div>
      </section>
    </MotionConfig>
  );
}
