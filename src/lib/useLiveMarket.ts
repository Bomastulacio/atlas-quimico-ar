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

interface CachedMarketState {
  tiposCambio: TipoCambioRegistro[];
  empresasMercado: EmpresaMercado[];
  mode: LiveMarketMode;
  lastUpdatedIso: string;
  fetchedAtMs: number;
}

const SESSION_CACHE_KEY = 'atlas_live_market_v1';
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3800;

// Caché compartida por módulo + deduplicación de requests concurrentes (evita N llamadas idénticas en fichas con varias plantas)
let memoryCache: CachedMarketState | null = null;
let inFlightPromise: Promise<CachedMarketState | null> | null = null;
const listeners = new Set<(state: CachedMarketState) => void>();

function readSessionCache(): CachedMarketState | null {
  if (memoryCache && Date.now() - memoryCache.fetchedAtMs < CACHE_TTL_MS) {
    return memoryCache;
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedMarketState;
    if (
      parsed &&
      typeof parsed.fetchedAtMs === 'number' &&
      Date.now() - parsed.fetchedAtMs < CACHE_TTL_MS &&
      Array.isArray(parsed.tiposCambio) &&
      parsed.tiposCambio.length >= 3 &&
      Array.isArray(parsed.empresasMercado)
    ) {
      memoryCache = parsed;
      return parsed;
    }
  } catch {
    // sessionStorage deshabilitado o corrupto: ignorar silenciosamente
  }
  return null;
}

function writeSessionCache(state: CachedMarketState): void {
  memoryCache = state;
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(state));
    } catch {
      // Cuota llena o modo privado: conservar solo caché en memoria
    }
  }
  for (const listener of listeners) {
    listener(state);
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchMarketShared(
  initialSnapshot: MercadoSnapshot,
  forceEdgeRefresh: boolean
): Promise<CachedMarketState | null> {
  if (!forceEdgeRefresh) {
    const cached = readSessionCache();
    if (cached) return cached;
  }

  if (inFlightPromise && !forceEdgeRefresh) {
    return inFlightPromise;
  }

  const run = (async (): Promise<CachedMarketState | null> => {
    try {
      // Intento 1: Supabase Edge Function (trae bolsa + dólar cacheados en Postgres)
      try {
        const edgeUrl = forceEdgeRefresh
          ? `${initialSnapshot.fuente_edge_url}?refresh=1`
          : initialSnapshot.fuente_edge_url;
        const res = await fetchWithTimeout(edgeUrl, FETCH_TIMEOUT_MS);
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
            const nextState: CachedMarketState = {
              tiposCambio: payload.tipos_cambio,
              empresasMercado: payload.empresas,
              mode: 'live_edge',
              lastUpdatedIso: payload.consultado_en ?? new Date().toISOString(),
              fetchedAtMs: Date.now(),
            };
            writeSessionCache(nextState);
            return nextState;
          }
        }
      } catch {
        // Fallback a DolarApi.com debajo
      }

      // Intento 2 (fallback en vivo gratuito): DolarApi.com (CCL, MEP y Oficial con CORS abierto)
      const dolRes = await fetchWithTimeout('https://dolarapi.com/v1/dolares', FETCH_TIMEOUT_MS);
      if (dolRes.ok) {
        const rows = (await dolRes.json()) as Array<{
          casa: string;
          compra: number | null;
          venta: number | null;
          fechaActualizacion?: string;
        }>;
        const byCasa = new Map(rows.map((r) => [r.casa, r]));
        const baseTipos = memoryCache?.tiposCambio ?? initialSnapshot.tipos_cambio;
        const updatedTipos = baseTipos.map((item) => {
          const live = byCasa.get(item.casa);
          if (!live || !live.venta || live.venta <= 0) return item;
          return {
            ...item,
            compra: live.compra && live.compra > 0 ? live.compra : item.compra,
            venta: live.venta,
            fecha_actualizacion: live.fechaActualizacion ?? new Date().toISOString(),
          };
        });
        const nextState: CachedMarketState = {
          tiposCambio: updatedTipos,
          empresasMercado: memoryCache?.empresasMercado ?? initialSnapshot.empresas,
          mode: 'live_dolarapi',
          lastUpdatedIso: new Date().toISOString(),
          fetchedAtMs: Date.now(),
        };
        writeSessionCache(nextState);
        return nextState;
      }
    } catch {
      // Conserva silenciosamente el snapshot validado sin romper la vista
    }
    return null;
  })();

  inFlightPromise = run;
  try {
    return await run;
  } finally {
    if (inFlightPromise === run) {
      inFlightPromise = null;
    }
  }
}

/**
 * Hook híbrido 100% gratuito con caché TTL de 5 min (memoria + sessionStorage) y deduplicación in-flight:
 * 1) Arranca en 0 ms con el snapshot validado de `data/validated/mercado.json` (o caché fresca de sesión).
 * 2) Si hay múltiples tarjetas montadas en la misma página, dispara 1 sola solicitud compartida.
 * 3) Intenta primero la Supabase Edge Function (`market-quotes`) y hace fallback a DolarApi.com.
 */
export function useLiveMarket(initialSnapshot: MercadoSnapshot): UseLiveMarketResult {
  const cachedInit = readSessionCache();
  const [dolarCasa, setDolarCasa] = useState<DolarSelector>('contadoconliqui');
  const [tiposCambio, setTiposCambio] = useState<TipoCambioRegistro[]>(
    cachedInit?.tiposCambio ?? initialSnapshot.tipos_cambio
  );
  const [empresasMercado, setEmpresasMercado] = useState<EmpresaMercado[]>(
    cachedInit?.empresasMercado ?? initialSnapshot.empresas
  );
  const [mode, setMode] = useState<LiveMarketMode>(cachedInit?.mode ?? 'snapshot');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedIso, setLastUpdatedIso] = useState<string>(
    cachedInit?.lastUpdatedIso ?? initialSnapshot.generado_en
  );

  useEffect(() => {
    let active = true;
    const onUpdate = (next: CachedMarketState) => {
      if (!active) return;
      setTiposCambio(next.tiposCambio);
      setEmpresasMercado(next.empresasMercado);
      setMode(next.mode);
      setLastUpdatedIso(next.lastUpdatedIso);
    };
    listeners.add(onUpdate);

    const existing = readSessionCache();
    if (existing) {
      onUpdate(existing);
    } else {
      setIsRefreshing(true);
      void fetchMarketShared(initialSnapshot, false).finally(() => {
        if (active) setIsRefreshing(false);
      });
    }

    return () => {
      active = false;
      listeners.delete(onUpdate);
    };
  }, [initialSnapshot]);

  const refreshNow = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchMarketShared(initialSnapshot, true);
    } finally {
      setIsRefreshing(false);
    }
  }, [initialSnapshot]);

  return {
    dolarCasa,
    setDolarCasa,
    tiposCambio,
    empresasMercado,
    mode,
    isRefreshing,
    lastUpdatedIso,
    refreshNow,
  };
}
