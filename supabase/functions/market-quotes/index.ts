import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min de cache compartido en Postgres
const FORCE_REFRESH_COOLDOWN_MS = 2 * 60 * 1000; // Cooldown mínimo 2 min anti-abuso

interface DolarApiRow {
  casa: string;
  nombre: string;
  compra: number | null;
  venta: number | null;
  fechaActualizacion: string;
}

async function fetchYahooQuote(symbol: string): Promise<{
  price: number;
  prevClose: number | null;
  variationPct: number | null;
  updatedAt: string;
} | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
      {
        headers: { "User-Agent": "atlas-quimico-ar/1.0" },
        signal: AbortSignal.timeout(4500),
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice);
    if (!Number.isFinite(price) || price <= 0) return null;
    const prevRaw = Number(meta?.chartPreviousClose ?? meta?.previousClose);
    const prevClose = Number.isFinite(prevRaw) && prevRaw > 0 ? prevRaw : null;
    const variationPct =
      prevClose !== null ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : null;
    const tsSec = Number(meta?.regularMarketTime);
    const updatedAt =
      Number.isFinite(tsSec) && tsSec > 0
        ? new Date(tsSec * 1000).toISOString()
        : new Date().toISOString();
    return { price, prevClose, variationPct, updatedAt };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const url = new URL(req.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";

  const [{ data: empresasRows, error: empErr }, { data: fxRows, error: fxErr }] = await Promise.all([
    supabase.from("empresas_mercado").select("*").order("empresa_id"),
    supabase.from("tipo_cambio_cache").select("*").order("casa"),
  ]);

  if (empErr || fxErr) {
    return new Response(
      JSON.stringify({ error: empErr?.message ?? fxErr?.message ?? "DB read error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const nowMs = Date.now();
  const latestUpdateMs = Math.max(
    0,
    ...(fxRows ?? []).map((r) => Date.parse(r.updated_at ?? "") || 0)
  );
  const ageMs = nowMs - latestUpdateMs;
  const shouldRefresh =
    ageMs > CACHE_TTL_MS || (forceRefresh && ageMs > FORCE_REFRESH_COOLDOWN_MS);

  let source: "live_refreshed" | "cache" | "cache_fallback" = "cache";
  let freshFx = fxRows ?? [];
  let freshEmp = empresasRows ?? [];

  if (shouldRefresh) {
    let anyUpdated = false;
    try {
      const listed = (empresasRows ?? []).filter((r) => r.ticker_feed && r.acciones_circulacion);

      // Todos los fetches externos (DolarApi + BRL=X + tickers Yahoo) corren en una única ola paralela con timeout
      const [dolarRes, brlQuote, ...yahooQuotes] = await Promise.all([
        fetch("https://dolarapi.com/v1/dolares", {
          headers: { "User-Agent": "atlas-quimico-ar/1.0" },
          signal: AbortSignal.timeout(4500),
        }),
        fetchYahooQuote("BRL=X"),
        ...listed.map((row) => fetchYahooQuote(row.ticker_feed)),
      ]);

      const nowIso = new Date().toISOString();
      const fxUpserts: Array<Record<string, unknown>> = [];
      if (dolarRes.ok) {
        const list = (await dolarRes.json()) as DolarApiRow[];
        const labelMap: Record<string, { nombre: string; fuente: string }> = {
          contadoconliqui: { nombre: "Dólar CCL", fuente: "DolarApi.com (referencia CCL)" },
          bolsa: { nombre: "Dólar MEP", fuente: "DolarApi.com (referencia MEP)" },
          oficial: { nombre: "Dólar Oficial", fuente: "DolarApi.com / BCRA (Oficial)" },
        };
        for (const row of list) {
          const meta = labelMap[row.casa];
          if (!meta || !row.venta || row.venta <= 0) continue;
          fxUpserts.push({
            casa: row.casa,
            nombre: meta.nombre,
            moneda_base: "USD",
            moneda_destino: "ARS",
            compra: row.compra,
            venta: row.venta,
            fuente: meta.fuente,
            fuente_url: "https://dolarapi.com/v1/dolares",
            fecha_actualizacion: row.fechaActualizacion || nowIso,
            updated_at: nowIso,
          });
        }
      }
      if (brlQuote) {
        fxUpserts.push({
          casa: "usd_brl",
          nombre: "USD / BRL",
          moneda_base: "USD",
          moneda_destino: "BRL",
          compra: null,
          venta: brlQuote.price,
          fuente: "Yahoo Finance (BRL=X)",
          fuente_url: "https://finance.yahoo.com/quote/BRL=X",
          fecha_actualizacion: brlQuote.updatedAt,
          updated_at: nowIso,
        });
      }

      // Eliminamos el N+1 de N UPDATEs individuales: consolidamos un único upsert por lote en empresas_mercado
      const empUpserts: Array<Record<string, unknown>> = [];
      const empPatchById = new Map<string, Record<string, unknown>>();
      listed.forEach((row, idx) => {
        const q = yahooQuotes[idx];
        if (!q) return;
        const patched = {
          ...row,
          ultimo_precio: q.price,
          cierre_previo: q.prevClose,
          variacion_dia_pct: q.variationPct,
          market_cap_origen: q.price * Number(row.acciones_circulacion),
          mercado_actualizado_en: q.updatedAt,
          updated_at: nowIso,
        };
        empUpserts.push(patched);
        empPatchById.set(row.empresa_id, patched);
      });

      const writeOps: Array<Promise<unknown>> = [];
      if (fxUpserts.length > 0) {
        writeOps.push(
          Promise.resolve(supabase.from("tipo_cambio_cache").upsert(fxUpserts, { onConflict: "casa" }))
        );
        const fxByCasa = new Map(fxUpserts.map((r) => [String(r.casa), r]));
        freshFx = freshFx.map((r) => fxByCasa.get(String(r.casa)) ?? r);
        anyUpdated = true;
      }
      if (empUpserts.length > 0) {
        writeOps.push(
          Promise.resolve(
            supabase.from("empresas_mercado").upsert(empUpserts, { onConflict: "empresa_id" })
          )
        );
        freshEmp = freshEmp.map((r) => empPatchById.get(String(r.empresa_id)) ?? r);
        anyUpdated = true;
      }
      if (writeOps.length > 0) {
        await Promise.all(writeOps);
      }

      source = anyUpdated ? "live_refreshed" : "cache_fallback";
    } catch {
      source = "cache_fallback";
    }
  }

  return new Response(
    JSON.stringify({
      source,
      consultado_en: new Date().toISOString(),
      tipos_cambio: freshFx,
      empresas: freshEmp,
    }),
    {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
      },
    }
  );
});
