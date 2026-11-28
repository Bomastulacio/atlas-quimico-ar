-- Etapa 12: Grupos societarios multi-CUIT en empresas y red de suministros B2B verificable (vinculos_b2b)
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS empresa_matriz_id TEXT REFERENCES public.empresas (empresa_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rol_societario TEXT NOT NULL DEFAULT 'operadora_industrial',
  ADD COLUMN IF NOT EXISTS participacion_matriz_pct DOUBLE PRECISION;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'empresas_rol_societario_chk'
  ) THEN
    ALTER TABLE public.empresas
      ADD CONSTRAINT empresas_rol_societario_chk
      CHECK (
        rol_societario IN (
          'operadora_industrial',
          'logistica_puerto',
          'energia_utilidades',
          'comercializadora',
          'ingenieria_servicios',
          'vpu_rigi',
          'holding',
          'agrupamiento'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'empresas_matriz_no_self_chk'
  ) THEN
    ALTER TABLE public.empresas
      ADD CONSTRAINT empresas_matriz_no_self_chk
      CHECK (empresa_matriz_id IS NULL OR empresa_matriz_id <> empresa_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'empresas_participacion_pct_chk'
  ) THEN
    ALTER TABLE public.empresas
      ADD CONSTRAINT empresas_participacion_pct_chk
      CHECK (
        participacion_matriz_pct IS NULL
        OR (participacion_matriz_pct > 0 AND participacion_matriz_pct <= 100)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_empresas_matriz
  ON public.empresas (empresa_matriz_id)
  WHERE empresa_matriz_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.vinculos_b2b (
  vinculo_id TEXT PRIMARY KEY,
  proveedor_empresa_id TEXT NOT NULL REFERENCES public.empresas (empresa_id) ON DELETE RESTRICT,
  cliente_empresa_id TEXT NOT NULL REFERENCES public.empresas (empresa_id) ON DELETE RESTRICT,
  tipo_vinculo TEXT NOT NULL CHECK (
    tipo_vinculo IN (
      'suministro_insumo',
      'energia_electrica',
      'logistica_ducto',
      'logistica_puerto',
      'ingenieria_montaje',
      'comercializacion_producto'
    )
  ),
  insumo_o_servicio TEXT NOT NULL,
  producto_id TEXT REFERENCES public.productos (producto_id) ON DELETE SET NULL,
  planta_cliente_id TEXT REFERENCES public.plantas (planta_id) ON DELETE SET NULL,
  relacion_societaria TEXT NOT NULL CHECK (
    relacion_societaria IN (
      'controlada',
      'vinculada_jv',
      'tercero_independiente'
    )
  ),
  volumen_valor DOUBLE PRECISION,
  volumen_estado TEXT NOT NULL CHECK (volumen_estado IN ('dato', 'sin_datos')),
  volumen_unidad TEXT,
  anio SMALLINT NOT NULL CHECK (anio BETWEEN 1900 AND 2100),
  fuente_id TEXT NOT NULL REFERENCES public.fuentes (fuente_id) ON DELETE RESTRICT,
  cita_ubicacion TEXT NOT NULL,
  confianza TEXT NOT NULL CHECK (confianza IN ('alta', 'media', 'baja', 'ejemplo')),
  CONSTRAINT vinculos_b2b_distintas_chk CHECK (proveedor_empresa_id <> cliente_empresa_id),
  CONSTRAINT vinculos_b2b_vol_chk CHECK (
    (volumen_estado = 'dato' AND volumen_valor IS NOT NULL AND volumen_unidad IS NOT NULL)
    OR (volumen_estado = 'sin_datos' AND volumen_valor IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_vinculos_b2b_proveedor ON public.vinculos_b2b (proveedor_empresa_id);
CREATE INDEX IF NOT EXISTS idx_vinculos_b2b_cliente ON public.vinculos_b2b (cliente_empresa_id);
CREATE INDEX IF NOT EXISTS idx_vinculos_b2b_producto ON public.vinculos_b2b (producto_id) WHERE producto_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vinculos_b2b_planta_cliente ON public.vinculos_b2b (planta_cliente_id) WHERE planta_cliente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vinculos_b2b_fuente ON public.vinculos_b2b (fuente_id);

ALTER TABLE public.vinculos_b2b ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vinculos_b2b'
      AND policyname = 'Lectura pública de vinculos_b2b'
  ) THEN
    CREATE POLICY "Lectura pública de vinculos_b2b"
      ON public.vinculos_b2b
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;
