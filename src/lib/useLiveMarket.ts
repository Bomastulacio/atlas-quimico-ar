import { useCallback, useEffect, useState } from 'react';
import type {
  DolarSelector,
  EmpresaMercado,
  MercadoSnapshot,
  TipoCambioRegistro,
} from '@/schemas';

export type LiveMarketMode = 'snapshot' | 'live_dolarapi' | 'live_edge';

interface UseLiveMarketResult {
  dolarCasa: DolarSelector;
  setDolarCasa: (casa: DolarSelector) => void;
  tiposCambio: TipoCambioRegistro[];
  empresasMercado: EmpresaMercado[];
  mode: LiveMarketMode;
  isRefreshing: boolean;
  lastUpdatedIso: string;
  refreshNow: () => Promise<void>;
}

/**
 * Hook híbrido 100% gratuito:
 * 1) Arranca en 0 ms con el snapshot validado de `data/validated/mercado.json`.
 * 2) Al montar o al pedir refresco, intenta primero la Supabase Edge Function (`market-quotes`).
 * 3) Si la Edge Function aún no está desplegada o falla, actualiza en vivo los dólares
 *    CCL, MEP y Oficial desde DolarApi.com (gratuita, CORS abierto) y recalcula todos los valores.
 */
export function useLiveMarket(initialSnapshot: MercadoSnapshot): UseLiveMarketResult {
  const [dolarCasa, setDolarCasa] = useState<DolarSelector>('contadoconliqui');
  const [tiposCambio, setTiposCambio] = useState<TipoCambioRegistro[]>(initialSnapshot.tipos_cambio);
  const [empresasMercado, setEmpresasMercado] = useState<EmpresaMercado[]>(initialSnapshot.empresas);
  const [mode, setMode] = useState<LiveMarketMode>('snapshot');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedIso, setLastUpdatedIso] = useState<string>(initialSnapshot.generado_en);

  const fetchUpdates = useCallback(
    async (forceEdgeRefresh: boolean) => {
      setIsRefreshing(true);
      try {
        // Intento 1: Supabase Edge Function (trae bolsa + dólar cacheados en Postgres)
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 3800);
        try {
          const edgeUrl = forceEdgeRefresh
            ? `${initialSnapshot.fuente_edge_url}?refresh=1`
            : initialSnapshot.fuente_edge_url;
          const res = await fetch(edgeUrl, { signal: controller.signal });
          window.clearTimeout(timer);
          if (res.ok) {
            const payload = (await res.json()) as {
              tipos_cambio?: TipoCambioRegistro[];
              empresas?: EmpresaMercado[];
              consultado_en?: string;
            };
            if (
              Array.isArray(payload.tipos_cambio) &&
              payload.tipos_cambio.length >= 3 &&
              Array.isArray(payload.empresas) &&
              payload.empresas.length > 0
            ) {
              setTiposCambio(payload.tipos_cambio);
              setEmpresasMercado(payload.empresas);
              setLastUpdatedIso(payload.consultado_en ?? new Date().toISOString());
              setMode('live_edge');
              return;
            }
          }
        } catch {
          window.clearTimeout(timer);
        }

        // Intento 2 (fallback en vivo gratuito): DolarApi.com (CCL, MEP y Oficial con CORS abierto)
        const dolRes = await fetch('https://dolarapi.com/v1/dolares');
        if (dolRes.ok) {
          const rows = (await dolRes.json()) as Array<{
            casa: string;
            compra: number | null;
            venta: number | null;
            fechaActualizacion?: string;
          }>;
          const byCasa = new Map(rows.map((r) => [r.casa, r]));
          setTiposCambio((prev) =>
            prev.map((item) => {
              const live = byCasa.get(item.casa);
              if (!live || !live.venta || live.venta <= 0) return item;
              return {
                ...item,
                compra: live.compra && live.compra > 0 ? live.compra : item.compra,
                venta: live.venta,
                fecha_actualizacion: live.fechaActualizacion ?? new Date().toISOString(),
              };
            })
          );
          setLastUpdatedIso(new Date().toISOString());
          setMode('live_dolarapi');
        }
      } catch {
        // Conserva silenciosamente el snapshot validado sin romper la vista
      } finally {
        setIsRefreshing(false);
      }
    },
    [initialSnapshot.fuente_edge_url]
  );

  useEffect(() => {
    void fetchUpdates(false);
  }, [fetchUpdates]);

  return {
    dolarCasa,
    setDolarCasa,
    tiposCambio,
    empresasMercado,
    mode,
    isRefreshing,
    lastUpdatedIso,
    refreshNow: () => fetchUpdates(true),
  };
}
