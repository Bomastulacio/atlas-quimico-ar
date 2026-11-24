-- =============================================================================
-- Atlas Químico Argentino — Esquema relacional PostgreSQL / Supabase (v1.0.0)
-- =============================================================================
-- Espejo 1:1 de las 12 tablas definidas en docs/datos.md y src/schemas/entities.ts
-- + tabla de metadatos `atlas_manifest`.
--
-- Reglas de integridad implementadas a nivel base de datos:
-- 1. Toda cifra numérica exige coherencia entre `*_estado` ('dato' | 'sin_datos')
--    y `*_valor` (NULL obligatorio cuando estado = 'sin_datos').
-- 2. Toda tabla de datos o hechos verificables exige FK a `fuentes` (con URL y SHA-256).
-- 3. RLS habilitado en todas las tablas: lectura pública (`SELECT`) y escritura
--    restringida exclusivamente a roles privilegiados (migraciones / pipeline).
-- =============================================================================

-- 0. Metadatos del dataset compilado
CREATE TABLE IF NOT EXISTS public.atlas_manifest (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  version_esquema TEXT NOT NULL,
  generado_en TIMESTAMPTZ NOT NULL,
  origen TEXT NOT NULL CHECK (origen IN ('google_sheets', 'sheets_local', 'fixtures_ejemplo', 'supabase')),
  es_ejemplo BOOLEAN NOT NULL,
  nota TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1. Catálogo central de fuentes y procedencia
CREATE TABLE IF NOT EXISTS public.fuentes (
  fuente_id TEXT PRIMARY KEY CHECK (fuente_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre TEXT NOT NULL,
  organismo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('oficial', 'tecnica', 'empresa', 'ejemplo')),
  url TEXT NOT NULL CHECK (url ~ '^https?://'),
  fecha_descarga DATE NOT NULL,
  hash TEXT NOT NULL CHECK (hash ~* '^sha256:[a-f0-9]{64}$'),
  archivo_raw TEXT,
  notas TEXT
);

-- 2. Provincias (24 jurisdicciones oficiales IGN / Georef v2.0)
CREATE TABLE IF NOT EXISTS public.provincias (
  provincia_id CHAR(2) PRIMARY KEY CHECK (provincia_id ~ '^\d{2}$'),
  nombre TEXT NOT NULL,
  iso_3166_2 TEXT NOT NULL UNIQUE CHECK (iso_3166_2 ~ '^AR-[A-Z]$'),
  region TEXT NOT NULL CHECK (region IN ('NOA', 'NEA', 'Cuyo', 'Centro', 'Pampeana', 'Patagonia')),
  cobertura_datos TEXT NOT NULL CHECK (cobertura_datos IN ('completa', 'parcial', 'baja', 'sin_datos')),
  nota_cobertura TEXT
);

-- 3. Departamentos (solo donde existan datos confiables)
CREATE TABLE IF NOT EXISTS public.departamentos (
  departamento_id CHAR(5) PRIMARY KEY CHECK (departamento_id ~ '^\d{5}$'),
  provincia_id CHAR(2) NOT NULL REFERENCES public.provincias(provincia_id) ON UPDATE CASCADE,
  nombre TEXT NOT NULL,
  tipo_zona TEXT NOT NULL CHECK (tipo_zona IN ('agro', 'polo_industrial', 'minero', 'energetico', 'mixto')),
  tiene_datos_confiables BOOLEAN NOT NULL,
  cobertura_datos TEXT NOT NULL CHECK (cobertura_datos IN ('completa', 'parcial', 'baja', 'sin_datos')),
  nota_cobertura TEXT,
  CONSTRAINT departamentos_prefijo_provincia_chk CHECK (LEFT(departamento_id, 2) = provincia_id)
);

-- 4. Catálogo de productos y cadenas químicas
CREATE TABLE IF NOT EXISTS public.productos (
  producto_id TEXT PRIMARY KEY CHECK (producto_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('metalurgia', 'mineria_quimica', 'fertilizantes', 'agroindustria', 'petroquimica', 'bioenergia')),
  formula_quimica TEXT,
  icono_id TEXT NOT NULL CHECK (icono_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  descripcion_corta TEXT NOT NULL,
  mdx_slug TEXT CHECK (mdx_slug IS NULL OR mdx_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  estado_mvp TEXT NOT NULL CHECK (estado_mvp IN ('ejemplo', 'en_curso', 'validado', 'pendiente'))
);

-- 5. Relación territorial N:M entre productos y provincias/departamentos
CREATE TABLE IF NOT EXISTS public.productos_zonas (
  relacion_id TEXT PRIMARY KEY CHECK (relacion_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  producto_id TEXT NOT NULL REFERENCES public.productos(producto_id) ON UPDATE CASCADE,
  provincia_id CHAR(2) NOT NULL REFERENCES public.provincias(provincia_id) ON UPDATE CASCADE,
  departamento_id CHAR(5) REFERENCES public.departamentos(departamento_id) ON UPDATE CASCADE,
  es_dominante BOOLEAN NOT NULL,
  rol_en_cadena TEXT NOT NULL CHECK (rol_en_cadena IN ('extraccion', 'procesamiento', 'refinacion', 'sintesis', 'logistica_export')),
  anio SMALLINT NOT NULL CHECK (anio BETWEEN 1900 AND 2100),
  fuente_id TEXT NOT NULL REFERENCES public.fuentes(fuente_id) ON UPDATE CASCADE,
  cita_ubicacion TEXT NOT NULL,
  confianza TEXT NOT NULL CHECK (confianza IN ('alta', 'media', 'baja', 'ejemplo')),
  CONSTRAINT productos_zonas_depto_prov_chk CHECK (departamento_id IS NULL OR LEFT(departamento_id, 2) = provincia_id)
);

-- 6. Procesos químicos (cabecera)
CREATE TABLE IF NOT EXISTS public.procesos (
  proceso_id TEXT PRIMARY KEY CHECK (proceso_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  producto_id TEXT NOT NULL REFERENCES public.productos(producto_id) ON UPDATE CASCADE,
  nombre TEXT NOT NULL,
  ruta_tecnologica TEXT NOT NULL,
  reaccion_global TEXT,
  energia_especifica_valor DOUBLE PRECISION,
  energia_especifica_estado TEXT NOT NULL CHECK (energia_especifica_estado IN ('dato', 'sin_datos')),
  energia_especifica_unidad TEXT,
  descripcion TEXT NOT NULL,
  anio SMALLINT NOT NULL CHECK (anio BETWEEN 1900 AND 2100),
  fuente_id TEXT NOT NULL REFERENCES public.fuentes(fuente_id) ON UPDATE CASCADE,
  cita_ubicacion TEXT NOT NULL,
  confianza TEXT NOT NULL CHECK (confianza IN ('alta', 'media', 'baja', 'ejemplo')),
  CONSTRAINT procesos_energia_chk CHECK (
    (energia_especifica_estado = 'dato' AND energia_especifica_valor IS NOT NULL AND energia_especifica_unidad IS NOT NULL)
    OR (energia_especifica_estado = 'sin_datos' AND energia_especifica_valor IS NULL)
  )
);

-- 7. Pasos de proceso (nodos React Flow + entrada del verificador químico)
CREATE TABLE IF NOT EXISTS public.pasos_proceso (
  paso_id TEXT PRIMARY KEY CHECK (paso_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  proceso_id TEXT NOT NULL REFERENCES public.procesos(proceso_id) ON DELETE CASCADE ON UPDATE CASCADE,
  orden SMALLINT NOT NULL CHECK (orden > 0),
  nombre TEXT NOT NULL,
  tipo_paso TEXT NOT NULL CHECK (tipo_paso IN ('materia_prima', 'preparacion', 'reaccion', 'separacion', 'refinacion', 'producto', 'subproducto', 'emision')),
  reaccion_balanceada TEXT,
  temperatura_c TEXT,
  presion_bar TEXT,
  reactivos JSONB NOT NULL DEFAULT '[]'::jsonb,
  productos JSONB NOT NULL DEFAULT '[]'::jsonb,
  insumos JSONB NOT NULL DEFAULT '[]'::jsonb,
  subproductos JSONB NOT NULL DEFAULT '[]'::jsonb,
  energia_valor DOUBLE PRECISION,
  energia_estado TEXT NOT NULL CHECK (energia_estado IN ('dato', 'sin_datos')),
  energia_unidad TEXT,
  descripcion TEXT NOT NULL,
  pos_x DOUBLE PRECISION NOT NULL,
  pos_y DOUBLE PRECISION NOT NULL,
  anio SMALLINT NOT NULL CHECK (anio BETWEEN 1900 AND 2100),
  fuente_id TEXT NOT NULL REFERENCES public.fuentes(fuente_id) ON UPDATE CASCADE,
  cita_ubicacion TEXT NOT NULL,
  confianza TEXT NOT NULL CHECK (confianza IN ('alta', 'media', 'baja', 'ejemplo')),
  CONSTRAINT pasos_energia_chk CHECK (
    (energia_estado = 'dato' AND energia_valor IS NOT NULL AND energia_unidad IS NOT NULL)
    OR (energia_estado = 'sin_datos' AND energia_valor IS NULL)
  )
);

-- 8. Conexiones entre pasos (aristas React Flow y corrientes de masa)
CREATE TABLE IF NOT EXISTS public.conexiones_proceso (
  conexion_id TEXT PRIMARY KEY CHECK (conexion_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  proceso_id TEXT NOT NULL REFERENCES public.procesos(proceso_id) ON DELETE CASCADE ON UPDATE CASCADE,
  origen_paso_id TEXT NOT NULL REFERENCES public.pasos_proceso(paso_id) ON DELETE CASCADE ON UPDATE CASCADE,
  destino_paso_id TEXT NOT NULL REFERENCES public.pasos_proceso(paso_id) ON DELETE CASCADE ON UPDATE CASCADE,
  corriente_nombre TEXT NOT NULL,
  tipo_corriente TEXT NOT NULL CHECK (tipo_corriente IN ('principal', 'insumo', 'subproducto', 'reciclo', 'emision', 'residuo')),
  flujo_valor DOUBLE PRECISION,
  flujo_estado TEXT NOT NULL CHECK (flujo_estado IN ('dato', 'sin_datos')),
  flujo_unidad TEXT,
  anio SMALLINT NOT NULL CHECK (anio BETWEEN 1900 AND 2100),
  fuente_id TEXT NOT NULL REFERENCES public.fuentes(fuente_id) ON UPDATE CASCADE,
  cita_ubicacion TEXT NOT NULL,
  confianza TEXT NOT NULL CHECK (confianza IN ('alta', 'media', 'baja', 'ejemplo')),
  CONSTRAINT conexiones_no_bucle_chk CHECK (origen_paso_id <> destino_paso_id),
  CONSTRAINT conexiones_flujo_chk CHECK (
    (flujo_estado = 'dato' AND flujo_valor IS NOT NULL AND flujo_unidad IS NOT NULL)
    OR (flujo_estado = 'sin_datos' AND flujo_valor IS NULL)
  )
);

-- 9. Empresas predominantes (solo hechos verificables)
CREATE TABLE IF NOT EXISTS public.empresas (
  empresa_id TEXT PRIMARY KEY CHECK (empresa_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  razon_social TEXT NOT NULL,
  tipo_capital TEXT NOT NULL CHECK (tipo_capital IN ('nacional', 'extranjero', 'mixto', 'estatal', 'sin_datos')),
  sitio_web_oficial TEXT CHECK (sitio_web_oficial IS NULL OR sitio_web_oficial ~ '^https?://'),
  hechos_verificables TEXT NOT NULL,
  anio SMALLINT NOT NULL CHECK (anio BETWEEN 1900 AND 2100),
  fuente_id TEXT NOT NULL REFERENCES public.fuentes(fuente_id) ON UPDATE CASCADE,
  cita_ubicacion TEXT NOT NULL,
  confianza TEXT NOT NULL CHECK (confianza IN ('alta', 'media', 'baja', 'ejemplo'))
);

-- 10. Plantas georreferenciadas
CREATE TABLE IF NOT EXISTS public.plantas (
  planta_id TEXT PRIMARY KEY CHECK (planta_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  empresa_id TEXT NOT NULL REFERENCES public.empresas(empresa_id) ON UPDATE CASCADE,
  producto_id TEXT NOT NULL REFERENCES public.productos(producto_id) ON UPDATE CASCADE,
  provincia_id CHAR(2) NOT NULL REFERENCES public.provincias(provincia_id) ON UPDATE CASCADE,
  departamento_id CHAR(5) REFERENCES public.departamentos(departamento_id) ON UPDATE CASCADE,
  nombre TEXT NOT NULL,
  localidad TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -56 AND -21),
  lon DOUBLE PRECISION NOT NULL CHECK (lon BETWEEN -74 AND -53),
  estado_operativo TEXT NOT NULL CHECK (estado_operativo IN ('operativa', 'en_construccion', 'ampliacion', 'inactiva', 'sin_datos')),
  capacidad_valor DOUBLE PRECISION,
  capacidad_estado TEXT NOT NULL CHECK (capacidad_estado IN ('dato', 'sin_datos')),
  capacidad_unidad TEXT,
  anio SMALLINT NOT NULL CHECK (anio BETWEEN 1900 AND 2100),
  fuente_id TEXT NOT NULL REFERENCES public.fuentes(fuente_id) ON UPDATE CASCADE,
  cita_ubicacion TEXT NOT NULL,
  confianza TEXT NOT NULL CHECK (confianza IN ('alta', 'media', 'baja', 'ejemplo')),
  CONSTRAINT plantas_depto_prov_chk CHECK (departamento_id IS NULL OR LEFT(departamento_id, 2) = provincia_id),
  CONSTRAINT plantas_capacidad_chk CHECK (
    (capacidad_estado = 'dato' AND capacidad_valor IS NOT NULL AND capacidad_unidad IS NOT NULL)
    OR (capacidad_estado = 'sin_datos' AND capacidad_valor IS NULL)
  )
);

-- 11. Series de producción física
CREATE TABLE IF NOT EXISTS public.produccion (
  registro_id TEXT PRIMARY KEY CHECK (registro_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  producto_id TEXT NOT NULL REFERENCES public.productos(producto_id) ON UPDATE CASCADE,
  provincia_id CHAR(2) REFERENCES public.provincias(provincia_id) ON UPDATE CASCADE,
  anio SMALLINT NOT NULL CHECK (anio BETWEEN 1900 AND 2100),
  valor DOUBLE PRECISION,
  estado TEXT NOT NULL CHECK (estado IN ('dato', 'sin_datos')),
  unidad TEXT,
  fuente_id TEXT NOT NULL REFERENCES public.fuentes(fuente_id) ON UPDATE CASCADE,
  cita_ubicacion TEXT NOT NULL,
  confianza TEXT NOT NULL CHECK (confianza IN ('alta', 'media', 'baja', 'ejemplo')),
  CONSTRAINT produccion_valor_chk CHECK (
    (estado = 'dato' AND valor IS NOT NULL AND unidad IS NOT NULL)
    OR (estado = 'sin_datos' AND valor IS NULL)
  )
);

-- 12. Comercio exterior (INDEC / UN Comtrade)
CREATE TABLE IF NOT EXISTS public.comercio_exterior (
  registro_id TEXT PRIMARY KEY CHECK (registro_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  producto_id TEXT NOT NULL REFERENCES public.productos(producto_id) ON UPDATE CASCADE,
  anio SMALLINT NOT NULL CHECK (anio BETWEEN 1900 AND 2100),
  ncm_codigo TEXT,
  metrica TEXT NOT NULL CHECK (metrica IN ('valor_usd', 'volumen_t')),
  exportacion_valor DOUBLE PRECISION,
  exportacion_estado TEXT NOT NULL CHECK (exportacion_estado IN ('dato', 'sin_datos')),
  importacion_valor DOUBLE PRECISION,
  importacion_estado TEXT NOT NULL CHECK (importacion_estado IN ('dato', 'sin_datos')),
  saldo_comercial_valor DOUBLE PRECISION,
  saldo_comercial_estado TEXT NOT NULL CHECK (saldo_comercial_estado IN ('dato', 'sin_datos')),
  unidad TEXT,
  fuente_id TEXT NOT NULL REFERENCES public.fuentes(fuente_id) ON UPDATE CASCADE,
  cita_ubicacion TEXT NOT NULL,
  confianza TEXT NOT NULL CHECK (confianza IN ('alta', 'media', 'baja', 'ejemplo')),
  CONSTRAINT comex_exp_chk CHECK (
    (exportacion_estado = 'dato' AND exportacion_valor IS NOT NULL AND unidad IS NOT NULL)
    OR (exportacion_estado = 'sin_datos' AND exportacion_valor IS NULL)
  ),
  CONSTRAINT comex_imp_chk CHECK (
    (importacion_estado = 'dato' AND importacion_valor IS NOT NULL AND unidad IS NOT NULL)
    OR (importacion_estado = 'sin_datos' AND importacion_valor IS NULL)
  ),
  CONSTRAINT comex_saldo_chk CHECK (
    (saldo_comercial_estado = 'dato' AND saldo_comercial_valor IS NOT NULL AND unidad IS NOT NULL)
    OR (saldo_comercial_estado = 'sin_datos' AND saldo_comercial_valor IS NULL)
  ),
  CONSTRAINT comex_saldo_coherencia_chk CHECK (
    NOT (exportacion_estado = 'dato' AND importacion_estado = 'dato' AND saldo_comercial_estado = 'dato')
    OR ABS(saldo_comercial_valor - (exportacion_valor - importacion_valor)) <= 0.01
  )
);

-- Índices en todas las claves foráneas y filtros frecuentes
CREATE INDEX IF NOT EXISTS idx_departamentos_provincia ON public.departamentos(provincia_id);
CREATE INDEX IF NOT EXISTS idx_productos_zonas_producto ON public.productos_zonas(producto_id);
CREATE INDEX IF NOT EXISTS idx_productos_zonas_provincia ON public.productos_zonas(provincia_id);
CREATE INDEX IF NOT EXISTS idx_productos_zonas_departamento ON public.productos_zonas(departamento_id);
CREATE INDEX IF NOT EXISTS idx_productos_zonas_fuente ON public.productos_zonas(fuente_id);
CREATE INDEX IF NOT EXISTS idx_procesos_producto ON public.procesos(producto_id);
CREATE INDEX IF NOT EXISTS idx_procesos_fuente ON public.procesos(fuente_id);
CREATE INDEX IF NOT EXISTS idx_pasos_proceso_proceso_orden ON public.pasos_proceso(proceso_id, orden);
CREATE INDEX IF NOT EXISTS idx_pasos_proceso_fuente ON public.pasos_proceso(fuente_id);
CREATE INDEX IF NOT EXISTS idx_conexiones_proceso_proceso ON public.conexiones_proceso(proceso_id);
CREATE INDEX IF NOT EXISTS idx_conexiones_proceso_origen ON public.conexiones_proceso(origen_paso_id);
CREATE INDEX IF NOT EXISTS idx_conexiones_proceso_destino ON public.conexiones_proceso(destino_paso_id);
CREATE INDEX IF NOT EXISTS idx_conexiones_proceso_fuente ON public.conexiones_proceso(fuente_id);
CREATE INDEX IF NOT EXISTS idx_empresas_fuente ON public.empresas(fuente_id);
CREATE INDEX IF NOT EXISTS idx_plantas_empresa ON public.plantas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_plantas_producto ON public.plantas(producto_id);
CREATE INDEX IF NOT EXISTS idx_plantas_provincia ON public.plantas(provincia_id);
CREATE INDEX IF NOT EXISTS idx_plantas_departamento ON public.plantas(departamento_id);
CREATE INDEX IF NOT EXISTS idx_plantas_fuente ON public.plantas(fuente_id);
CREATE INDEX IF NOT EXISTS idx_produccion_producto_anio ON public.produccion(producto_id, anio DESC);
CREATE INDEX IF NOT EXISTS idx_produccion_provincia ON public.produccion(provincia_id);
CREATE INDEX IF NOT EXISTS idx_produccion_fuente ON public.produccion(fuente_id);
CREATE INDEX IF NOT EXISTS idx_comex_producto_anio ON public.comercio_exterior(producto_id, anio DESC);
CREATE INDEX IF NOT EXISTS idx_comex_fuente ON public.comercio_exterior(fuente_id);

-- Seguridad: Row Level Security y permisos mínimos (lectura pública, escritura restringida)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'atlas_manifest',
    'fuentes',
    'provincias',
    'departamentos',
    'productos',
    'productos_zonas',
    'procesos',
    'pasos_proceso',
    'conexiones_proceso',
    'empresas',
    'plantas',
    'produccion',
    'comercio_exterior'
  ]
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated;', tbl);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format(
      'CREATE POLICY "Lectura publica" ON public.%I FOR SELECT TO anon, authenticated USING (true);',
      tbl
    );
  END LOOP;
END $$;
