import { useMemo, useState } from 'react';
import { ArrowRight, Check, GitBranch, Layers, Plus } from 'lucide-react';
import type { CadenaValorTransversalData, ComparadorProductoItem, TroncoCadenaValor } from '@/data';
import { ProductIcon } from './ProductIcon';

interface ValueChainFlowMapProps {
  data: CadenaValorTransversalData;
  selectedProductIds: string[];
  onCompareProducts: (productoIds: string[]) => void;
  onToggleProductInComparator: (productoId: string) => void;
}

const ACCENT_BAR: Record<TroncoCadenaValor['acento'], string> = {
  cobalt: 'bg-cobalt',
  emerald: 'bg-emerald-react',
  ochre: 'bg-ochre',
  red: 'bg-signal-red',
};

const ACCENT_TEXT: Record<TroncoCadenaValor['acento'], string> = {
  cobalt: 'text-cobalt',
  emerald: 'text-emerald-react',
  ochre: 'text-ochre',
  red: 'text-signal-red',
};

function formatComexResumen(item: ComparadorProductoItem): { label: string; value: string; positive: boolean | null } {
  const comex = item.ultimoComexUsd;
  if (!comex) return { label: 'Saldo comercial', value: 'Sin datos', positive: null };
  if (comex.saldo_comercial.estado === 'dato') {
    const v = comex.saldo_comercial.valor;
    return {
      label: `Saldo USD (${comex.anio})`,
      value: `${v >= 0 ? '+' : ''}USD ${v.toLocaleString('es-AR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} M`,
      positive: v >= 0,
    };
  }
  if (comex.exportacion.estado === 'dato') {
    return {
      label: `Exportación (${comex.anio})`,
      value: `USD ${comex.exportacion.valor.toLocaleString('es-AR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} M`,
      positive: true,
    };
  }
  if (comex.importacion.estado === 'dato') {
    return {
      label: `Importación (${comex.anio})`,
      value: `USD ${comex.importacion.valor.toLocaleString('es-AR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} M`,
      positive: false,
    };
  }
  return { label: `Comercio exterior (${comex.anio})`, value: 'Sin datos', positive: null };
}

function formatProduccionCorta(item: ComparadorProductoItem): string {
  const prod = item.ultimoProduccion;
  if (!prod || prod.medicion.estado === 'sin_datos') return 'Sin datos';
  const v = prod.medicion.valor;
  if (v >= 1_000_000) {
    return `${(v / 1_000_000).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Mt (${prod.anio})`;
  }
  return `${Math.round(v).toLocaleString('es-AR')} t (${prod.anio})`;
}

