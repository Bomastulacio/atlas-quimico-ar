import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Building2,
  Compass,
  Crosshair,
  Info,
  Layers,
  MapPin,
  X,
} from 'lucide-react';
import type { CoberturaDatos, Producto } from '@/schemas';
import type { GeoManifest, MapaProvinciaResumen } from '@/data';
import { ProductIcon } from './ProductIcon';

interface ProvinceSidePanelProps {
  selected: MapaProvinciaResumen | null;
  allProvincias: MapaProvinciaResumen[];
  onSelectProvincia: (provinciaId: string | null) => void;
  onZoomToSelected?: () => void;
  esEjemplo: boolean;
  geoManifest: GeoManifest;
  categoryAccent: (categoria: Producto['categoria']) => string;
}

const SPRING = {
  type: 'spring' as const,
  stiffness: 440,
  damping: 35,
  mass: 0.85,
};

const COBERTURA_STYLE: Record<
  CoberturaDatos,
  { label: string; dot: string; badge: string; desc: string }
> = {
  completa: {
    label: 'COBERTURA COMPLETA',
    dot: 'bg-emerald-react',
    badge: 'border-emerald-react/40 bg-emerald-react/10 text-emerald-react',
    desc: 'Datos productivos, procesos y comercio exterior verificados.',
  },
  parcial: {
    label: 'COBERTURA PARCIAL',
    dot: 'bg-cobalt',
    badge: 'border-cobalt/40 bg-cobalt/10 text-cobalt',
    desc: 'Algunas cadenas activas; restan fuentes o desagregación.',
  },
  baja: {
    label: 'COBERTURA BAJA',
    dot: 'bg-amber-molten',
    badge: 'border-amber-molten/50 bg-amber-molten/10 text-amber-molten',
    desc: 'Información preliminar en plan MVP; faltan cifras verificadas.',
  },
  sin_datos: {
    label: 'SIN DATOS CARGADOS',
    dot: 'bg-ink-muted',
    badge: 'border-rule bg-surface text-ink-muted',
    desc: 'Aún no hay cadenas químicas relevadas para esta jurisdicción.',
  },
};

const ROL_LABEL: Record<string, string> = {
  extraccion: 'Extracción',
  procesamiento: 'Procesamiento',
  refinacion: 'Refinación',
  sintesis: 'Síntesis química',
  logistica_export: 'Logística / Exportación',
};

