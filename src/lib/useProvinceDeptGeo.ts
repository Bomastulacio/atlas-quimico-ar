import { useEffect, useState } from 'react';

export interface ProvinceShardDeptFeature {
  type: 'Feature';
  properties: {
    id: string;
    nombre: string;
    provincia_id: string;
    activo: boolean;
  };
  geometry:
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] };
}

export interface ProvinceShardCollection {
  type: 'FeatureCollection';
  provincia_id: string;
  features: ProvinceShardDeptFeature[];
}

// Caché L1 en memoria + deduplicación de promesas in-flight + Cache API persistente (AGENTS.md §7.3)
const memoryCache = new Map<string, ProvinceShardCollection>();
const inFlight = new Map<string, Promise<ProvinceShardCollection | null>>();
const CACHE_BUCKET = 'atlas-geo-provincias-v1';
const CACHE_VERSION = '20261127';

function buildShardUrl(provinciaId: string): string {
  return `/geo/provincias/${provinciaId}.json?v=${CACHE_VERSION}`;
}

export function getCachedProvinceGeo(provinciaId: string): ProvinceShardCollection | null {
  return memoryCache.get(provinciaId) ?? null;
}

export function fetchProvinceGeo(provinciaId: string): Promise<ProvinceShardCollection | null> {
  const mem = memoryCache.get(provinciaId);
  if (mem) return Promise.resolve(mem);

  const running = inFlight.get(provinciaId);
  if (running) return running;

  const url = buildShardUrl(provinciaId);

  const task = (async (): Promise<ProvinceShardCollection | null> => {
    try {
      // 1) Intentar Cache API persistente del navegador (sobrevive recargas en mobile y desktop)
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cache = await window.caches.open(CACHE_BUCKET);
          const hit = await cache.match(url);
          if (hit && hit.ok) {
            const parsed = (await hit.json()) as ProvinceShardCollection;
            memoryCache.set(provinciaId, parsed);
            return parsed;
          }
        } catch {
          // Ignorar si el navegador restringe Cache API en modo privado
        }
      }

      // 2) Red con timeout explícito de 8 s
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return null;

        if (typeof window !== 'undefined' && 'caches' in window) {
          try {
            const cache = await window.caches.open(CACHE_BUCKET);
            await cache.put(url, res.clone());
          } catch {
            // Silencioso si falla cuota local
          }
        }

        const data = (await res.json()) as ProvinceShardCollection;
        memoryCache.set(provinciaId, data);
        return data;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return null;
    } finally {
      inFlight.delete(provinciaId);
    }
  })();

  inFlight.set(provinciaId, task);
  return task;
}

export function prefetchProvinceGeo(provinciaId: string | null | undefined): void {
  if (!provinciaId || memoryCache.has(provinciaId) || inFlight.has(provinciaId)) return;
  void fetchProvinceGeo(provinciaId);
}

export function useProvinceDeptGeo(provinciaId: string | null): {
  shard: ProvinceShardCollection | null;
  loading: boolean;
} {
  const [shard, setShard] = useState<ProvinceShardCollection | null>(() =>
    provinciaId ? getCachedProvinceGeo(provinciaId) : null
  );
  const [loading, setLoading] = useState<boolean>(() =>
    Boolean(provinciaId && !getCachedProvinceGeo(provinciaId))
  );

  useEffect(() => {
    if (!provinciaId) {
      setShard(null);
      setLoading(false);
      return;
    }

    const hit = getCachedProvinceGeo(provinciaId);
    if (hit) {
      setShard(hit);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchProvinceGeo(provinciaId).then((res) => {
      if (cancelled) return;
      setShard(res);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [provinciaId]);

  return { shard, loading };
}
