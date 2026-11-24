import { useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import type { ConexionProceso, PasoProceso, Producto, Proceso } from '@/schemas';
import { ProductIcon } from './ProductIcon';
import { getCategoryAccent } from './ArgentinaMapExplorer';

interface ProcessDeckPreviewProps {
  productos: Producto[];
  procesoEjemplo: Proceso | null;
  pasosEjemplo: PasoProceso[];
  conexionesEjemplo: ConexionProceso[];
  esEjemplo: boolean;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const SPRING_TAB = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 34,
  mass: 0.85,
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
  conexionesEjemplo,
}: ProcessDeckPreviewProps) {
  const [activeView, setActiveView] = useState<'proceso' | 'cadenas'>('proceso');
  const defaultStep =
    pasosEjemplo.find((p) => p.tipo_paso === 'reaccion') ?? pasosEjemplo[0];
  const [selectedStepId, setSelectedStepId] = useState<string>(defaultStep?.paso_id ?? '');

  const selectedStep =
    pasosEjemplo.find((p) => p.paso_id === selectedStepId) ?? defaultStep ?? null;

  // Extraer indicadores clave directamente desde las conexiones y proceso validados (cero hardcode)
  const aluminaCon = conexionesEjemplo.find(
    (c) => c.tipo_corriente === 'principal' && c.corriente_nombre.includes('Al2O3')
  );
  const emisionCon = conexionesEjemplo.find((c) => c.tipo_corriente === 'emision');

  const aluminaText =
    aluminaCon?.flujo.estado === 'dato'
      ? `${aluminaCon.flujo.valor.toLocaleString('es-AR', { minimumFractionDigits: 2 })} t`
      : 'Sin datos';

  const energiaText =
    procesoEjemplo?.energia_especifica.estado === 'dato'
      ? `${procesoEjemplo.energia_especifica.valor.toLocaleString('es-AR', { minimumFractionDigits: 2 })} MWh`
      : 'Sin datos';

  const emisionText =
    emisionCon?.flujo.estado === 'dato'
      ? `${emisionCon.flujo.valor.toLocaleString('es-AR', { minimumFractionDigits: 2 })} t`
      : 'Sin datos';

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-6">
        {/* Cabecera limpia de sección + control segmentado conectado */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-4">
          <div className="max-w-2xl">
            <h2 className="font-display text-[24px] font-bold tracking-tight text-ink">
              Procesos químicos y cadenas prioritarias
            </h2>
            <p className="mt-1.5 text-[15px] text-ink-muted">
              Cada cadena se modela paso a paso desde tablas JSON validadas con reacciones
              balanceadas, condiciones operativas, energía y emisiones. Aluminio (Chubut) ya cuenta
              con ficha verificada y diagrama interactivo completo.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Vista de procesos y cadenas"
            className="inline-flex bg-stone-subtle p-1 text-[13px]"
          >
            {(
              [
                { id: 'proceso', label: 'Aluminio (verificado)' },
                { id: 'cadenas', label: `Las ${productos.length} cadenas iniciales` },
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
          {activeView === 'proceso' && procesoEjemplo && (
            <motion.div
              key="proceso"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="grid gap-6 border border-rule bg-stone-surface lg:grid-cols-12"
            >
              {/* Columna izquierda: secuencia interactiva de pasos */}
              <div className="flex flex-col justify-between p-6 lg:col-span-7 lg:border-r lg:border-rule">
                <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="font-display text-[24px] font-semibold tracking-tight text-ink">
                      {procesoEjemplo.nombre}
                    </h3>
                    {procesoEjemplo.reaccion_global && (
                      <span className="text-[15px] font-medium text-cobalt tabular-nums">
                        {procesoEjemplo.reaccion_global}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 max-w-[65ch] text-[15px] text-ink-muted">
                    {procesoEjemplo.ruta_tecnologica}
                  </p>

                  {/* Pasos clickeables en grilla limpia */}
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {pasosEjemplo.map((paso, index) => {
                      const isSelected = selectedStep?.paso_id === paso.paso_id;
                      return (
                        <button
                          key={paso.paso_id}
                          type="button"
                          onClick={() => setSelectedStepId(paso.paso_id)}
                          className={`group flex cursor-pointer flex-col justify-between border p-3.5 text-left transition-colors duration-150 ${
                            isSelected
                              ? 'border-cobalt bg-cobalt text-white'
                              : 'border-rule bg-stone-bg text-ink hover:border-ink'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[13px]">
                            <span
                              className={
                                isSelected
                                  ? 'text-white/80 tabular-nums'
                                  : 'text-ink-muted tabular-nums'
                              }
                            >
                              Paso {paso.orden}
                            </span>
                            {index < pasosEjemplo.length - 1 && (
                              <ArrowRight
                                className={`h-3.5 w-3.5 ${
                                  isSelected ? 'text-white/80' : 'text-ink-muted'
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
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Balance sintético verificado + acceso directo al diagrama React Flow */}
                <div className="mt-8 border-t border-rule pt-5">
                  <dl className="grid grid-cols-3 gap-4 tabular-nums">
                    <div>
                      <dt className="text-[13px] text-ink-muted">Alúmina por tonelada</dt>
                      <dd className="mt-1 font-display text-[24px] font-semibold text-ink">
                        {aluminaText}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[13px] text-ink-muted">Energía en cubas</dt>
                      <dd className="mt-1 font-display text-[24px] font-semibold text-cobalt">
                        {energiaText}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[13px] text-ink-muted">Emisión directa CO₂</dt>
                      <dd className="mt-1 font-display text-[24px] font-semibold text-signal-red">
                        {emisionText}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5">
                    <a
                      href="/productos/aluminio"
                      className="inline-flex items-center gap-2 bg-ink px-4 py-2.5 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-cobalt"
                    >
                      <span>Abrir diagrama interactivo React Flow y ficha completa</span>
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Columna derecha: detalle químico del paso seleccionado */}
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
                          <h4 className="mt-1 font-display text-[24px] font-semibold leading-snug text-ink">
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
            </motion.div>
          )}

          {activeView === 'cadenas' && (
            <motion.div
              key="cadenas"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="border border-rule bg-stone-surface"
            >
              <div className="divide-y divide-rule">
                {productos.map((prod) => {
                  const accent = getCategoryAccent(prod.categoria);
                  const isValidated = prod.estado_mvp === 'validado';
                  return (
                    <div
                      key={prod.producto_id}
                      className="grid items-center gap-4 px-6 py-4 transition-colors duration-150 hover:bg-stone-bg/70 sm:grid-cols-12"
                    >
                      <div className="flex items-center gap-3.5 sm:col-span-4">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center text-white"
                          style={{ backgroundColor: accent }}
                        >
                          <ProductIcon iconId={prod.icono_id} size={18} />
                        </span>
                        <div>
                          <h3 className="text-[15px] font-semibold text-ink">{prod.nombre}</h3>
                          <p className="text-[13px] text-ink-muted">
                            {CATEGORIA_LABEL[prod.categoria]}
                            {prod.formula_quimica ? ` · ${prod.formula_quimica}` : ''}
                          </p>
                        </div>
                      </div>

                      <p className="text-[15px] text-ink-muted sm:col-span-5">
                        {prod.descripcion_corta}
                      </p>

                      <div className="flex items-center justify-between text-[13px] sm:col-span-3 sm:justify-end">
                        {isValidated ? (
                          <a
                            href={`/productos/${prod.producto_id}`}
                            className="inline-flex items-center gap-1.5 font-semibold text-cobalt hover:underline"
                          >
                            <span>Abrir ficha verificada</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span className="text-ink-muted">Pendiente Etapa 6</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