export function ProvinceSidePanel({
  selected,
  allProvincias,
  onSelectProvincia,
  onZoomToSelected,
  esEjemplo,
  geoManifest,
  categoryAccent,
}: ProvinceSidePanelProps) {
  const activas = allProvincias.filter((p) => p.dominante !== null);
  const sinDatosCount = allProvincias.filter(
    (p) => p.provincia.cobertura_datos === 'sin_datos'
  ).length;

  return (
    <aside
      aria-label="Panel lateral de jurisdicción"
      className="flex h-full flex-col border border-rule bg-canvas"
    >
      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div
            key={selected.provincia.provincia_id}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={SPRING}
            className="flex h-full flex-col justify-between"
          >
            <div>
              {/* Franja superior de ruptura de color según producto dominante */}
              <div
                className="h-1.5 w-full transition-colors"
                style={{
                  backgroundColor: selected.dominante
                    ? categoryAccent(selected.dominante.categoria)
                    : '#09090B',
                }}
              />

              {/* Cabecera de la jurisdicción */}
              <div className="flex items-start justify-between gap-3 border-b border-rule p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-ink-muted">
                    <span className="border border-ink bg-ink px-1.5 py-0.5 font-semibold text-white">
                      GEOREF {selected.provincia.provincia_id}
                    </span>
                    <span>{selected.provincia.iso_3166_2}</span>
                    <span>·</span>
                    <span>{selected.provincia.region}</span>
                  </div>
                  <h3 className="mt-2 font-display text-2xl font-bold leading-tight tracking-tight text-ink">
                    {selected.provincia.nombre}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  {onZoomToSelected && (
                    <button
                      type="button"
                      onClick={onZoomToSelected}
                      title="Acercar a esta provincia"
                      className="cursor-pointer border border-rule p-1.5 text-ink-muted transition-colors hover:border-ink hover:text-ink"
                    >
                      <Crosshair className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectProvincia(null)}
                    aria-label="Cerrar panel de provincia"
                    className="cursor-pointer border border-rule p-1.5 text-ink-muted transition-colors hover:border-ink hover:bg-ink hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-5 p-5">
                {/* Indicador honesto de cobertura de datos */}
                {(() => {
                  const cov = COBERTURA_STYLE[selected.provincia.cobertura_datos];
                  return (
                    <div className="border border-rule bg-surface p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-semibold ${cov.badge}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${cov.dot}`} />
                          {cov.label}
                        </span>
                        {esEjemplo && (
                          <span className="font-mono text-[10px] uppercase text-signal-red">
                            DATO EJEMPLO
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                        {selected.provincia.nota_cobertura ?? cov.desc}
                      </p>
                    </div>
                  );
                })()}

                {/* Cadenas productivas presentes en la provincia */}
                <div>
                  <div className="flex items-center justify-between border-b border-rule pb-2 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                    <span>Cadenas y productos</span>
                    <span className="tabular-nums text-ink">
                      {selected.dominante ? 1 + selected.secundarios.length : 0}
                    </span>
                  </div>

                  {selected.dominante ? (
                    <div className="mt-3 space-y-2.5">
                      {[selected.dominante, ...selected.secundarios].map((prod, index) => {
                        const rel = selected.relaciones.find(
                          (r) => r.producto_id === prod.producto_id
                        );
                        const accent = categoryAccent(prod.categoria);
                        const isDom = index === 0;

                        return (
                          <motion.div
                            key={prod.producto_id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ ...SPRING, delay: index * 0.04 }}
                            className={`border p-3.5 ${
                              isDom ? 'border-ink bg-canvas' : 'border-rule bg-surface/60'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <span
                                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-ink text-white"
                                  style={{ backgroundColor: isDom ? accent : '#09090B' }}
                                >
                                  <ProductIcon iconId={prod.icono_id} size={18} />
                                </span>
                                <div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <h4 className="font-display text-base font-semibold text-ink">
                                      {prod.nombre}
                                    </h4>
                                    {isDom && (
                                      <span className="border border-ink px-1.5 py-0.5 font-mono text-[9px] uppercase text-ink">
                                        DOMINANTE
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                                    {prod.descripcion_corta}
                                  </p>
                                </div>
                              </div>

                              {prod.formula_quimica && (
                                <code className="shrink-0 border border-rule bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink">
                                  {prod.formula_quimica}
                                </code>
                              )}
                            </div>

                            {rel && (
                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-2 font-mono text-[10px] text-ink-muted">
                                <span>Rol: {ROL_LABEL[rel.rol_en_cadena] ?? rel.rol_en_cadena}</span>
                                <span>
                                  Ref. {rel.procedencia.anio} · {rel.procedencia.confianza.toUpperCase()}
                                </span>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="dot-matrix-bg mt-3 border border-rule p-4">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                        <div className="space-y-1">
                          <p className="font-mono text-xs font-medium text-ink">
                            SIN CADENAS RELEVADAS TODAVÍA
                          </p>
                          <p className="text-xs leading-relaxed text-ink-muted">
                            No inventamos ni estimamos producción faltante. Esta jurisdicción
                            permanecerá marcada como <code className="font-mono">sin_datos</code>{' '}
                            hasta incorporar fuentes oficiales verificadas.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Plantas georreferenciadas (si existen) */}
                {selected.plantas.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between border-b border-rule pb-2 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-ink" />
                        Plantas registradas
                      </span>
                      <span className="tabular-nums text-ink">{selected.plantas.length}</span>
                    </div>
                    <ul className="mt-2.5 space-y-2">
                      {selected.plantas.map((pl) => (
                        <li
                          key={pl.planta_id}
                          className="border border-rule bg-surface/60 p-3 font-mono text-xs"
                        >
                          <p className="font-sans text-sm font-medium text-ink">{pl.nombre}</p>
                          <p className="mt-1 text-[11px] text-ink-muted">
                            {pl.localidad} · ({pl.lat.toFixed(3)}, {pl.lon.toFixed(3)})
                          </p>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-2 text-[10px] text-ink-muted">
                            <span>{pl.empresaNombre ?? 'Empresa sin vínculo'}</span>
                            <span>
                              Capacidad:{' '}
                              {pl.capacidad.estado === 'dato'
                                ? `${pl.capacidad.valor.toLocaleString('es-AR')} ${pl.capacidad.unidad}`
                                : 'SIN DATOS'}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Departamentos con datos confiables preparados para Etapa 7 */}
                {selected.departamentosConfiables.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between border-b border-rule pb-2 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-ink" />
                        Departamentos con datos (Etapa 7)
                      </span>
                      <span className="tabular-nums text-ink">
                        {selected.departamentosConfiables.length}
                      </span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {selected.departamentosConfiables.map((d) => (
                        <span
                          key={d.departamento_id}
                          className="inline-flex items-center gap-1.5 border border-rule bg-surface px-2.5 py-1 font-mono text-[11px] text-ink"
                        >
                          <MapPin className="h-3 w-3 text-cobalt" />
                          {d.nombre}
                          <span className="text-ink-muted">({d.departamento_id})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pie del panel con cita cartográfica */}
            <div className="border-t border-rule bg-surface px-5 py-3 font-mono text-[10px] text-ink-muted">
              Límites oficiales: IGN / API Georef v2.0 ({geoManifest.fecha_descarga})
            </div>
          </motion.div>
        ) : (
          /* Estado inicial del panel cuando aún no se seleccionó una provincia */
          <motion.div
            key="overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SPRING}
            className="flex h-full flex-col justify-between"
          >
            <div>
              <div className="border-b border-rule p-5">
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                  <Compass className="h-3.5 w-3.5 text-cobalt" />
                  <span>Exploración territorial</span>
                </div>
                <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
                  Seleccioná una provincia en el mapa
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  Pasá el cursor para previsualizar el producto dominante o hacé click para abrir la
                  ficha territorial, el desglose completo de cadenas y el nivel de cobertura.
                </p>
              </div>

              <div className="space-y-5 p-5">
                {/* Resumen honesto de cobertura nacional */}
                <div className="border border-rule bg-surface p-4">
                  <div className="flex items-center justify-between font-mono text-[11px] uppercase text-ink-muted">
                    <span>Cobertura actual del atlas</span>
                    <span className="tabular-nums text-ink">
                      {activas.length} / {allProvincias.length} con cadenas
                    </span>
                  </div>
                  <div className="mt-2.5 flex h-2 w-full overflow-hidden border border-rule bg-canvas">
                    <div
                      className="bg-cobalt"
                      style={{ width: `${(activas.length / allProvincias.length) * 100}%` }}
                    />
                  </div>
                  <p className="mt-2.5 flex items-start gap-1.5 font-mono text-[11px] text-ink-muted">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink" />
                    <span>
                      {sinDatosCount} jurisdicciones figuran con trama punteada (
                      <code className="text-ink">sin_datos</code>) hasta incorporar fuentes
                      oficiales.
                    </span>
                  </p>
                </div>

                {/* Acceso rápido a las provincias con cadenas MVP */}
                <div>
                  <p className="border-b border-rule pb-2 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                    Jurisdicciones con cadenas MVP ({activas.length})
                  </p>
                  <div className="mt-2.5 divide-y divide-rule border border-rule">
                    {activas.map((item) => {
                      const dom = item.dominante!;
                      const accent = categoryAccent(dom.categoria);
                      return (
                        <button
                          key={item.provincia.provincia_id}
                          type="button"
                          onClick={() => onSelectProvincia(item.provincia.provincia_id)}
                          className="group flex w-full cursor-pointer items-center justify-between gap-3 bg-canvas px-3.5 py-2.5 text-left transition-colors hover:bg-surface"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="flex h-7 w-7 shrink-0 items-center justify-center border border-rule bg-surface text-ink transition-colors group-hover:border-transparent group-hover:bg-[var(--hover-accent)] group-hover:text-white"
                              style={{
                                ['--hover-accent' as string]: accent,
                              }}
                            >
                              <ProductIcon iconId={dom.icono_id} size={14} />
                            </span>
                            <div>
                              <p className="text-sm font-medium text-ink">
                                {item.provincia.nombre}
                              </p>
                              <p className="font-mono text-[10px] text-ink-muted">
                                {dom.nombre}
                                {item.secundarios.length > 0
                                  ? ` +${item.secundarios.length} más`
                                  : ''}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-[10px] text-ink-muted group-hover:text-ink">
                            {item.provincia.provincia_id} →
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-rule bg-surface px-5 py-3 font-mono text-[10px] text-ink-muted">
              Mapa bicontinental IGN (Ley 26.651) · Fuente: {geoManifest.organismo}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
