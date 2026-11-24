-- =============================================================================
-- Atlas Químico Argentino — Bucket privado en Supabase Storage para fuentes crudas
-- =============================================================================
-- Evita acumular PDFs, Excels y CSVs pesados en el disco local del usuario.
-- Solo el pipeline offline (con SUPABASE_SERVICE_ROLE_KEY en .env local) puede
-- subir y leer objetos; `anon` y `authenticated` no tienen acceso público.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'atlas-raw-sources',
  'atlas-raw-sources',
  FALSE,
  52428800,
  ARRAY[
    'application/pdf',
    'text/csv',
    'application/json',
    'text/html',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
