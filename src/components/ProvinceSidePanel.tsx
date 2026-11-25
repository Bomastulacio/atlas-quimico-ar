import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Building2, Crosshair, MapPin, X } from 'lucide-react';
import type { CoberturaDatos, Departamento, Producto } from '@/schemas';
import type { GeoManifest, MapaDepartamentoResumen, MapaProvinciaResumen } from '@/data';
import { ProductIcon } from './ProductIcon';

interface ProvinceSidePanelProps {
  selected: MapaProvinciaResumen | null;
  selectedDepartamento: MapaDepartamentoResumen | null;
  allProvincias: MapaProvinciaResumen[];
  onSelectProvincia: (provinciaId: string | null) => void;
  onSelectDepartamento: (departamentoId: string | null) => void;
  onZoomToSelected?: () => void;
  onZoomToDepartamento?: () => void;
  esEjemplo: boolean;
  geoManifest: GeoManifest;
  categoryAccent: (categoria: Producto['categoria']) => string;
}

const PANEL_EASE = [0.22, 1, 0.36, 1] as const;

const COBERTURA_META: Record<
  CoberturaDatos,
  { label: string; dotClass: string; fallback: string }
> = {
  completa: {
    label: 'Cobertura completa',
    dotClass: 'bg-emerald-react',
    fallback: 'Datos productivos, procesos y comercio exterior verificados con fuente oficial.',
  },
  parcial: {
    label: 'Cobertura parcial',
    dotClass: 'bg-cobalt',
    fallback: 'Hay cadenas relevadas; restan incorporar series oficiales o desagregación.',
  },
  baja: {
    label: 'Cobertura baja',
    dotClass: 'bg-ochre-metal',
    fallback: 'Cadenas previstas en el plan inicial, pendientes de verificación oficial.',
  },
  sin_datos: {
    label: 'Sin datos cargados',
    dotClass: 'bg-ink-muted',
    fallback: 'Todavía no hay cadenas químicas relevadas para esta jurisdicción.',
  },
};

const ROL_LABEL: Record<string, string> = {
  extraccion: 'Extracción',
  procesamiento: 'Procesamiento',
  refinacion: 'Refinación',
  sintesis: 'Síntesis química',
  logistica_export: 'Logística y exportación',
};

const TIPO_ZONA_META: Record<
  Departamento['tipo_zona'],
  { label: string; color: string }
> = {
  polo_industrial: { label: 'Polo industrial', color: '#0A42E0' },
  minero: { label: 'Zona minera', color: '#0B7A53' },
  agro: { label: 'Núcleo agroindustrial', color: '#C86A11' },
  energetico: { label: 'Zona energética', color: '#D93025' },
  mixto: { label: 'Zona mixta', color: '#111214' },
};

