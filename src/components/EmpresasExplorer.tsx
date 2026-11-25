import { useMemo, useState } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { ArrowRight, Building2, ExternalLink, MapPin, Search, ShieldCheck, X } from 'lucide-react';
import type { Empresa, Planta, Producto } from '@/schemas';
import type { EmpresaConPlantas } from '@/data';
import { ProductIcon } from './ProductIcon';
import { getCategoryAccent } from './ArgentinaMapExplorer';

interface EmpresasExplorerProps {
  empresas: EmpresaConPlantas[];
  productos: Producto[];
}

const SPRING_TAB = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 34,
  mass: 0.85,
};

const CAPITAL_LABEL: Record<Empresa['tipo_capital'], string> = {
  nacional: 'Capital nacional',
  extranjero: 'Capital extranjero',
  mixto: 'Capital mixto',
  estatal: 'Capital estatal',
  sin_datos: 'Sin datos de capital',
};

const ESTADO_PLANTA_META: Record<
  Planta['estado_operativo'],
  { label: string; dotClass: string }
> = {
  operativa: { label: 'Operativa', dotClass: 'bg-emerald-react' },
  ampliacion: { label: 'En ampliación', dotClass: 'bg-cobalt' },
  en_construccion: { label: 'En construcción', dotClass: 'bg-ochre-metal' },
  inactiva: { label: 'Inactiva', dotClass: 'bg-signal-red' },
  sin_datos: { label: 'Sin datos', dotClass: 'bg-ink-muted' },
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function EmpresasExplorer({ empresas, productos }: EmpresasExplorerProps) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedCapital, setSelectedCapital] = useState<Empresa['tipo_capital'] | 'todos'>('todos');
  const [query, setQuery] = useState('');

  const availableCapitals = useMemo(() => {
    const set = new Set(empresas.map((e) => e.empresa.tipo_capital));
    return (['nacional', 'mixto', 'extranjero', 'estatal'] as const).filter((c) => set.has(c));
  }, [empresas]);

  const filtered = useMemo(() => {
    const q = normalizeText(query.trim());
    return empresas.filter((item) => {
      if (
        selectedProductId !== null &&
        !item.productos.some((p) => p.producto_id === selectedProductId)
      ) {
        return false;
      }
      if (selectedCapital !== 'todos' && item.empresa.tipo_capital !== selectedCapital) {
        return false;
      }
      if (q) {
        const haystack = normalizeText(
          [
            item.empresa.razon_social,
            item.empresa.hechos_verificables,
            ...item.plantas.map(
              (pl) =>
                `${pl.nombre} ${pl.localidad} ${pl.provincia.nombre} ${pl.departamento?.nombre ?? ''} ${pl.producto.nombre}`
            ),
          ].join(' ')
        );
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [empresas, selectedProductId, selectedCapital, query]);

  const totalPlantasFiltradas = useMemo(
    () => filtered.reduce((acc, item) => acc + item.plantas.length, 0),
    [filtered]
  );

  const hasFilters = selectedProductId !== null || selectedCapital !== 'todos' || query.trim() !== '';

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-6">
        {/* Barra editorial de filtros por cadena, capital y búsqueda */}
        <div className="space-y-4 border border-rule bg-stone-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div
              role="tablist"
              aria-label="Filtrar empresas por cadena productiva"
              className="flex max-w-full items-center overflow-x-auto bg-stone-subtle p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={selectedProductId === null}
                onClick={() => setSelectedProductId(null)}
                className={`relative shrink-0 cursor-pointer px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                  selectedProductId === null ? 'text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {selectedProductId === null && (
                  <motion.span
                    layoutId="emp-chain-filter"
                    transition={SPRING_TAB}
                    className="absolute inset-0 bg-ink"
                  />
                )}
                <span className="relative z-10">Todas las cadenas</span>
              </button>

              {productos.map((prod) => {
                const isActive = selectedProductId === prod.producto_id;
                const accent = getCategoryAccent(prod.categoria);
                return (
                  <button
                    key={prod.producto_id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() =>
                      setSelectedProductId((curr) =>
                        curr === prod.producto_id ? null : prod.producto_id
                      )
                    }
                    className={`relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                      isActive ? 'text-white' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="emp-chain-filter"
                        transition={SPRING_TAB}
                        style={{ backgroundColor: accent }}
                        className="absolute inset-0"
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-1.5">
                      <ProductIcon iconId={prod.icono_id} size={14} />
                      <span>{prod.nombre.split(' ')[0]}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar empresa, planta o localidad..."
                aria-label="Buscar empresa, planta o localidad"
                className="w-full border border-rule bg-stone-bg py-2 pl-9 pr-3 text-[14px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-3.5 text-[13px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-ink-muted">Origen del capital:</span>
              <button
                type="button"
                onClick={() => setSelectedCapital('todos')}
                className={`cursor-pointer border px-2.5 py-1 font-medium transition-colors duration-150 ${
                  selectedCapital === 'todos'
                    ? 'border-ink bg-ink text-white'
                    : 'border-rule bg-stone-bg text-ink hover:border-ink'
                }`}
              >
                Todos
              </button>
              {availableCapitals.map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setSelectedCapital((curr) => (curr === cap ? 'todos' : cap))}
                  className={`cursor-pointer border px-2.5 py-1 font-medium transition-colors duration-150 ${
                    selectedCapital === cap
                      ? 'border-ink bg-ink text-white'
                      : 'border-rule bg-stone-bg text-ink hover:border-ink'
                  }`}
                >
                  {CAPITAL_LABEL[cap].replace('Capital ', '')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 tabular-nums text-ink-muted">
              <span>
                Mostrando <strong className="font-semibold text-ink">{filtered.length}</strong> de{' '}
                {empresas.length} empresas ·{' '}
                <strong className="font-semibold text-ink">{totalPlantasFiltradas}</strong> plantas
              </span>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductId(null);
                    setSelectedCapital('todos');
                    setQuery('');
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 font-medium text-cobalt hover:underline"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de empresas con fichas auditables y sus plantas georreferenciadas */}
        {filtered.length > 0 ? (
          <div className="space-y-5">
            {filtered.map((item) => {
              const { empresa, plantas, productos: empProds, provincias: empProvs } = item;
              const primaryAccent = empProds[0]
                ? getCategoryAccent(empProds[0].categoria)
                : '#111214';

              return (
                <article
                  key={empresa.empresa_id}
                  id={empresa.empresa_id}
                  className="scroll-mt-24 border border-rule bg-stone-surface"
                >
                  <div className="h-[3px] w-full" style={{ backgroundColor: primaryAccent }} />

                  <div className="grid lg:grid-cols-12">
                    {/* Columna izquierda: identidad, hechos verificables y procedencia */}
                    <div className="flex flex-col justify-between p-6 lg:col-span-5 lg:border-r lg:border-rule">
                      <div>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h2 className="font-display text-[22px] font-bold leading-snug tracking-[-0.02em] text-ink">
                              {empresa.razon_social}
                            </h2>
                            <p className="mt-1 text-[13px] text-ink-muted">
                              {CAPITAL_LABEL[empresa.tipo_capital]} ·{' '}
                              {empProvs.map((p) => p.nombre).join(', ')}
                            </p>
                          </div>

                          {empresa.sitio_web_oficial && (
                            <a
                              href={empresa.sitio_web_oficial}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex shrink-0 items-center gap-1.5 border border-rule bg-stone-bg px-3 py-1.5 text-[13px] font-medium text-ink transition-colors duration-150 hover:border-ink hover:text-cobalt"
                            >
                              <span>Sitio oficial</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>

                        {/* Cadenas operadas */}
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {empProds.map((prod) => {
                            const accent = getCategoryAccent(prod.categoria);
                            return (
                              <a
                                key={prod.producto_id}
                                href={`/productos/${prod.producto_id}`}
                                className="inline-flex items-center gap-2 border border-rule bg-stone-bg px-2.5 py-1 text-[13px] font-medium text-ink transition-colors duration-150 hover:border-ink hover:text-cobalt"
                              >
                                <span
                                  className="flex h-5 w-5 items-center justify-center text-white"
                                  style={{ backgroundColor: accent }}
                                >
                                  <ProductIcon iconId={prod.icono_id} size={12} />
                                </span>
                                <span>{prod.nombre}</span>
                              </a>
                            );
                          })}
                        </div>

                        {/* Hechos verificables (sin facturación ni cuotas inventadas) */}
                        <div className="mt-5 border-t border-rule pt-4">
                          <p className="text-[13px] font-medium text-ink-muted">
                            Hechos verificables registrados
                          </p>
                          <p className="mt-1.5 text-[15px] leading-relaxed text-ink">
                            {empresa.hechos_verificables}
                          </p>
                        </div>
                      </div>

                      {/* Pie de procedencia auditable */}
                      <div className="mt-6 border-t border-rule pt-4 text-[13px] text-ink-muted">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-react">
                            <ShieldCheck className="h-4 w-4" />
                            <span>Confianza {empresa.procedencia.confianza}</span>
                          </span>
                          <span className="tabular-nums">
                            Año {empresa.procedencia.anio} · Descarga{' '}
                            {empresa.procedencia.fecha_descarga}
                          </span>
                        </div>
                        <p className="mt-1.5">
                          Fuente:{' '}
                          <a
                            href={empresa.procedencia.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-cobalt hover:underline"
                          >
                            {empresa.procedencia.fuente} ↗
                          </a>
                        </p>
                        <p className="mt-1">Cita: {empresa.procedencia.cita_ubicacion}</p>
                        <p className="mt-1 tabular-nums" title={empresa.procedencia.hash}>
                          Hash: <code className="bg-stone-subtle px-1 py-0.5 text-ink">{empresa.procedencia.hash.slice(0, 23)}...</code>
                        </p>
                      </div>
                    </div>

                    {/* Columna derecha: tabla/lista de plantas georreferenciadas */}
                    <div className="p-6 lg:col-span-7">
                      <div className="flex items-center justify-between gap-2 border-b border-rule pb-3">
                        <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                          <Building2 className="h-4 w-4 text-ink-muted" />
                          <span>Plantas e instalaciones verificadas ({plantas.length})</span>
                        </div>
                        <span className="text-[13px] text-ink-muted">
                          Click en ubicación para ver modelo 3D en mapa
                        </span>
                      </div>

                      <div className="mt-4 divide-y divide-rule">
                        {plantas.map((pl) => {
                          const estadoMeta = ESTADO_PLANTA_META[pl.estado_operativo];
                          const mapHref = pl.departamento
                            ? `/?provincia=${pl.provincia.provincia_id}&departamento=${pl.departamento.departamento_id}#mapa`
                            : `/?provincia=${pl.provincia.provincia_id}#mapa`;

                          return (
                            <div key={pl.planta_id} className="py-4 first:pt-0 last:pb-0">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <h3 className="text-[16px] font-semibold text-ink">{pl.nombre}</h3>
                                  <p className="mt-1 text-[13px] text-ink-muted tabular-nums">
                                    {pl.localidad}
                                    {pl.departamento ? `, Depto. ${pl.departamento.nombre}` : ''},{' '}
                                    {pl.provincia.nombre} ({pl.lat.toFixed(3)}, {pl.lon.toFixed(3)})
                                  </p>
                                </div>

                                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink">
                                  <span className={`h-2 w-2 rounded-full ${estadoMeta.dotClass}`} />
                                  <span>{estadoMeta.label}</span>
                                </span>
                              </div>

                              <dl className="mt-3 grid gap-3 bg-stone-bg p-3.5 text-[13px] sm:grid-cols-3 tabular-nums">
                                <div>
                                  <dt className="text-ink-muted">Cadena / producto</dt>
                                  <dd className="mt-0.5 font-medium text-ink">
                                    {pl.producto.nombre}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-ink-muted">Capacidad declarada</dt>
                                  <dd
                                    className={`mt-0.5 font-semibold ${
                                      pl.capacidad.estado === 'dato'
                                        ? 'text-cobalt'
                                        : 'text-ink-muted'
                                    }`}
                                  >
                                    {pl.capacidad.estado === 'dato'
                                      ? `${pl.capacidad.valor.toLocaleString('es-AR')} ${pl.capacidad.unidad}`
                                      : 'Sin datos'}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-ink-muted">Año y verificación</dt>
                                  <dd className="mt-0.5 font-medium text-ink">
                                    {pl.procedencia.anio} · Confianza {pl.procedencia.confianza}
                                  </dd>
                                </div>
                              </dl>

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[13px]">
                                <span className="text-ink-muted">
                                  Cita: {pl.procedencia.cita_ubicacion}
                                </span>
                                <div className="flex items-center gap-4">
                                  <a
                                    href={mapHref}
                                    className="inline-flex items-center gap-1 font-medium text-ink transition-colors duration-150 hover:text-cobalt"
                                  >
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span>Ver en mapa</span>
                                  </a>
                                  <a
                                    href={`/productos/${pl.producto.producto_id}#diagrama`}
                                    className="inline-flex items-center gap-1 font-medium text-cobalt hover:underline"
                                  >
                                    <span>Proceso</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="border border-rule bg-stone-surface px-6 py-12 text-center">
            <p className="text-[16px] font-medium text-ink">
              No hay empresas que coincidan con los filtros seleccionados.
            </p>
            <p className="mt-1.5 text-[14px] text-ink-muted">
              Solo mostramos empresas con plantas verificadas en fuentes oficiales o memorias
              auditadas.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedProductId(null);
                setSelectedCapital('todos');
                setQuery('');
              }}
              className="mt-4 cursor-pointer bg-ink px-4 py-2 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-cobalt"
            >
              Ver todas las empresas ({empresas.length})
            </button>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
