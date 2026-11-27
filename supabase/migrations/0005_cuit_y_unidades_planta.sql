-- Etapa 11: Identidad fiscal (CUIT) en empresas y tabla N:M unidades_planta (planta <-> proceso <-> producto)
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS cuit TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'empresas_cuit_format_chk'
  ) THEN
    ALTER TABLE public.empresas
      ADD CONSTRAINT empresas_cuit_format_chk
      CHECK (cuit IS NULL OR cuit ~ '^\d{2}-\d{8}-\d$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_cuit_unique
  ON public.empresas (cuit)
  WHERE cuit IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.unidades_planta (
  unidad_id TEXT PRIMARY KEY,
  planta_id TEXT NOT NULL REFERENCES public.plantas (planta_id) ON DELETE CASCADE,
  proceso_id TEXT NOT NULL REFERENCES public.procesos (proceso_id) ON DELETE RESTRICT,
  producto_id TEXT NOT NULL REFERENCES public.productos (producto_id) ON DELETE RESTRICT,
  nombre_unidad TEXT NOT NULL,
  rol_unidad TEXT NOT NULL DEFAULT 'principal'
    CHECK (rol_unidad IN ('principal', 'integrada', 'subproducto', 'servicios')),
  capacidad_valor DOUBLE PRECISION,
  capacidad_estado TEXT NOT NULL CHECK (capacidad_estado IN ('dato', 'sin_datos')),
  capacidad_unidad TEXT,
  anio SMALLINT NOT NULL CHECK (anio BETWEEN 1900 AND 2100),
  fuente_id TEXT NOT NULL REFERENCES public.fuentes (fuente_id) ON DELETE RESTRICT,
  cita_ubicacion TEXT NOT NULL,
  confianza TEXT NOT NULL CHECK (confianza IN ('alta', 'media', 'baja', 'ejemplo')),
  CONSTRAINT unidades_planta_cap_chk CHECK (
    (capacidad_estado = 'dato' AND capacidad_valor IS NOT NULL AND capacidad_unidad IS NOT NULL)
    OR (capacidad_estado = 'sin_datos' AND capacidad_valor IS NULL)
  ),
  CONSTRAINT unidades_planta_unique_triple UNIQUE (planta_id, proceso_id, nombre_unidad)
);

CREATE INDEX IF NOT EXISTS idx_unidades_planta_planta ON public.unidades_planta (planta_id);
CREATE INDEX IF NOT EXISTS idx_unidades_planta_proceso ON public.unidades_planta (proceso_id);
CREATE INDEX IF NOT EXISTS idx_unidades_planta_producto ON public.unidades_planta (producto_id);
CREATE INDEX IF NOT EXISTS idx_unidades_planta_fuente ON public.unidades_planta (fuente_id);

ALTER TABLE public.unidades_planta ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'unidades_planta'
      AND policyname = 'Lectura pública de unidades_planta'
  ) THEN
    CREATE POLICY "Lectura pública de unidades_planta"
      ON public.unidades_planta
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;
