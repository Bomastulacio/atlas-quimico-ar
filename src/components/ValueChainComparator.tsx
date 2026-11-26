import { useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Globe, Lock, MapPin, RefreshCw, Scale } from 'lucide-react';
import type {
  CadenaValorTransversalData,
  ComparadorEmpresaResumen,
  ComparadorProductoItem,
  ComparadorProvinciaItem,
} from '@/data';
import {
  computeValuationArsUsd,
  formatMarketCap,
  type DolarSelector,
  type MercadoSnapshot,
  type TipoCambioRegistro,
} from '@/schemas';
import { useLiveMarket } from '@/lib/useLiveMarket';
import { ProductIcon } from './ProductIcon';
import { ValueChainFlowMap } from './ValueChainFlowMap';

interface ValueChainComparatorProps {
  productos: ComparadorProductoItem[];
  provincias: ComparadorProvinciaItem[];
  cadenaValor: CadenaValorTransversalData;
  mercadoSnapshot: MercadoSnapshot;
}

type CompareMode = 'productos' | 'provincias';

const CATEGORIA_LABEL: Record<string, string> = {
  metalurgia: 'Metalurgia',
  mineria_quimica: 'Minería química',
  fertilizantes: 'Fertilizantes',
  agroindustria: 'Agroindustria',
  petroquimica: 'Petroquímica',
  bioenergia: 'Bioenergía',
};

const COBERTURA_LABEL: Record<string, string> = {
  completa: 'Cobertura completa',
  parcial: 'Cobertura parcial',
  baja: 'Cobertura baja',
  sin_datos: 'Sin datos cargados',
};

const DOLAR_LABELS: Record<DolarSelector, string> = {
  contadoconliqui: 'CCL',
  bolsa: 'MEP',
  oficial: 'Oficial',
};

const PRODUCT_PRESETS: Array<{ label: string; ids: string[] }> = [
  { label: 'Aluminio vs Litio vs Soja', ids: ['aluminio', 'litio', 'soja'] },
  { label: 'Polo Bahía Blanca (Urea vs Petroquímica)', ids: ['urea', 'petroquimica'] },
  { label: 'Up-River (Soja vs Biodiésel)', ids: ['soja', 'biodiesel'] },
  { label: 'Electrointensiva vs Gas (Aluminio vs Urea)', ids: ['aluminio', 'urea'] },
];

const PROVINCE_PRESETS: Array<{ label: string; ids: string[] }> = [
  { label: 'Polos industriales (Chubut, Buenos Aires, Santa Fe)', ids: ['26', '06', '82'] },
  { label: 'Triángulo del Litio (Jujuy, Catamarca, Salta)', ids: ['38', '10', '66'] },
  { label: 'NEA vs Patagonia (Chaco vs Chubut)', ids: ['22', '26'] },
];

function formatProduccionValue(item: ComparadorProductoItem): {
  principal: string;
  detalle: string;
} {
  const reg = item.ultimoProduccion;
  if (!reg) return { principal: 'Sin datos', detalle: 'Sin serie cargada' };
  if (reg.medicion.estado === 'sin_datos') {
    return {
      principal: 'Sin datos',
      detalle: `Declarado sin cifra pública (${reg.anio})`,
    };
  }
  const v = reg.medicion.valor;
  const formatted =
    v >= 1_000_000
      ? `${(v / 1_000_000).toLocaleString('es-AR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} Mt`
      : `${Math.round(v).toLocaleString('es-AR')} ${reg.medicion.unidad}`;

  return {
    principal: formatted,
    detalle: `${reg.anio} · ${reg.procedencia.fuente.slice(0, 56)}${
      reg.procedencia.fuente.length > 56 ? '...' : ''
    }`,
  };
}

function formatUsdMillion(val: number): string {
  return `USD ${val.toLocaleString('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} M`;
}

