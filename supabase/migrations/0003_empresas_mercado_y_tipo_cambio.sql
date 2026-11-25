-- Migración 0003: Valuación bursátil verificable (empresas_mercado) y cache de tipo de cambio (tipo_cambio_cache)
-- Proyecto: Atlas Químico Argentino (Supabase Postgres 17)
-- Regla de seguridad: RLS habilitado; SELECT público (anon, authenticated); escritura exclusiva service_role (Edge Function / pipeline).

CREATE TABLE IF NOT EXISTS public.empresas_mercado (
  empresa_id TEXT PRIMARY KEY REFERENCES public.empresas(empresa_id) ON DELETE CASCADE,
  tipo_cotizacion TEXT NOT NULL CHECK (tipo_cotizacion IN ('directa_local', 'matriz_global', 'no_cotiza')),
  entidad_cotizante TEXT,
  ticker TEXT,
  ticker_feed TEXT,
  bolsa TEXT,
  moneda_origen TEXT CHECK (moneda_origen IS NULL OR moneda_origen IN ('ARS', 'USD', 'BRL')),
  acciones_circulacion BIGINT CHECK (acciones_circulacion IS NULL OR acciones_circulacion > 0),
  ultimo_precio DOUBLE PRECISION CHECK (ultimo_precio IS NULL OR ultimo_precio > 0),
  cierre_previo DOUBLE PRECISION CHECK (cierre_previo IS NULL OR cierre_previo > 0),
  variacion_dia_pct DOUBLE PRECISION,
  market_cap_origen DOUBLE PRECISION CHECK (market_cap_origen IS NULL OR market_cap_origen > 0),
  nota_cotizacion TEXT NOT NULL,
  fuente_acciones TEXT,
  fuente_precio TEXT,
  mercado_actualizado_en TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tipo_cambio_cache (
  casa TEXT PRIMARY KEY CHECK (casa IN ('contadoconliqui', 'bolsa', 'oficial', 'usd_brl')),
  nombre TEXT NOT NULL,
  moneda_base TEXT NOT NULL DEFAULT 'USD',
  moneda_destino TEXT NOT NULL DEFAULT 'ARS',
  compra DOUBLE PRECISION,
  venta DOUBLE PRECISION NOT NULL CHECK (venta > 0),
  fuente TEXT NOT NULL,
  fuente_url TEXT NOT NULL,
  fecha_actualizacion TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_empresas_mercado_tipo ON public.empresas_mercado (tipo_cotizacion);

ALTER TABLE public.empresas_mercado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_cambio_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresas_mercado_select_public" ON public.empresas_mercado;
CREATE POLICY "empresas_mercado_select_public"
  ON public.empresas_mercado
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "tipo_cambio_cache_select_public" ON public.tipo_cambio_cache;
CREATE POLICY "tipo_cambio_cache_select_public"
  ON public.tipo_cambio_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.empresas_mercado TO anon, authenticated;
GRANT SELECT ON public.tipo_cambio_cache TO anon, authenticated;

INSERT INTO public.tipo_cambio_cache (casa, nombre, moneda_base, moneda_destino, compra, venta, fuente, fuente_url, fecha_actualizacion)
VALUES
  ('contadoconliqui', 'Dólar CCL', 'USD', 'ARS', 1775.9, 1776.2, 'DolarApi.com (referencia CCL)', 'https://dolarapi.com/v1/dolares', '2026-11-25T18:55:00Z'),
  ('bolsa', 'Dólar MEP', 'USD', 'ARS', 1678.8, 1680.8, 'DolarApi.com (referencia MEP)', 'https://dolarapi.com/v1/dolares', '2026-11-25T18:55:00Z'),
  ('oficial', 'Dólar Oficial', 'USD', 'ARS', 1580.0, 1630.0, 'DolarApi.com / BCRA (Oficial)', 'https://dolarapi.com/v1/dolares', '2026-11-25T16:00:00Z'),
  ('usd_brl', 'USD / BRL', 'USD', 'BRL', NULL, 5.8101, 'Yahoo Finance (BRL=X)', 'https://finance.yahoo.com/quote/BRL=X', '2026-11-25T19:00:00Z')
ON CONFLICT (casa) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  compra = EXCLUDED.compra,
  venta = EXCLUDED.venta,
  fuente = EXCLUDED.fuente,
  fuente_url = EXCLUDED.fuente_url,
  fecha_actualizacion = EXCLUDED.fecha_actualizacion,
  updated_at = now();

INSERT INTO public.empresas_mercado (
  empresa_id, tipo_cotizacion, entidad_cotizante, ticker, ticker_feed, bolsa, moneda_origen,
  acciones_circulacion, ultimo_precio, cierre_previo, variacion_dia_pct, market_cap_origen,
  nota_cotizacion, fuente_acciones, fuente_precio, mercado_actualizado_en
)
VALUES
  (
    'aluar-saic', 'directa_local', 'Aluar Aluminio Argentino S.A.I.C.', 'ALUA', 'ALUA.BA', 'BYMA', 'ARS',
    2800000000, 820.0, 798.5, 2.69, 2800000000::double precision * 820.0,
    'Cotización directa en BYMA (acciones ordinarias VN $1). Capitalización calculada sobre 2.800.000.000 acciones auditadas ante CNV.',
    'Estados Financieros Aluar 56° Ejercicio (CNV, 2.800.000.000 acciones ordinarias)',
    'BYMA vía Yahoo Finance (ALUA.BA)',
    '2026-11-25T19:09:55Z'
  ),
  (
    'molinos-agro-sa', 'directa_local', 'Molinos Agro S.A.', 'MOLA', 'MOLA.BA', 'BYMA', 'ARS',
    49082024, 18300.0, 18925.0, -3.30, 49082024::double precision * 18300.0,
    'Cotización directa en BYMA (MOLA). Capitalización calculada sobre 49.082.024 acciones ordinarias totales (Clase A + Clase B, CNV/BYMA).',
    'Estados Contables y registro CNV/BYMA de Molinos Agro S.A. (49.082.024 acciones)',
    'BYMA vía Yahoo Finance (MOLA.BA)',
    '2026-11-25T19:10:29Z'
  ),
  (
    'rio-tinto-litio-ar', 'matriz_global', 'Rio Tinto Group (DLC)', 'RIO', 'RIO', 'NYSE', 'USD',
    1627226528, 74.58, 75.90, -1.74, 1627226528::double precision * 74.58,
    'Cotización del grupo matriz global (NYSE: RIO). Refleja la valuación mundial de Rio Tinto y no exclusivamente sus operaciones de litio en Argentina.',
    'Rio Tinto Form 20-F 2025 ante SEC (1.627.226.528 acciones ordinarias DLC al 31/12/2025)',
    'NYSE vía Yahoo Finance (RIO)',
    '2026-11-25T19:30:26Z'
  ),
  (
    'dow-pbbpolisur', 'matriz_global', 'Dow Inc.', 'DOW', 'DOW', 'NYSE', 'USD',
    717534072, 29.77, 30.37, -1.98, 717534072::double precision * 29.77,
    'Cotización del grupo matriz global (NYSE: DOW). Refleja la valuación mundial de Dow Inc. y no exclusivamente el complejo PBBPolisur de Bahía Blanca.',
    'Dow Inc. Form 10-K 2025 ante SEC (717.534.072 acciones ordinarias al 15/01/2026)',
    'NYSE vía Yahoo Finance (DOW)',
    '2026-11-25T19:30:33Z'
  ),
  (
    'unipar-indupa', 'matriz_global', 'Unipar Carbocloro S.A.', 'UNIP6', 'UNIP6.SA', 'B3', 'BRL',
    113173265, 49.26, 49.50, -0.48, 113173265::double precision * 49.26,
    'Cotización del grupo matriz regional en Brasil (B3: UNIP6). Refleja la valuación consolidada de Unipar y no exclusivamente la planta de Bahía Blanca.',
    'Unipar RI / B3 (113.173.265 acciones totales: ON UNIP3 + PNA UNIP5 + PNB UNIP6)',
    'B3 vía Yahoo Finance (UNIP6.SA)',
    '2026-11-25T19:13:21Z'
  ),
  (
    'profertil-sa', 'no_cotiza', NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL,
    'Empresa cerrada; no cotiza en oferta pública. Al 31/12/2025 su capital pertenece 90% a Grupo Adecoagro (NYSE: AGRO) y 10% a ACA.',
    NULL, NULL, NULL
  ),
  (
    'renova-sa', 'no_cotiza', NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL,
    'Empresa privada cerrada; no cotiza en oferta pública.',
    NULL, NULL, NULL
  ),
  (
    'buyatti-saica', 'no_cotiza', NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL,
    'Empresa privada de capital nacional; no cotiza en oferta pública.',
    NULL, NULL, NULL
  )
ON CONFLICT (empresa_id) DO UPDATE SET
  tipo_cotizacion = EXCLUDED.tipo_cotizacion,
  entidad_cotizante = EXCLUDED.entidad_cotizante,
  ticker = EXCLUDED.ticker,
  ticker_feed = EXCLUDED.ticker_feed,
  bolsa = EXCLUDED.bolsa,
  moneda_origen = EXCLUDED.moneda_origen,
  acciones_circulacion = EXCLUDED.acciones_circulacion,
  ultimo_precio = EXCLUDED.ultimo_precio,
  cierre_previo = EXCLUDED.cierre_previo,
  variacion_dia_pct = EXCLUDED.variacion_dia_pct,
  market_cap_origen = EXCLUDED.market_cap_origen,
  nota_cotizacion = EXCLUDED.nota_cotizacion,
  fuente_acciones = EXCLUDED.fuente_acciones,
  fuente_precio = EXCLUDED.fuente_precio,
  mercado_actualizado_en = EXCLUDED.mercado_actualizado_en,
  updated_at = now();