export function ValueChainFlowMap({
  data,
  selectedProductIds,
  onCompareProducts,
  onToggleProductInComparator,
}: ValueChainFlowMapProps) {
  const [activeTroncoId, setActiveTroncoId] = useState<string>('todos');

  const productMap = useMemo(
    () => new Map(data.productos.map((p) => [p.producto.producto_id, p])),
    [data.productos]
  );

  const visibleTroncos = useMemo(
    () =>
      activeTroncoId === 'todos'
        ? data.troncos
        : data.troncos.filter((t) => t.troncoId === activeTroncoId),
    [data.troncos, activeTroncoId]
  );

  return (
    <div className="space-y-6">
      {/* Filtro editorial de troncos productivos */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por tronco de insumos">
          <button
            type="button"
            onClick={() => setActiveTroncoId('todos')}
            className={`cursor-pointer border px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
              activeTroncoId === 'todos'
                ? 'border-ink bg-ink text-white'
                : 'border-rule bg-stone-surface text-ink-muted hover:border-ink hover:text-ink'
            }`}
          >
            Todos los troncos ({data.troncos.length})
          </button>
          {data.troncos.map((tronco) => {
            const active = activeTroncoId === tronco.troncoId;
            return (
              <button
                key={tronco.troncoId}
                type="button"
                onClick={() => setActiveTroncoId(tronco.troncoId)}
                className={`cursor-pointer border px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                  active
                    ? 'border-ink bg-ink text-white'
                    : 'border-rule bg-stone-surface text-ink-muted hover:border-ink hover:text-ink'
                }`}
              >
                {tronco.titulo.replace('Tronco ', '')}
              </button>
            );
          })}
        </div>

        <p className="text-[13px] text-ink-muted">
          Materia prima, transformación química y encadenamientos verificados
        </p>
      </div>

      {/* Láminas de troncos transversales: 3 columnas conectadas por flujo direccional */}
      <div className="space-y-6">
        {visibleTroncos.map((tronco) => {
          const isMultiChain = tronco.productoIds.length >= 2;
          const hasDownstreamLink = tronco.vinculos.some(
            (v) => v.tipo === 'encadenamiento_aguas_abajo'
          );

          return (
            <article
              key={tronco.troncoId}
              className="border border-rule bg-stone-surface"
            >
              {/* Encabezado del tronco */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule bg-stone-bg px-5 py-4">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 shrink-0 ${ACCENT_BAR[tronco.acento]}`} />
                    <h3 className="font-display text-[17px] font-medium leading-snug tracking-[-0.015em] text-ink">
                      {tronco.titulo}
                    </h3>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                    {tronco.resumen}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isMultiChain && (
                    <button
                      type="button"
                      onClick={() => onCompareProducts(tronco.productoIds)}
                      className="inline-flex cursor-pointer items-center gap-1.5 bg-ink px-3 py-1.5 text-[12px] font-medium text-white transition-colors duration-150 hover:bg-cobalt"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>Comparar este tronco ({tronco.productoIds.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Cuerpo de 3 etapas: Insumo base -> Flujo químico -> Cadenas y derivados */}
              <div className="grid divide-y divide-rule lg:grid-cols-12 lg:divide-x lg:divide-y-0">
                {/* Columna 1: Materia prima e infraestructura */}
                <div className="flex flex-col justify-between bg-stone-surface p-5 lg:col-span-3">
                  <div>
                    <p className="text-[12px] font-medium text-ink-muted">1. Insumo primario</p>
                    <p className="mt-1.5 text-[14px] font-medium leading-snug text-ink">
                      {tronco.insumoBase}
                    </p>
                    <p className={`mt-2 text-[13px] font-medium tabular-nums ${ACCENT_TEXT[tronco.acento]}`}>
                      {tronco.formulaInsumo}
                    </p>
                  </div>

                  <div className="mt-5 border-t border-rule pt-3 text-[12px] text-ink-muted">
                    <p className="font-medium text-ink">Nodo territorial</p>
                    <p className="mt-0.5">{tronco.regionClave}</p>
                    {hasDownstreamLink && (
                      <p className="mt-2 inline-flex items-center gap-1 font-medium text-ochre">
                        <GitBranch className="h-3.5 w-3.5" />
                        <span>Encadenamiento vertical directo</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Columna 2 y 3: Rutas y productos conectados */}
                <div className="divide-y divide-rule lg:col-span-9">
                  {tronco.vinculos.map((link) => {
                    const item = productMap.get(link.haciaProductoId);
                    if (!item) return null;
                    const comex = formatComexResumen(item);
                    const isSelected = selectedProductIds.includes(item.producto.producto_id);
                    const isDownstream = link.tipo === 'encadenamiento_aguas_abajo';

                    return (
                      <div
                        key={link.id}
                        className="grid gap-4 p-5 md:grid-cols-12 md:items-center"
                      >
                        {/* Flecha y transformación química */}
                        <div className="md:col-span-5">
                          <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink-muted">
                            {isDownstream ? (
                              <>
                                <GitBranch className="h-3.5 w-3.5 text-ochre" />
                                <span className="text-ochre">Aguas abajo desde {link.desdeProductoId}</span>
                              </>
                            ) : (
                              <span>2. Transformación química</span>
                            )}
                          </div>
                          <p className="mt-1 text-[13px] font-medium text-ink">
                            {link.desdeEtiqueta}
                          </p>
                          <div className="mt-2 flex items-start gap-2 border-l-2 border-rule-strong/30 pl-3 text-[12px] leading-snug text-ink-muted">
                            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink" />
                            <span>{link.flujoQuimico}</span>
                          </div>
                          <p className="mt-1.5 text-[12px] text-ink-muted">
                            {link.nodoTerritorial}
                          </p>
                        </div>

                        {/* Tarjeta del producto final verificado */}
                        <div className="border border-rule bg-stone-bg p-4 md:col-span-7">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-rule bg-stone-surface text-ink">
                                <ProductIcon iconId={item.producto.icono_id} size={17} />
                              </span>
                              <div>
                                <a
                                  href={`/productos/${item.producto.producto_id}`}
                                  className="font-display text-[15px] font-medium leading-tight tracking-[-0.015em] text-ink hover:text-cobalt"
                                >
                                  {item.producto.nombre}
                                </a>
                                <p className="mt-0.5 text-[12px] text-ink-muted tabular-nums">
                                  {item.producto.formula_quimica
                                    ? `${item.producto.formula_quimica} · `
                                    : ''}
                                  {item.plantasCount}{' '}
                                  {item.plantasCount === 1 ? 'planta' : 'plantas'} ·{' '}
                                  {item.provincias.map((p) => p.nombre).join(', ')}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onToggleProductInComparator(item.producto.producto_id)}
                                className={`inline-flex cursor-pointer items-center gap-1 border px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 ${
                                  isSelected
                                    ? 'border-cobalt bg-cobalt text-white'
                                    : 'border-rule bg-stone-surface text-ink hover:border-ink'
                                }`}
                              >
                                {isSelected ? (
                                  <>
                                    <Check className="h-3 w-3" />
                                    <span>En comparador</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="h-3 w-3" />
                                    <span>Comparar</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <dl className="mt-3 grid gap-3 border-t border-rule pt-3 text-[12px] sm:grid-cols-3 tabular-nums">
                            <div>
                              <dt className="text-ink-muted">Producción</dt>
                              <dd className="mt-0.5 font-medium text-ink">
                                {formatProduccionCorta(item)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-ink-muted">{comex.label}</dt>
                              <dd
                                className={`mt-0.5 font-medium ${
                                  comex.positive === true
                                    ? 'text-emerald-react'
                                    : comex.positive === false
                                      ? 'text-signal-red'
                                      : 'text-ink-muted'
                                }`}
                              >
                                {comex.value}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-ink-muted">Energía específica</dt>
                              <dd className="mt-0.5 font-medium text-ink">
                                {item.proceso?.energia_especifica.estado === 'dato'
                                  ? `${item.proceso.energia_especifica.valor.toLocaleString('es-AR', {
                                      maximumFractionDigits: 2,
                                    })} ${item.proceso.energia_especifica.unidad}`
                                  : 'Sin datos'}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
