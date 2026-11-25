/**
 * Sincroniza el snapshot verificado de cotizaciones bursátiles (BYMA / NYSE / B3)
 * y tipo de cambio argentino (DolarApi: CCL, MEP, Oficial + USD/BRL) hacia
 * `data/validated/mercado.json`, sin escribir archivos crudos locales en `data/raw/`.
 *
 * Las acciones en circulación provienen exclusivamente de reportes primarios
 * auditados (CNV / SEC Form 20-F / SEC Form 10-K / Unipar RI B3).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  MercadoSnapshotSchema,
  type EmpresaMercado,
  type TipoCambioRegistro,
} from '../src/schemas';

const OUT_PATH = path.join(process.cwd(), 'data', 'validated', 'mercado.json');
const EDGE_FUNCTION_URL =
  'https://rbjymgrimmrbetgbeios.supabase.co/functions/v1/market-quotes';

interface EmpresaCatalogoMercado {
  empresa_id: string;
  tipo_cotizacion: EmpresaMercado['tipo_cotizacion'];
  entidad_cotizante: string | null;
  ticker: string | null;
  ticker_feed: string | null;
  bolsa: string | null;
  moneda_origen: EmpresaMercado['moneda_origen'];
  acciones_circulacion: number | null;
  nota_cotizacion: string;
  fuente_acciones: string | null;
  fuente_precio: string | null;
}

const CATALOGO_EMPRESAS: EmpresaCatalogoMercado[] = [
  {
    empresa_id: 'aluar-saic',
    tipo_cotizacion: 'directa_local',
    entidad_cotizante: 'Aluar Aluminio Argentino S.A.I.C.',
    ticker: 'ALUA',
    ticker_feed: 'ALUA.BA',
    bolsa: 'BYMA',
    moneda_origen: 'ARS',
    acciones_circulacion: 2_800_000_000,
    nota_cotizacion:
      'Cotización directa en BYMA (acciones ordinarias VN $1). Capitalización calculada sobre 2.800.000.000 acciones auditadas ante CNV.',
    fuente_acciones: 'Estados Financieros Aluar 56° Ejercicio (CNV, 2.800.000.000 acciones)',
    fuente_precio: 'BYMA vía Yahoo Finance (ALUA.BA)',
  },
  {
    empresa_id: 'molinos-agro-sa',
    tipo_cotizacion: 'directa_local',
    entidad_cotizante: 'Molinos Agro S.A.',
    ticker: 'MOLA',
    ticker_feed: 'MOLA.BA',
    bolsa: 'BYMA',
    moneda_origen: 'ARS',
    acciones_circulacion: 49_082_024,
    nota_cotizacion:
      'Cotización directa en BYMA (MOLA). Capitalización calculada sobre 49.082.024 acciones ordinarias totales (Clase A + Clase B, CNV/BYMA).',
    fuente_acciones: 'Estados Contables y registro CNV/BYMA de Molinos Agro S.A. (49.082.024 acciones)',
    fuente_precio: 'BYMA vía Yahoo Finance (MOLA.BA)',
  },
  {
    empresa_id: 'rio-tinto-litio-ar',
    tipo_cotizacion: 'matriz_global',
    entidad_cotizante: 'Rio Tinto Group (DLC)',
    ticker: 'RIO',
    ticker_feed: 'RIO',
    bolsa: 'NYSE',
    moneda_origen: 'USD',
    acciones_circulacion: 1_627_226_528,
    nota_cotizacion:
      'Cotización del grupo matriz global (NYSE: RIO). Refleja la valuación mundial de Rio Tinto y no exclusivamente sus operaciones de litio en Argentina.',
    fuente_acciones:
      'Rio Tinto Form 20-F 2025 ante SEC (1.627.226.528 acciones ordinarias DLC al 31/12/2025)',
    fuente_precio: 'NYSE vía Yahoo Finance (RIO)',
  },
  {
    empresa_id: 'dow-pbbpolisur',
    tipo_cotizacion: 'matriz_global',
    entidad_cotizante: 'Dow Inc.',
    ticker: 'DOW',
    ticker_feed: 'DOW',
    bolsa: 'NYSE',
    moneda_origen: 'USD',
    acciones_circulacion: 717_534_072,
    nota_cotizacion:
      'Cotización del grupo matriz global (NYSE: DOW). Refleja la valuación mundial de Dow Inc. y no exclusivamente el complejo PBBPolisur de Bahía Blanca.',
    fuente_acciones:
      'Dow Inc. Form 10-K 2025 ante SEC (717.534.072 acciones ordinarias al 15/01/2026)',
    fuente_precio: 'NYSE vía Yahoo Finance (DOW)',
  },
  {
    empresa_id: 'unipar-indupa',
    tipo_cotizacion: 'matriz_global',
    entidad_cotizante: 'Unipar Carbocloro S.A.',
    ticker: 'UNIP6',
    ticker_feed: 'UNIP6.SA',
    bolsa: 'B3',
    moneda_origen: 'BRL',
    acciones_circulacion: 113_173_265,
    nota_cotizacion:
      'Cotización del grupo matriz regional en Brasil (B3: UNIP6). Refleja la valuación consolidada de Unipar y no exclusivamente la planta de Bahía Blanca.',
    fuente_acciones:
      'Unipar RI / B3 (113.173.265 acciones totales: ON UNIP3 + PNA UNIP5 + PNB UNIP6)',
    fuente_precio: 'B3 vía Yahoo Finance (UNIP6.SA)',
  },
  {
    empresa_id: 'profertil-sa',
    tipo_cotizacion: 'no_cotiza',
    entidad_cotizante: null,
    ticker: null,
    ticker_feed: null,
    bolsa: null,
    moneda_origen: null,
    acciones_circulacion: null,
    nota_cotizacion:
      'Empresa cerrada; no cotiza en oferta pública. Al 31/12/2025 su capital pertenece 90% a Grupo Adecoagro (NYSE: AGRO) y 10% a ACA.',
    fuente_acciones: null,
    fuente_precio: null,
  },
  {
    empresa_id: 'renova-sa',
    tipo_cotizacion: 'no_cotiza',
    entidad_cotizante: null,
    ticker: null,
    ticker_feed: null,
    bolsa: null,
    moneda_origen: null,
    acciones_circulacion: null,
    nota_cotizacion: 'Empresa privada cerrada; no cotiza en oferta pública.',
    fuente_acciones: null,
    fuente_precio: null,
  },
  {
    empresa_id: 'buyatti-saica',
    tipo_cotizacion: 'no_cotiza',
    entidad_cotizante: null,
    ticker: null,
    ticker_feed: null,
    bolsa: null,
    moneda_origen: null,
    acciones_circulacion: null,
    nota_cotizacion: 'Empresa privada de capital nacional; no cotiza en oferta pública.',
    fuente_acciones: null,
    fuente_precio: null,
  },
];

async function fetchYahooQuote(symbol: string) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
    { headers: { 'User-Agent': 'atlas-quimico-ar/1.0' } }
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} consultando Yahoo Finance para ${symbol}`);
  }
  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        meta?: {
          regularMarketPrice?: number;
          chartPreviousClose?: number;
          previousClose?: number;
          regularMarketTime?: number;
        };
      }>;
    };
  };
  const meta = json.chart?.result?.[0]?.meta;
  const price = Number(meta?.regularMarketPrice);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Sin precio válido en Yahoo Finance para ${symbol}`);
  }
  const prevRaw = Number(meta?.chartPreviousClose ?? meta?.previousClose);
  const prevClose = Number.isFinite(prevRaw) && prevRaw > 0 ? prevRaw : null;
  const variationPct =
    prevClose !== null ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : null;
  const ts = Number(meta?.regularMarketTime);
  const updatedAt =
    Number.isFinite(ts) && ts > 0 ? new Date(ts * 1000).toISOString() : new Date().toISOString();
  return { price, prevClose, variationPct, updatedAt };
}

async function main() {
  console.log('[data:sync:mercado] Consultando DolarApi + Yahoo Finance (BYMA / NYSE / B3)...');

  const [dolarRes, brlQuote] = await Promise.all([
    fetch('https://dolarapi.com/v1/dolares', {
      headers: { 'User-Agent': 'atlas-quimico-ar/1.0' },
    }),
    fetchYahooQuote('BRL=X'),
  ]);

  if (!dolarRes.ok) {
    throw new Error(`HTTP ${dolarRes.status} consultando DolarApi`);
  }

  const dolarRaw = (await dolarRes.json()) as Array<{
    casa: string;
    compra: number | null;
    venta: number | null;
    fechaActualizacion: string;
  }>;

  const casaMeta: Record<string, { nombre: string; fuente: string }> = {
    contadoconliqui: { nombre: 'Dólar CCL', fuente: 'DolarApi.com (referencia CCL)' },
    bolsa: { nombre: 'Dólar MEP', fuente: 'DolarApi.com (referencia MEP)' },
    oficial: { nombre: 'Dólar Oficial', fuente: 'DolarApi.com / BCRA (Oficial)' },
  };

  const tiposCambio: TipoCambioRegistro[] = [];
  for (const row of dolarRaw) {
    const meta = casaMeta[row.casa];
    if (!meta || !row.venta || row.venta <= 0) continue;
    tiposCambio.push({
      casa: row.casa as TipoCambioRegistro['casa'],
      nombre: meta.nombre,
      moneda_base: 'USD',
      moneda_destino: 'ARS',
      compra: row.compra && row.compra > 0 ? row.compra : null,
      venta: row.venta,
      fuente: meta.fuente,
      fuente_url: 'https://dolarapi.com/v1/dolares',
      fecha_actualizacion: row.fechaActualizacion || new Date().toISOString(),
    });
  }

  tiposCambio.push({
    casa: 'usd_brl',
    nombre: 'USD / BRL',
    moneda_base: 'USD',
    moneda_destino: 'BRL',
    compra: null,
    venta: brlQuote.price,
    fuente: 'Yahoo Finance (BRL=X)',
    fuente_url: 'https://finance.yahoo.com/quote/BRL=X',
    fecha_actualizacion: brlQuote.updatedAt,
  });

  const empresas: EmpresaMercado[] = await Promise.all(
    CATALOGO_EMPRESAS.map(async (item): Promise<EmpresaMercado> => {
      if (!item.ticker_feed || !item.acciones_circulacion) {
        return {
          ...item,
          ultimo_precio: null,
          cierre_previo: null,
          variacion_dia_pct: null,
          market_cap_origen: null,
          mercado_actualizado_en: null,
        };
      }
      const q = await fetchYahooQuote(item.ticker_feed);
      return {
        ...item,
        ultimo_precio: q.price,
        cierre_previo: q.prevClose,
        variacion_dia_pct: q.variationPct,
        market_cap_origen: q.price * item.acciones_circulacion,
        mercado_actualizado_en: q.updatedAt,
      };
    })
  );

  const snapshot = MercadoSnapshotSchema.parse({
    generado_en: new Date().toISOString(),
    fuente_edge_url: EDGE_FUNCTION_URL,
    tipos_cambio: tiposCambio,
    empresas,
  });

  await fs.writeFile(OUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf-8');

  const ccl = tiposCambio.find((t) => t.casa === 'contadoconliqui')?.venta ?? 0;
  const alua = empresas.find((e) => e.empresa_id === 'aluar-saic');
  console.log(
    `[data:sync:mercado] OK — ${empresas.length} empresas + ${tiposCambio.length} tipos de cambio (CCL ARS ${ccl}).`
  );
  if (alua?.market_cap_origen && ccl > 0) {
    console.log(
      `[data:sync:mercado] Aluar (${alua.ticker}): ARS ${alua.ultimo_precio} · Market Cap USD ${(alua.market_cap_origen / ccl / 1e6).toFixed(1)} M (CCL).`
    );
  }
}

main().catch((err) => {
  console.error('[data:sync:mercado] ERROR:', err);
  process.exit(1);
});