export function ProvinceSidePanel({
  selected,
  selectedDepartamento,
  allProvincias,
  onSelectProvincia,
  onSelectDepartamento,
  onZoomToSelected,
  onZoomToDepartamento,
  esEjemplo,
  geoManifest,
  categoryAccent,
}: ProvinceSidePanelProps) {
  const activas = allProvincias.filter((p) => p.dominante !== null);
  const sinDatosCount = allProvincias.filter(
    (p) => p.provincia.cobertura_datos === 'sin_datos'
  ).length;
  const totalDeptosConfiables = allProvincias.reduce(
    (acc, p) => acc + p.departamentosConfiables.length,
    0
  );

  return (
    <aside
      aria-label="Ficha de jurisdicción o departamento seleccionado"
      className="flex h-full flex-col border-t border-rule bg-stone-surface lg:border-t-0"
    >
      <AnimatePresence mode="wait">
        {selectedDepartamento ? (
          <motion.div
            key={`dept-${selectedDepartamento.departamento.departamento_id}`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2, ease: PANEL_EASE }}
            className="flex h-full flex-col justify-between"
          >
            <div>
              {/* Filete superior según tipo de zona productiva */}
              <div
                className="h-1 w-full transition-colors duration-200"
                style={{
                  backgroundColor:
                    TIPO_ZONA_META[selectedDepartamento.departamento.tipo_zona]?.color ?? '#111214',
                }}
              />

              {/* Breadcrumb de retorno a la provincia padre */}
              <div className="flex items-center justify-between gap-2 border-b border-rule bg-stone-bg px-6 py-2.5 text-[13px]">
                <button
                  type="button"
                  onClick={() => onSelectDepartamento(null)}
                  className="inline-flex cursor-pointer items-center gap-1.5 font-medium text-ink transition-colors duration-150 hover:text-cobalt"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Volver a {selectedDepartamento.provincia.nombre}</span>
                </button>
                <span className="text-ink-muted">Departamento</span>
              </div>

              {/* Cabecera departamental */}
              <div className="flex items-start justify-between gap-4 border-b border-rule px-6 py-5">
                <div>
                  <h2 className="font-display text-[20px] font-medium leading-[1.18] tracking-[-0.02em] text-ink">
                    {selectedDepartamento.departamento.nombre}
                  </h2>
                  <p className="mt-1.5 text-[13px] text-ink-muted tabular-nums">
                    {selectedDepartamento.provincia.nombre} ·{' '}
                    {TIPO_ZONA_META[selectedDepartamento.departamento.tipo_zona]?.label ??
                      selectedDepartamento.departamento.tipo_zona}{' '}
                    · Georef {selectedDepartamento.departamento.departamento_id}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {onZoomToDepartamento && (
                    <button
                      type="button"
                      onClick={onZoomToDepartamento}
                      title="Acercar a este departamento"
                      aria-label="Acercar a este departamento"
                      className="cursor-pointer p-2 text-ink-muted transition-colors duration-150 hover:bg-stone-subtle hover:text-ink"
                    >
                      <Crosshair className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectProvincia(null)}
                    aria-label="Volver al resumen nacional"
                    className="cursor-pointer p-2 text-ink-muted transition-colors duration-150 hover:bg-ink hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-rule px-6">
                {/* Cobertura y nota departamental */}
                {(() => {
                  const cov = COBERTURA_META[selectedDepartamento.departamento.cobertura_datos];
                  return (
                    <div className="py-5">
                      <div className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="inline-flex items-center gap-2 font-medium text-ink">
                          <span className={`h-2 w-2 rounded-full ${cov.dotClass}`} />
                          {cov.label}
                        </span>
                        <span className="font-medium text-emerald-react">Datos confiables</span>
                      </div>
                      <p className="mt-2 text-[14px] text-ink-muted">
                        {selectedDepartamento.departamento.nota_cobertura ?? cov.fallback}
                      </p>
                    </div>
                  );
                })()}

                {/* Cadenas presentes en el departamento */}
                <div className="py-5">
                  <div className="flex items-baseline justify-between text-[13px] font-medium text-ink-muted">
                    <span>Cadenas en este departamento</span>
                    <span className="tabular-nums text-ink">
                      {selectedDepartamento.productos.length}
                    </span>
                  </div>
                  <ul className="mt-4 divide-y divide-rule">
                    {selectedDepartamento.productos.map((prod) => {
                      const accent = categoryAccent(prod.categoria);
                      return (
                        <li key={prod.producto_id} className="py-4 first:pt-0 last:pb-0">
                          <div className="flex items-start gap-3.5">
                            <span
                              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-white"
                              style={{ backgroundColor: accent }}
                            >
                              <ProductIcon iconId={prod.icono_id} size={18} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h3 className="text-[15px] font-medium text-ink">
                                  {prod.nombre}
                                </h3>
                                {prod.formula_quimica && (
                                  <span className="text-[13px] font-medium text-ink-muted tabular-nums">
                                    {prod.formula_quimica}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-[14px] text-ink-muted">
                                {prod.descripcion_corta}
                              </p>
                              {prod.estado_mvp === 'validado' && (
                                <a
                                  href={`/productos/${prod.producto_id}`}
                                  className="mt-3 inline-flex items-center gap-2 bg-ink px-3.5 py-2 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-cobalt"
                                >
                                  <span>Abrir ficha completa y diagrama</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Plantas georreferenciadas dentro del departamento */}
                {selectedDepartamento.plantas.length > 0 && (
                  <div className="py-5">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-ink-muted">
                      <Building2 className="h-4 w-4 text-ink" />
                      <span>
                        Plantas en {selectedDepartamento.departamento.nombre} (
                        {selectedDepartamento.plantas.length})
                      </span>
                    </div>
                    <ul className="mt-3 space-y-3">
                      {selectedDepartamento.plantas.map((pl) => (
                        <li key={pl.planta_id}>
                          <p className="text-[15px] font-medium text-ink">{pl.nombre}</p>
                          <p className="mt-0.5 text-[13px] text-ink-muted tabular-nums">
                            {pl.localidad} ({pl.lat.toFixed(3)}, {pl.lon.toFixed(3)}) ·{' '}
                            {pl.empresaNombre ?? 'Operador sin registrar'}
                          </p>
                          <p className="mt-0.5 text-[13px] text-ink-muted tabular-nums">
                            Capacidad:{' '}
                            {pl.capacidad.estado === 'dato'
                              ? `${pl.capacidad.valor.toLocaleString('es-AR')} ${pl.capacidad.unidad}`
                              : 'Sin datos'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="py-4 text-[13px] text-ink-muted">
                  Solo se cartografían departamentos con datos confiables verificados; el resto del
                  territorio provincial se consulta a nivel jurisdiccional.
                </div>
              </div>
            </div>

            <div className="border-t border-rule px-6 py-3.5 text-[13px] text-ink-muted tabular-nums">
              Límites departamentales: IGN / API Georef v2.0 (
              {geoManifest.departamentos_oficial?.fecha_descarga ?? geoManifest.fecha_descarga})
            </div>
          </motion.div>
        ) : selected ? (
          <motion.div
            key={selected.provincia.provincia_id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2, ease: PANEL_EASE }}
            className="flex h-full flex-col justify-between"
          >
            <div>
              {/* Filete superior de ruptura cromática según cadena dominante */}
              <div
                className="h-1 w-full transition-colors duration-200"
                style={{
                  backgroundColor: selected.dominante
                    ? categoryAccent(selected.dominante.categoria)
                    : '#111214',
                }}
              />

              {/* Cabecera limpia sin chips decorativos */}
              <div className="flex items-start justify-between gap-4 border-b border-rule px-6 py-5">
                <div>
                  <h2 className="font-display text-[20px] font-medium leading-[1.18] tracking-[-0.02em] text-ink">
                    {selected.provincia.nombre}
                  </h2>
                  <p className="mt-1.5 text-[13px] text-ink-muted tabular-nums">
                    Región {selected.provincia.region} · Código Georef{' '}
                    {selected.provincia.provincia_id} ({selected.provincia.iso_3166_2})
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {onZoomToSelected && (
                    <button
                      type="button"
                      onClick={onZoomToSelected}
                      title="Acercar a esta provincia"
                      aria-label="Acercar a esta provincia"
                      className="cursor-pointer p-2 text-ink-muted transition-colors duration-150 hover:bg-stone-subtle hover:text-ink"
                    >
                      <Crosshair className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectProvincia(null)}
                    aria-label="Volver al resumen nacional"
                    className="cursor-pointer p-2 text-ink-muted transition-colors duration-150 hover:bg-ink hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-rule px-6">
                {/* Cobertura de datos con jerarquía tipográfica pura */}
                {(() => {
                  const cov = COBERTURA_META[selected.provincia.cobertura_datos];
                  return (
                    <div className="py-5">
                      <div className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="inline-flex items-center gap-2 font-medium text-ink">
                          <span className={`h-2 w-2 rounded-full ${cov.dotClass}`} />
                          {cov.label}
                        </span>
                        {selected.provincia.cobertura_datos === 'completa' ? (
                          <span className="font-medium text-emerald-react">Fuentes oficiales</span>
                        ) : (
                          esEjemplo && <span className="text-ink-muted">Pendiente Etapa 6</span>
                        )}
                      </div>
                      <p className="mt-2 text-[14px] text-ink-muted">
                        {selected.provincia.nota_cobertura ?? cov.fallback}
                      </p>
                    </div>
                  );
                })()}

                {/* Departamentos con datos confiables (interactivos: abren zoom y ficha departamental) */}
                {selected.departamentosConfiables.length > 0 && (
                  <div className="py-5">
                    <div className="flex items-center justify-between gap-2 text-[13px] font-medium text-ink-muted">
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-ink" />
                        <span>Departamentos con datos ({selected.departamentosConfiables.length})</span>
                      </span>
                      <span className="text-[13px] text-ink-muted">Click para acercar</span>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {selected.departamentosConfiables.map((d) => {
                        const zm = TIPO_ZONA_META[d.tipo_zona];
                        return (
                          <li key={d.departamento_id}>
                            <button
                              type="button"
                              onClick={() => onSelectDepartamento(d.departamento_id)}
                              className="group flex w-full cursor-pointer items-center justify-between gap-3 border border-rule bg-stone-bg px-3.5 py-2.5 text-left transition-colors duration-150 hover:border-ink hover:bg-stone-surface"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: zm?.color ?? '#111214' }}
                                  />
                                  <span className="truncate text-[14px] font-medium text-ink group-hover:text-cobalt">
                                    {d.nombre}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[13px] text-ink-muted tabular-nums">
                                  {zm?.label ?? d.tipo_zona} · Georef {d.departamento_id}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-cobalt" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Cadenas productivas de la jurisdicción */}
                <div className="py-5">
                  <div className="flex items-baseline justify-between text-[13px] font-medium text-ink-muted">
                    <span>Cadenas y productos</span>
                    <span className="tabular-nums text-ink">
                      {selected.dominante ? 1 + selected.secundarios.length : 0}
                    </span>
                  </div>

                  {selected.dominante ? (
                    <ul className="mt-4 divide-y divide-rule">
                      {[selected.dominante, ...selected.secundarios].map((prod, index) => {
                        const rel = selected.relaciones.find(
                          (r) => r.producto_id === prod.producto_id
                        );
                        const accent = categoryAccent(prod.categoria);
                        const isDom = index === 0;

                        return (
                          <li key={prod.producto_id} className="py-4 first:pt-0 last:pb-0">
                            <div className="flex items-start gap-3.5">
                              <span
                                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-white"
                                style={{ backgroundColor: isDom ? accent : '#111214' }}
                              >
                                <ProductIcon iconId={prod.icono_id} size={18} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                  <h3 className="text-[15px] font-medium text-ink">
                                    {prod.nombre}
                                  </h3>
                                  {prod.formula_quimica && (
                                    <span className="text-[13px] font-medium text-ink-muted tabular-nums">
                                      {prod.formula_quimica}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-[14px] text-ink-muted">
                                  {prod.descripcion_corta}
                                </p>
                                {rel && (
                                  <p className="mt-2 text-[13px] text-ink-muted tabular-nums">
                                    {isDom ? 'Producto dominante' : 'Cadena secundaria'} ·{' '}
                                    {ROL_LABEL[rel.rol_en_cadena] ?? rel.rol_en_cadena} · Año{' '}
                                    {rel.procedencia.anio}
                                  </p>
                                )}
                                {prod.estado_mvp === 'validado' && (
                                  <a
                                    href={`/productos/${prod.producto_id}`}
                                    className="mt-3 inline-flex items-center gap-2 bg-ink px-3.5 py-2 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-cobalt"
                                  >
                                    <span>Abrir ficha completa y diagrama</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-3 text-[15px] text-ink-muted">
                      Esta provincia no tiene cadenas productivas cargadas todavía. Nunca estimamos
                      cifras faltantes: cuando se incorporen fuentes oficiales aparecerán en este
                      panel.
                    </p>
                  )}
                </div>

                {/* Plantas georreferenciadas */}
                {selected.plantas.length > 0 && (
                  <div className="py-5">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-ink-muted">
                      <Building2 className="h-4 w-4 text-ink" />
                      <span>Plantas registradas ({selected.plantas.length})</span>
                    </div>
                    <ul className="mt-3 space-y-3">
                      {selected.plantas.map((pl) => (
                        <li key={pl.planta_id}>
                          <p className="text-[15px] font-medium text-ink">{pl.nombre}</p>
                          <p className="mt-0.5 text-[13px] text-ink-muted tabular-nums">
                            {pl.localidad} ({pl.lat.toFixed(3)}, {pl.lon.toFixed(3)}) ·{' '}
                            {pl.empresaNombre ?? 'Operador sin registrar'}
                          </p>
                          <p className="mt-0.5 text-[13px] text-ink-muted tabular-nums">
                            Capacidad:{' '}
                            {pl.capacidad.estado === 'dato'
                              ? `${pl.capacidad.valor.toLocaleString('es-AR')} ${pl.capacidad.unidad}`
                              : 'Sin datos'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-rule px-6 py-3.5 text-[13px] text-ink-muted tabular-nums">
              Límites oficiales IGN / API Georef v2.0 ({geoManifest.fecha_descarga})
            </div>
          </motion.div>
        ) : (
          /* Estado inicial del panel: resumen nacional y acceso directo a provincias activas */
          <motion.div
            key="overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: PANEL_EASE }}
            className="flex h-full flex-col justify-between"
          >
            <div>
              <div className="border-b border-rule px-6 py-5">
                <h2 className="font-display text-[20px] font-medium leading-[1.18] tracking-[-0.02em] text-ink">
                  Explorá el territorio
                </h2>
                <p className="mt-2 text-[14px] text-ink-muted">
                  Hacé click en cualquier provincia o acercá el mapa para revelar los{' '}
                  {totalDeptosConfiables} departamentos con datos verificados (polos industriales,
                  mineros y agroindustriales).
                </p>
              </div>

              {/* Barra limpia de cobertura nacional */}
              <div className="border-b border-rule px-6 py-5">
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="font-medium text-ink">Cobertura territorial actual</span>
                  <span className="tabular-nums text-ink-muted">
                    {activas.length} de {allProvincias.length} jurisdicciones
                  </span>
                </div>
                <div className="mt-2.5 h-1.5 w-full bg-stone-subtle">
                  <div
                    className="h-full bg-cobalt"
                    style={{ width: `${(activas.length / allProvincias.length) * 100}%` }}
                  />
                </div>
                <p className="mt-2.5 text-[13px] text-ink-muted tabular-nums">
                  {totalDeptosConfiables} departamentos Georef con datos confiables · {sinDatosCount}{' '}
                  jurisdicciones marcadas como sin datos.
                </p>
                <a
                  href="/cobertura"
                  className="mt-2.5 inline-flex items-center gap-1 text-[13px] font-medium text-cobalt hover:underline"
                >
                  <span>Ver indicador completo de cobertura</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* Lista interactiva de provincias con cadenas cargadas */}
              <div className="px-6 py-5">
                <p className="text-[13px] font-medium text-ink-muted">
                  Jurisdicciones con cadenas verificadas
                </p>
                <ul className="mt-3 divide-y divide-rule">
                  {activas.map((item) => {
                    const dom = item.dominante!;
                    const accent = categoryAccent(dom.categoria);
                    return (
                      <li key={item.provincia.provincia_id}>
                        <button
                          type="button"
                          onClick={() => onSelectProvincia(item.provincia.provincia_id)}
                          className="group flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left transition-colors duration-150 hover:text-cobalt"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center bg-stone-subtle text-ink transition-colors duration-150 group-hover:bg-[var(--hover-accent)] group-hover:text-white"
                              style={{ ['--hover-accent' as string]: accent }}
                            >
                              <ProductIcon iconId={dom.icono_id} size={15} />
                            </span>
                            <div>
                              <p className="text-[15px] font-medium text-ink group-hover:text-cobalt">
                                {item.provincia.nombre}
                              </p>
                              <p className="text-[13px] text-ink-muted tabular-nums">
                                {dom.nombre}
                                {item.secundarios.length > 0
                                  ? ` y ${item.secundarios.length} más`
                                  : ''}
                                {item.departamentosConfiables.length > 0
                                  ? ` · ${item.departamentosConfiables.length} depto${item.departamentosConfiables.length > 1 ? 's' : ''}`
                                  : ''}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-ink-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-cobalt" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div className="border-t border-rule px-6 py-3.5 text-[13px] text-ink-muted">
              Mapa bicontinental según Ley 26.651 · {geoManifest.organismo}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
