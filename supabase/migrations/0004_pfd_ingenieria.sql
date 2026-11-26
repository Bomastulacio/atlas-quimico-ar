-- Migración 0004: Diagramas de Flujo de Proceso (PFD ISO 10628) y Tablas de Corrientes verificadas
-- Proyecto: Atlas Químico Argentino (Supabase Postgres 17)
-- Regla de seguridad: RLS habilitado; SELECT público (anon, authenticated); escritura exclusiva service_role.

CREATE TABLE IF NOT EXISTS public.pfd_procesos (
  proceso_id TEXT PRIMARY KEY REFERENCES public.procesos(proceso_id) ON DELETE CASCADE,
  producto_id TEXT NOT NULL REFERENCES public.productos(producto_id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  norma_simbologia TEXT NOT NULL DEFAULT 'ISO 10628 / ASME',
  base_calculo TEXT NOT NULL,
  resumen_tecnico TEXT NOT NULL,
  nota_metodologica TEXT NOT NULL,
  canvas_width INTEGER NOT NULL CHECK (canvas_width > 0),
  canvas_height INTEGER NOT NULL CHECK (canvas_height > 0),
  secciones JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipos JSONB NOT NULL DEFAULT '[]'::jsonb,
  corrientes JSONB NOT NULL DEFAULT '[]'::jsonb,
  servicios JSONB NOT NULL DEFAULT '[]'::jsonb,
  limites_bateria JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pfd_procesos_producto ON public.pfd_procesos (producto_id);

ALTER TABLE public.pfd_procesos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pfd_procesos_select_public" ON public.pfd_procesos;
CREATE POLICY "pfd_procesos_select_public"
  ON public.pfd_procesos
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.pfd_procesos TO anon, authenticated;
