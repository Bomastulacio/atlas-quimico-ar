import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import type { ProcesoCompleto } from '@/data';
import { ProcessPfdDiagram } from './ProcessPfdDiagram';

const ProcessBfdReactFlow = lazy(() => import('./ProcessBfdReactFlow'));

export interface ProcessRouteMeta {
  etiqueta: string;
  ubicacion?: string;
}

interface ProcessFlowDiagramProps {
  procesoCompleto?: ProcesoCompleto;
  procesos?: ProcesoCompleto[];
  procesoMetaById?: Record<string, ProcessRouteMeta>;
}

export function ProcessFlowDiagram({
  procesoCompleto,
  procesos,
  procesoMetaById,
}: ProcessFlowDiagramProps) {
  const routes = useMemo(
    () => (procesos && procesos.length > 0 ? procesos : procesoCompleto ? [procesoCompleto] : []),
    [procesos, procesoCompleto]
  );

  const [activeProcesoId, setActiveProcesoId] = useState<string>(
    () => routes[0]?.proceso.proceso_id ?? ''
  );

  const activeProceso = useMemo(
    () => routes.find((r) => r.proceso.proceso_id === activeProcesoId) ?? routes[0],
    [routes, activeProcesoId]
  );

  const { proceso, pasos, conexiones, pfd, pfdFuentes } = activeProceso;
  const [viewMode, setViewMode] = useState<'pfd' | 'bfd'>(pfd ? 'pfd' : 'bfd');

  useEffect(() => {
    if (typeof window === 'undefined' || routes.length <= 1) return;
    const requested = new URLSearchParams(window.location.search).get('ruta');
    if (requested && routes.some((r) => r.proceso.proceso_id === requested)) {
      const target = routes.find((r) => r.proceso.proceso_id === requested)!;
      setActiveProcesoId(requested);
      setViewMode(target.pfd ? 'pfd' : 'bfd');
    }
  }, [routes]);

  const handleSelectRoute = useCallback(
    (routeId: string) => {
      const target = routes.find((r) => r.proceso.proceso_id === routeId);
      if (!target) return;
      setActiveProcesoId(routeId);
      setViewMode(target.pfd ? 'pfd' : 'bfd');
    },
    [routes]
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-4">
        {/* Selector de ruta tecnológica (cuando la cadena opera con múltiples rutas en Argentina) */}
        {routes.length > 1 && (
          <div className="border border-rule bg-stone-surface px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium tracking-[0.06em] text-ink-muted uppercase">
                  Ruta tecnológica ({routes.length} rutas verificadas)
                </p>
                <p className="mt-0.5 text-[12px] text-ink-muted">
                  {proceso.ruta_tecnologica}
                </p>
              </div>
              {proceso.reaccion_global && (
                <span className="border border-rule bg-stone-bg px-2.5 py-1 text-[12px] font-medium text-ink tabular-nums">
                  {proceso.reaccion_global}
                </span>
              )}
            </div>
            <div
              role="tablist"
              aria-label="Seleccionar ruta tecnológica"
              className="mt-3 flex flex-wrap gap-2"
            >
              {routes.map((r) => {
                const isActive = r.proceso.proceso_id === activeProceso.proceso.proceso_id;
                const meta = procesoMetaById?.[r.proceso.proceso_id];
                return (
                  <button
                    key={r.proceso.proceso_id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleSelectRoute(r.proceso.proceso_id)}
                    className={`bencho-press cursor-pointer border px-3.5 py-2 text-left transition-colors duration-150 ${
                      isActive
                        ? 'border-ink bg-ink text-white'
                        : 'border-rule bg-stone-bg text-ink hover:border-cobalt'
                    }`}
                  >
                    <span className="block text-[13px] font-medium leading-snug">
                      {meta?.etiqueta ?? r.proceso.nombre}
                    </span>
                    {meta?.ubicacion && (
                      <span
                        className={`mt-0.5 block text-[11px] ${
                          isActive ? 'text-white/80' : 'text-ink-muted'
                        }`}
                      >
                        {meta.ubicacion}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Switch de modo: PFD técnico ISO 10628 (cuando existe) + Vista resumida en bloques (BFD) */}
        {pfd && (
          <div className="flex flex-wrap items-center justify-between gap-3 border border-rule bg-stone-surface px-4 py-2.5">
            <div className="inline-flex border border-rule bg-stone-bg p-0.5 text-[13px]">
              <button
                type="button"
                onClick={() => setViewMode('pfd')}
                className={`bencho-press cursor-pointer px-3 py-1 font-medium ${
                  viewMode === 'pfd' ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                PFD de ingeniería (ISO 10628)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('bfd')}
                className={`bencho-press cursor-pointer px-3 py-1 font-medium ${
                  viewMode === 'bfd' ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                Vista resumida en bloques (BFD)
              </button>
            </div>
            <p className="text-[12px] text-ink-muted">
              {viewMode === 'pfd'
                ? 'Equipos normalizados, corrientes numeradas, servicios auxiliares y Tabla de Corrientes'
                : 'Resumen por etapas con entradas, reacciones y salidas agregadas'}
            </p>
          </div>
        )}

        {pfd && viewMode === 'pfd' ? (
          <ProcessPfdDiagram key={activeProceso.proceso.proceso_id} pfd={pfd} fuentesMap={pfdFuentes} />
        ) : (
          <Suspense
            fallback={
              <div className="flex h-[480px] items-center justify-center border border-rule bg-stone-surface text-[14px] text-ink-muted">
                Cargando vista resumida en bloques (BFD)...
              </div>
            }
          >
            <ProcessBfdReactFlow
              key={activeProceso.proceso.proceso_id}
              proceso={proceso}
              pasos={pasos}
              conexiones={conexiones}
            />
          </Suspense>
        )}
      </div>
    </MotionConfig>
  );
}
