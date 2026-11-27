import { memo, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import type { DolarSelector, EmpresaMercado, MercadoSnapshot } from '@/schemas';
import { useLiveMarket } from '@/lib/useLiveMarket';
import { CompanyMarketCard } from './CompanyMarketCard';

interface CompanyLiveMarketWidgetProps {
  empresaId: string;
  initialMercado: EmpresaMercado;
  mercadoSnapshot: MercadoSnapshot;
}

const DOLAR_OPTIONS: Array<{ casa: DolarSelector; label: string }> = [
  { casa: 'contadoconliqui', label: 'CCL' },
  { casa: 'bolsa', label: 'MEP' },
  { casa: 'oficial', label: 'Oficial' },
];

export const CompanyLiveMarketWidget = memo(function CompanyLiveMarketWidget({
  empresaId,
  initialMercado,
  mercadoSnapshot,
}: CompanyLiveMarketWidgetProps) {
  const {
    dolarCasa,
    setDolarCasa,
    tiposCambio,
    empresasMercado,
    isRefreshing,
    refreshNow,
  } = useLiveMarket(mercadoSnapshot);

  const liveMercado = useMemo(
    () => empresasMercado.find((m) => m.empresa_id === empresaId) ?? initialMercado,
    [empresasMercado, empresaId, initialMercado]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Seleccionar tipo de cambio de referencia"
          className="inline-flex bg-stone-subtle p-1 text-[12px]"
        >
          {DOLAR_OPTIONS.map((opt) => {
            const isActive = dolarCasa === opt.casa;
            return (
              <button
                key={opt.casa}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setDolarCasa(opt.casa)}
                className={`cursor-pointer px-2.5 py-1 font-medium transition-colors duration-150 ${
                  isActive ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => void refreshNow()}
          disabled={isRefreshing}
          className="bencho-press inline-flex cursor-pointer items-center gap-1.5 border border-rule bg-stone-bg px-2.5 py-1 text-[12px] font-medium text-ink transition-colors duration-150 hover:border-ink hover:text-cobalt disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      <CompanyMarketCard
        mercado={liveMercado}
        tiposCambio={tiposCambio}
        dolarCasa={dolarCasa}
      />
    </div>
  );
});
