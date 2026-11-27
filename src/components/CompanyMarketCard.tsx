import { memo, useMemo } from 'react';
import { Globe, Lock, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import {
  computeValuationArsUsd,
  formatMarketCap,
  type DolarSelector,
  type EmpresaMercado,
  type MercadoSnapshot,
  type TipoCambioRegistro,
} from '@/schemas';
import { useLiveMarket } from '@/lib/useLiveMarket';

const DOLAR_LABELS: Record<DolarSelector, string> = {
  contadoconliqui: 'CCL',
  bolsa: 'MEP',
  oficial: 'Oficial',
};

function formatShortDate(iso: string | null): string {
  if (!iso) return 'Sin fecha';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface CompanyMarketCardProps {
  mercado: EmpresaMercado;
  tiposCambio: TipoCambioRegistro[];
  dolarCasa: DolarSelector;
}

export const CompanyMarketCard = memo(function CompanyMarketCard({
  mercado,
  tiposCambio,
  dolarCasa,
}: CompanyMarketCardProps) {
  if (mercado.tipo_cotizacion === 'no_cotiza') {
    return (
      <div className="mt-5 border border-rule bg-stone-bg px-4 py-3.5 text-[13px]">
        <div className="flex items-center gap-2 font-medium text-ink">
          <Lock className="h-3.5 w-3.5 text-ink-muted" />
          <span>No cotiza en oferta pública</span>
        </div>
        <p className="mt-1 text-ink-muted">{mercado.nota_cotizacion}</p>
      </div>
    );
  }

  const val = computeValuationArsUsd(mercado, tiposCambio, dolarCasa);
  const isGlobalParent = mercado.tipo_cotizacion === 'matriz_global';
  const varPct = mercado.variacion_dia_pct;
  const isPositive = (varPct ?? 0) >= 0;

  return (
    <div
      className={`mt-5 border p-4 ${
        isGlobalParent
          ? 'border-dashed border-rule-strong/35 bg-stone-bg'
          : 'border-cobalt/30 bg-[#F4F6FC]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <div className="flex flex-wrap items-baseline gap-2">
          {isGlobalParent ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-ink">
              <Globe className="h-3.5 w-3.5 text-ink-muted" />
              <span>Grupo matriz global</span>
            </span>
          ) : (
            <span className="font-medium text-cobalt">Valuación bursátil directa</span>
          )}
          {mercado.bolsa && mercado.ticker && (
            <span className="text-[12px] font-medium text-ink-muted tabular-nums">
              {mercado.bolsa} · {mercado.ticker}
            </span>
          )}
        </div>

        {varPct !== null && (
          <span
            className={`inline-flex items-center gap-1 text-[13px] font-medium tabular-nums ${
              isPositive ? 'text-emerald-react' : 'text-signal-red'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span>
              {isPositive ? '+' : ''}
              {varPct.toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              %
            </span>
          </span>
        )}
      </div>

      {isGlobalParent && (
        <p className="mt-2 text-[13px] leading-snug text-ink-muted">
          Cotización consolidada de <strong className="font-medium text-ink">{mercado.entidad_cotizante}</strong>{' '}
          (no exclusiva de sus plantas en Argentina).
        </p>
      )}

      {val ? (
        <dl className="mt-3 grid gap-3 border-t border-rule/80 pt-3 sm:grid-cols-2 tabular-nums">
          <div>
            <dt className="text-[12px] text-ink-muted">
              Valor de mercado en dólares ({DOLAR_LABELS[dolarCasa]})
            </dt>
            <dd className="mt-0.5 font-display text-[19px] font-medium leading-tight tracking-[-0.02em] text-ink">
              {formatMarketCap(val.marketCapUsd, 'USD')}
            </dd>
          </div>

          <div>
            <dt className="text-[12px] text-ink-muted">
              Valor de mercado en pesos ({DOLAR_LABELS[dolarCasa]})
            </dt>
            <dd className="mt-0.5 font-display text-[19px] font-medium leading-tight tracking-[-0.02em] text-ink">
              {formatMarketCap(val.marketCapArs, 'ARS')}
            </dd>
          </div>

          <div>
            <dt className="text-[12px] text-ink-muted">Precio por acción</dt>
            <dd className="mt-0.5 text-[14px] font-medium text-ink">
              {mercado.moneda_origen === 'ARS'
                ? `ARS ${val.precioArs.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : mercado.moneda_origen === 'BRL'
                  ? `BRL ${(mercado.ultimo_precio ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (USD ${val.precioUsd.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                  : `USD ${val.precioUsd.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </dd>
          </div>

          <div>
            <dt className="text-[12px] text-ink-muted">Acciones auditadas</dt>
            <dd className="mt-0.5 text-[14px] font-normal text-ink">
              {mercado.acciones_circulacion
                ? `${(mercado.acciones_circulacion / 1_000_000).toLocaleString('es-AR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })} M`
                : 'Sin datos'}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-2 text-[13px] text-ink-muted">Cotización temporalmente sin datos.</p>
      )}

      <div className="mt-3 border-t border-rule/80 pt-2.5 text-[12px] text-ink-muted tabular-nums">
        <p>
          {mercado.fuente_precio} · {formatShortDate(mercado.mercado_actualizado_en)} · 1 USD = ARS{' '}
          {(val?.tasaAplicadaArsPorUsd ?? 0).toLocaleString('es-AR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}{' '}
          ({DOLAR_LABELS[dolarCasa]})
        </p>
        {mercado.fuente_acciones && <p className="mt-0.5">Acciones: {mercado.fuente_acciones}</p>}
      </div>
    </div>
  );
});

interface StandaloneCompanyMarketProps {
  empresaId: string;
  initialSnapshot: MercadoSnapshot;
}

/**
 * Versión autocontenida con selector CCL / MEP / Oficial para insertar dentro
 * de las fichas individuales de producto (ej. Aluar en /productos/aluminio).
 */
export function StandaloneCompanyMarket({
  empresaId,
  initialSnapshot,
}: StandaloneCompanyMarketProps) {
  const {
    dolarCasa,
    setDolarCasa,
    tiposCambio,
    empresasMercado,
    mode,
    isRefreshing,
    refreshNow,
  } = useLiveMarket(initialSnapshot);

  const mercado = useMemo(
    () => empresasMercado.find((e) => e.empresa_id === empresaId),
    [empresasMercado, empresaId]
  );
  if (!mercado) return null;

  return (
    <div className="mt-5 border-t border-rule pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-ink-muted">Tipo de cambio:</span>
          {(['contadoconliqui', 'bolsa', 'oficial'] as const).map((casa) => {
            const fx = tiposCambio.find((t) => t.casa === casa);
            const active = dolarCasa === casa;
            return (
              <button
                key={casa}
                type="button"
                onClick={() => setDolarCasa(casa)}
                className={`cursor-pointer border px-2 py-0.5 text-[12px] font-medium transition-colors duration-150 tabular-nums ${
                  active
                    ? 'border-ink bg-ink text-white'
                    : 'border-rule bg-stone-bg text-ink hover:border-ink'
                }`}
              >
                {DOLAR_LABELS[casa]}{' '}
                {fx
                  ? `$${Math.round(fx.venta).toLocaleString('es-AR')}`
                  : ''}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => void refreshNow()}
          disabled={isRefreshing}
          className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-cobalt hover:underline disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>
            {mode === 'live_edge'
              ? 'Bolsa y dólar al día'
              : mode === 'live_dolarapi'
                ? 'Dólar en vivo (DolarApi)'
                : 'Actualizar'}
          </span>
        </button>
      </div>

      <CompanyMarketCard mercado={mercado} tiposCambio={tiposCambio} dolarCasa={dolarCasa} />
    </div>
  );
}