function renderMarketList(
  empresas: ComparadorEmpresaResumen[],
  tiposCambio: TipoCambioRegistro[],
  dolarCasa: DolarSelector
) {
  if (empresas.length === 0) {
    return <p className="text-[13px] text-ink-muted">Sin empresas registradas</p>;
  }

  return (
    <div className="space-y-2.5">
      {empresas.map((emp) => {
        const m = emp.mercado;
        if (!m || m.tipo_cotizacion === 'no_cotiza') {
          return (
            <div key={emp.empresa_id} className="border-t border-rule pt-2 first:border-t-0 first:pt-0">
              <p className="text-[13px] font-medium text-ink">{emp.razon_social}</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-ink-muted">
                <Lock className="h-3 w-3 shrink-0" />
                <span>No cotiza en bolsa</span>
              </p>
            </div>
          );
        }

        const val = computeValuationArsUsd(m, tiposCambio, dolarCasa);
        const isGlobal = m.tipo_cotizacion === 'matriz_global';

        return (
          <div key={emp.empresa_id} className="border-t border-rule pt-2 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <p className="text-[13px] font-medium text-ink">{emp.razon_social}</p>
              {m.bolsa && m.ticker && (
                <span className="text-[11px] font-medium text-ink-muted tabular-nums">
                  {m.bolsa} · {m.ticker}
                </span>
              )}
            </div>
            {isGlobal && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-ink-muted">
                <Globe className="h-3 w-3 shrink-0" />
                <span>Matriz global ({m.entidad_cotizante})</span>
              </p>
            )}
            {val ? (
              <div className="mt-1 space-y-0.5 text-[12px] tabular-nums">
                <p className="font-medium text-cobalt">
                  {formatMarketCap(val.marketCapUsd, 'USD')} ({DOLAR_LABELS[dolarCasa]})
                </p>
                <p className="text-ink-muted">{formatMarketCap(val.marketCapArs, 'ARS')}</p>
              </div>
            ) : (
              <p className="mt-0.5 text-[12px] text-ink-muted">Sin datos de capitalización</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ValueChainComparator({
  productos,
  provincias,
  cadenaValor,
  mercadoSnapshot,
}: ValueChainComparatorProps) {
  const [mode, setMode] = useState<CompareMode>('productos');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([
    'aluminio',
    'litio',
    'soja',
  ]);
  const [selectedProvinceIds, setSelectedProvinceIds] = useState<string[]>(['26', '06', '82']);

  const comparatorSectionRef = useRef<HTMLDivElement | null>(null);
  const {
    dolarCasa,
    setDolarCasa,
    tiposCambio,
    empresasMercado,
    mode: marketMode,
    isRefreshing,
    lastUpdatedIso,
    refreshNow,
  } = useLiveMarket(mercadoSnapshot);
  const activeTc = tiposCambio.find((tc) => tc.casa === dolarCasa) ?? tiposCambio[0];

  // Actualizar datos de mercado en vivo dentro de cada producto/provincia
  const liveMercadoByEmp = useMemo(
    () => new Map(empresasMercado.map((m) => [m.empresa_id, m])),
    [empresasMercado]
  );

  const productosWithLiveMarket = useMemo(
    () =>
      productos.map((item) => ({
        ...item,
        empresas: item.empresas.map((e) => ({
          ...e,
          mercado: liveMercadoByEmp.get(e.empresa_id) ?? e.mercado,
        })),
      })),
    [productos, liveMercadoByEmp]
  );

  const provinciasWithLiveMarket = useMemo(
    () =>
      provincias.map((item) => ({
        ...item,
        empresas: item.empresas.map((e) => ({
          ...e,
          mercado: liveMercadoByEmp.get(e.empresa_id) ?? e.mercado,
        })),
      })),
    [provincias, liveMercadoByEmp]
  );

  const selectedProducts = useMemo(
    () =>
      selectedProductIds
        .map((id) => productosWithLiveMarket.find((p) => p.producto.producto_id === id))
        .filter((p): p is ComparadorProductoItem => Boolean(p)),
    [selectedProductIds, productosWithLiveMarket]
  );

  const selectedProvinces = useMemo(
    () =>
      selectedProvinceIds
        .map((id) => provinciasWithLiveMarket.find((p) => p.provincia.provincia_id === id))
        .filter((p): p is ComparadorProvinciaItem => Boolean(p)),
    [selectedProvinceIds, provinciasWithLiveMarket]
  );

  // Escala máxima de comercio exterior USD entre los productos seleccionados para barras proporcionales
  const maxComexScaleUsd = useMemo(() => {
    let maxVal = 1;
    for (const p of selectedProducts) {
      const c = p.ultimoComexUsd;
      if (!c) continue;
      if (c.exportacion.estado === 'dato') maxVal = Math.max(maxVal, Math.abs(c.exportacion.valor));
      if (c.importacion.estado === 'dato') maxVal = Math.max(maxVal, Math.abs(c.importacion.valor));
      if (c.saldo_comercial.estado === 'dato')
        maxVal = Math.max(maxVal, Math.abs(c.saldo_comercial.valor));
    }
    return maxVal;
  }, [selectedProducts]);

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev; // mantener mínimo 2 para comparar
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const toggleProvince = (id: string) => {
    setSelectedProvinceIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev;
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const handleCompareTronco = (ids: string[]) => {
    if (ids.length >= 2) {
      setMode('productos');
      setSelectedProductIds(ids.slice(0, 3));
      comparatorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const colGridClass =
    (mode === 'productos' ? selectedProducts.length : selectedProvinces.length) === 2
      ? 'md:grid-cols-2'
      : 'md:grid-cols-3';

  return (
    <div className="space-y-16">
      {/* BLOQUE 1: Comparador lado a lado (Productos o Provincias) */}
      <section ref={comparatorSectionRef} id="comparador" className="scroll-mt-24 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-5">
          <div className="max-w-2xl">
            <h2 className="font-display text-[22px] font-medium leading-tight tracking-[-0.02em] text-ink sm:text-[26px]">
              Comparador lado a lado
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
              Elegí entre 2 y 3 cadenas industriales o provincias para contrastar producción,
              comercio exterior en USD, energía específica, plantas verificadas y valuación bursátil.
            </p>
          </div>

          {/* Selector de modo: Productos vs Provincias */}
          <div className="inline-flex border border-rule bg-stone-surface p-1 text-[13px]">
            <button
              type="button"
              onClick={() => setMode('productos')}
              className={`inline-flex cursor-pointer items-center gap-1.5 px-3.5 py-1.5 font-medium transition-colors duration-150 ${
                mode === 'productos' ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              <span>Comparar productos</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('provincias')}
              className={`inline-flex cursor-pointer items-center gap-1.5 px-3.5 py-1.5 font-medium transition-colors duration-150 ${
                mode === 'provincias' ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>Comparar provincias</span>
            </button>
          </div>
        </div>

        {/* Barra compacta de selector de dólar para la fila de valuación bursátil */}
        <div className="flex flex-wrap items-center justify-between gap-3 border border-rule bg-stone-surface px-4 py-3 text-[12px]">
          <div className="flex flex-wrap items-center gap-3 tabular-nums">
            <span className="font-medium text-ink">Conversión bursátil ARS / USD:</span>
            <div className="inline-flex border border-rule bg-stone-bg">
              {(['contadoconliqui', 'bolsa', 'oficial'] as DolarSelector[]).map((casa) => {
                const tc = tiposCambio.find((item) => item.casa === casa);
                const active = dolarCasa === casa;
                return (
                  <button
                    key={casa}
                    type="button"
                    onClick={() => setDolarCasa(casa)}
                    className={`cursor-pointer px-2.5 py-1 font-medium transition-colors duration-150 ${
                      active ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {DOLAR_LABELS[casa]}
                    {tc ? ` $${Math.round(tc.venta).toLocaleString('es-AR')}` : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 text-ink-muted">
            <span>
              {marketMode === 'live_edge'
                ? 'Bolsa y dólar en vivo (Supabase)'
                : marketMode === 'live_dolarapi'
                  ? 'Dólar en vivo (DolarApi)'
                  : `Snapshot ${(activeTc?.fecha_actualizacion ?? lastUpdatedIso).slice(0, 10)}`}
            </span>
            <button
              type="button"
              onClick={() => void refreshNow()}
              disabled={isRefreshing}
              className="inline-flex cursor-pointer items-center gap-1 border border-rule bg-stone-bg px-2.5 py-1 font-medium text-ink transition-colors duration-150 hover:border-ink disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Actualizando' : 'Actualizar'}</span>
            </button>
          </div>
        </div>

        {/* Controles de selección según modo */}
        {mode === 'productos' ? (
          <div className="space-y-3 border border-rule bg-stone-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
              <span className="font-medium text-ink">
                Cadenas seleccionadas ({selectedProductIds.length} de 3 máx., mínimo 2)
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {PRODUCT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setSelectedProductIds(preset.ids)}
                    className="cursor-pointer border border-rule bg-stone-bg px-2.5 py-1 text-[12px] text-ink-muted transition-colors duration-150 hover:border-ink hover:text-ink"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {productosWithLiveMarket.map((item) => {
                const active = selectedProductIds.includes(item.producto.producto_id);
                return (
                  <button
                    key={item.producto.producto_id}
                    type="button"
                    onClick={() => toggleProduct(item.producto.producto_id)}
                    aria-pressed={active}
                    className={`inline-flex cursor-pointer items-center gap-2 border px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                      active
                        ? 'border-ink bg-ink text-white'
                        : 'border-rule bg-stone-bg text-ink hover:border-ink'
                    }`}
                  >
                    <ProductIcon iconId={item.producto.icono_id} size={15} />
                    <span>{item.producto.nombre}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3 border border-rule bg-stone-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
              <span className="font-medium text-ink">
                Provincias seleccionadas ({selectedProvinceIds.length} de 3 máx., mínimo 2)
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {PROVINCE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setSelectedProvinceIds(preset.ids)}
                    className="cursor-pointer border border-rule bg-stone-bg px-2.5 py-1 text-[12px] text-ink-muted transition-colors duration-150 hover:border-ink hover:text-ink"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <div>
                <p className="mb-1.5 text-[12px] text-ink-muted">
                  Con cobertura completa verificada (7)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {provinciasWithLiveMarket
                    .filter((p) => p.provincia.cobertura_datos !== 'sin_datos')
                    .map((item) => {
                      const active = selectedProvinceIds.includes(item.provincia.provincia_id);
                      return (
                        <button
                          key={item.provincia.provincia_id}
                          type="button"
                          onClick={() => toggleProvince(item.provincia.provincia_id)}
                          aria-pressed={active}
                          className={`cursor-pointer border px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                            active
                              ? 'border-ink bg-ink text-white'
                              : 'border-rule bg-stone-bg text-ink hover:border-ink'
                          }`}
                        >
                          {item.provincia.nombre}
                        </button>
                      );
                    })}
                </div>
              </div>

              <details className="text-[12px]">
                <summary className="cursor-pointer font-medium text-ink-muted hover:text-ink">
                  También podés incluir jurisdicciones sin datos cargados (17)
                </summary>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {provinciasWithLiveMarket
                    .filter((p) => p.provincia.cobertura_datos === 'sin_datos')
                    .map((item) => {
                      const active = selectedProvinceIds.includes(item.provincia.provincia_id);
                      return (
                        <button
                          key={item.provincia.provincia_id}
                          type="button"
                          onClick={() => toggleProvince(item.provincia.provincia_id)}
                          aria-pressed={active}
                          className={`cursor-pointer border px-2.5 py-1 text-[12px] transition-colors duration-150 ${
                            active
                              ? 'border-ink bg-ink font-medium text-white'
                              : 'border-rule bg-stone-bg text-ink-muted hover:border-ink hover:text-ink'
                          }`}
                        >
                          {item.provincia.nombre}
                        </button>
                      );
                    })}
                </div>
              </details>
            </div>
          </div>
        )}

        {/* Matriz comparativa: MODO PRODUCTOS */}
        {mode === 'productos' && (
          <div className={`grid gap-5 ${colGridClass}`}>
            {selectedProducts.map((item) => {
              const prod = formatProduccionValue(item);
              const comex = item.ultimoComexUsd;
              const expVal =
                comex && comex.exportacion.estado === 'dato' ? comex.exportacion.valor : null;
              const impVal =
                comex && comex.importacion.estado === 'dato' ? comex.importacion.valor : null;
              const saldoVal =
                comex && comex.saldo_comercial.estado === 'dato'
                  ? comex.saldo_comercial.valor
                  : null;

              return (
                <article
                  key={item.producto.producto_id}
                  className="flex flex-col border border-rule bg-stone-surface"
                >
                  {/* Cabecera de la tarjeta */}
                  <div className="border-b border-rule bg-stone-bg p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-rule bg-stone-surface text-ink">
                          <ProductIcon iconId={item.producto.icono_id} size={18} />
                        </span>
                        <div>
                          <h3 className="font-display text-[17px] font-medium leading-tight tracking-[-0.015em] text-ink">
                            {item.producto.nombre}
                          </h3>
                          <p className="mt-0.5 text-[12px] text-ink-muted">
                            {CATEGORIA_LABEL[item.producto.categoria] ?? item.producto.categoria}
                            {item.producto.formula_quimica
                              ? ` · ${item.producto.formula_quimica}`
                              : ''}
                          </p>
                        </div>
                      </div>
                      <a
                        href={`/productos/${item.producto.producto_id}`}
                        className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-cobalt hover:underline"
                      >
                        <span>Ficha</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Filas de métricas alineadas */}
                  <div className="flex-1 divide-y divide-rule text-[13px]">
                    {/* Producción */}
                    <div className="p-4 tabular-nums">
                      <p className="text-[12px] text-ink-muted">Producción registrada</p>
                      <p className="mt-1 font-display text-[19px] font-medium leading-tight tracking-[-0.02em] text-ink">
                        {prod.principal}
                      </p>
                      <p className="mt-1 text-[12px] text-ink-muted">{prod.detalle}</p>
                    </div>

                    {/* Comercio exterior en USD con barras proporcionales */}
                    <div className="p-4 tabular-nums">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[12px] text-ink-muted">
                          Comercio exterior{comex ? ` (${comex.anio} · NCM ${comex.ncm_codigo})` : ''}
                        </p>
                      </div>

                      {comex ? (
                        <div className="mt-2.5 space-y-2">
                          <div>
                            <div className="flex justify-between text-[12px]">
                              <span className="text-ink-muted">Exportación</span>
                              <span className="font-medium text-ink">
                                {expVal !== null ? formatUsdMillion(expVal) : 'Sin datos'}
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 w-full bg-stone-subtle">
                              {expVal !== null && (
                                <div
                                  className="h-full bg-emerald-react"
                                  style={{
                                    width: `${Math.max(3, (Math.abs(expVal) / maxComexScaleUsd) * 100)}%`,
                                  }}
                                />
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[12px]">
                              <span className="text-ink-muted">Importación</span>
                              <span className="font-medium text-ink">
                                {impVal !== null ? formatUsdMillion(impVal) : 'Sin datos'}
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 w-full bg-stone-subtle">
                              {impVal !== null && (
                                <div
                                  className="h-full bg-signal-red"
                                  style={{
                                    width: `${Math.max(3, (Math.abs(impVal) / maxComexScaleUsd) * 100)}%`,
                                  }}
                                />
                              )}
                            </div>
                          </div>

                          <div className="flex items-baseline justify-between border-t border-rule pt-2 text-[13px]">
                            <span className="text-ink-muted">Saldo comercial</span>
                            <span
                              className={`font-medium ${
                                saldoVal === null
                                  ? 'text-ink-muted'
                                  : saldoVal >= 0
                                    ? 'text-emerald-react'
                                    : 'text-signal-red'
                              }`}
                            >
                              {saldoVal !== null
                                ? `${saldoVal >= 0 ? '+' : ''}${formatUsdMillion(saldoVal)}`
                                : 'Sin datos'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-ink-muted">Sin datos</p>
                      )}
                    </div>

                    {/* Energía específica y proceso */}
                    <div className="p-4">
                      <p className="text-[12px] text-ink-muted">Energía específica del proceso</p>
                      <p className="mt-1 font-medium text-ink tabular-nums">
                        {item.proceso?.energia_especifica.estado === 'dato'
                          ? `${item.proceso.energia_especifica.valor.toLocaleString('es-AR', {
                              maximumFractionDigits: 2,
                            })} ${item.proceso.energia_especifica.unidad}`
                          : 'Sin datos'}
                      </p>
                      {item.proceso?.reaccion_global && (
                        <p className="mt-2 border-l-2 border-cobalt/40 pl-2.5 text-[12px] text-ink tabular-nums">
                          {item.proceso.reaccion_global}
                        </p>
                      )}
                      {item.proceso && (
                        <p className="mt-1.5 text-[12px] text-ink-muted">
                          {item.proceso.pasosCount} pasos modelados
                        </p>
                      )}
                    </div>

                    {/* Territorio y plantas */}
                    <div className="p-4">
                      <p className="text-[12px] text-ink-muted">Territorio y plantas</p>
                      <p className="mt-1 font-medium text-ink">
                        {item.provincias.map((p) => p.nombre).join(', ') || 'Sin datos'}
                      </p>
                      <p className="mt-1 text-[12px] text-ink-muted tabular-nums">
                        {item.plantasCount} {item.plantasCount === 1 ? 'planta' : 'plantas'}{' '}
                        georreferenciadas ({item.plantasConCapacidad} con capacidad pública)
                      </p>
                      {item.departamentos.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.departamentos.map((d) => (
                            <a
                              key={d.departamento_id}
                              href={`/?provincia=${d.provincia_id}&departamento=${d.departamento_id}#mapa`}
                              className="border border-rule bg-stone-bg px-2 py-0.5 text-[12px] text-ink transition-colors duration-150 hover:border-cobalt hover:text-cobalt"
                            >
                              {d.nombre}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Empresas y valuación bursátil en vivo */}
                    <div className="p-4">
                      <p className="mb-2 text-[12px] text-ink-muted">
                        Empresas operadoras y valuación bursátil
                      </p>
                      {renderMarketList(item.empresas, tiposCambio, dolarCasa)}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Matriz comparativa: MODO PROVINCIAS */}
        {mode === 'provincias' && (
          <div className={`grid gap-5 ${colGridClass}`}>
            {selectedProvinces.map((item) => {
              const allChains = item.dominante
                ? [item.dominante, ...item.secundarios]
                : [];
              const hasData = item.provincia.cobertura_datos !== 'sin_datos';

              return (
                <article
                  key={item.provincia.provincia_id}
                  className="flex flex-col border border-rule bg-stone-surface"
                >
                  {/* Cabecera provincial */}
                  <div className="border-b border-rule bg-stone-bg p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-[17px] font-medium leading-tight tracking-[-0.015em] text-ink">
                          {item.provincia.nombre}
                        </h3>
                        <p className="mt-0.5 text-[12px] text-ink-muted tabular-nums">
                          {item.provincia.region} · Georef {item.provincia.provincia_id} ·{' '}
                          <span
                            className={
                              hasData ? 'font-medium text-emerald-react' : 'text-ink-muted'
                            }
                          >
                            {COBERTURA_LABEL[item.provincia.cobertura_datos]}
                          </span>
                        </p>
                      </div>
                      <a
                        href={`/?provincia=${item.provincia.provincia_id}#mapa`}
                        className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-cobalt hover:underline"
                      >
                        <span>Mapa</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Filas de métricas provinciales */}
                  <div className="flex-1 divide-y divide-rule text-[13px]">
                    {/* Cadenas activas */}
                    <div className="p-4">
                      <p className="text-[12px] text-ink-muted">Cadenas verificadas</p>
                      {allChains.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {allChains.map((prod, idx) => (
                            <li
                              key={prod.producto_id}
                              className="flex items-center justify-between gap-2"
                            >
                              <a
                                href={`/productos/${prod.producto_id}`}
                                className="inline-flex items-center gap-2 font-medium text-ink hover:text-cobalt"
                              >
                                <ProductIcon iconId={prod.icono_id} size={15} />
                                <span>{prod.nombre}</span>
                              </a>
                              <span className="text-[11px] text-ink-muted">
                                {idx === 0 ? 'Dominante' : 'Secundaria'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-ink-muted">Sin datos cargados</p>
                      )}
                    </div>

                    {/* Departamentos confiables */}
                    <div className="p-4">
                      <p className="text-[12px] text-ink-muted">
                        Departamentos con datos confiables ({item.departamentosConfiables.length})
                      </p>
                      {item.departamentosConfiables.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.departamentosConfiables.map((d) => (
                            <a
                              key={d.departamento_id}
                              href={`/?provincia=${item.provincia.provincia_id}&departamento=${d.departamento_id}#mapa`}
                              className="border border-rule bg-stone-bg px-2.5 py-1 text-[12px] font-medium text-ink transition-colors duration-150 hover:border-cobalt hover:text-cobalt"
                            >
                              {d.nombre}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-ink-muted">Sin departamentos relevados</p>
                      )}
                    </div>

                    {/* Plantas georreferenciadas */}
                    <div className="p-4">
                      <p className="text-[12px] text-ink-muted">
                        Plantas georreferenciadas ({item.plantas.length})
                      </p>
                      {item.plantas.length > 0 ? (
                        <ul className="mt-2 space-y-2.5">
                          {item.plantas.map((pl) => (
                            <li
                              key={pl.planta_id}
                              className="border-t border-rule pt-2 first:border-t-0 first:pt-0"
                            >
                              <p className="font-medium text-ink">{pl.nombre}</p>
                              <p className="mt-0.5 text-[12px] text-ink-muted tabular-nums">
                                {pl.localidad} ·{' '}
                                {pl.capacidad.estado === 'dato'
                                  ? `${pl.capacidad.valor.toLocaleString('es-AR')} ${pl.capacidad.unidad}`
                                  : 'Capacidad sin datos'}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-ink-muted">Sin plantas registradas</p>
                      )}
                    </div>

                    {/* Empresas y valuación bursátil */}
                    <div className="p-4">
                      <p className="mb-2 text-[12px] text-ink-muted">
                        Empresas operadoras y valuación bursátil
                      </p>
                      {renderMarketList(item.empresas, tiposCambio, dolarCasa)}
                    </div>

                    {/* Trazabilidad */}
                    <div className="flex items-center justify-between p-4 text-[12px] text-ink-muted tabular-nums">
                      <span>Fuentes auditadas: {item.fuentesCount}</span>
                      <span>
                        Último dato: {item.ultimoAnioDato ? item.ultimoAnioDato : 'Sin datos'}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* BLOQUE 2: Mapa de cadena de valor transversal */}
      <section id="cadena-de-valor" className="scroll-mt-24 border-t border-rule pt-14">
        <div className="mb-6 max-w-3xl">
          <h2 className="font-display text-[22px] font-medium leading-tight tracking-[-0.02em] text-ink sm:text-[26px]">
            Mapa transversal de cadenas de valor
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
            Cómo se encadenan las materias primas, la energía y las transformaciones químicas entre
            regiones: desde gas natural compartido en Bahía Blanca hasta la integración vertical
            soja-biodiésel en el Up-River santafesino.
          </p>
        </div>

        <ValueChainFlowMap
          data={cadenaValor}
          selectedProductIds={selectedProductIds}
          onCompareProducts={handleCompareTronco}
          onToggleProductInComparator={(id) => {
            setMode('productos');
            toggleProduct(id);
          }}
        />
      </section>
    </div>
  );
}
