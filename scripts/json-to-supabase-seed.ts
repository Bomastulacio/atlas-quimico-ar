/**
 * Compila `data/validated/*.json` (ya validados por Zod) a un archivo SQL
 * idempotente (`supabase/seed.sql`) listo para ejecutarse en Supabase / PostgreSQL.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  AtlasDatasetSchema,
  PfdDatasetSchema,
  validateDatasetIntegrity,
  type AtlasDataset,
} from '../src/schemas';

const ROOT_DIR = process.cwd();
const VALIDATED_DIR = path.join(ROOT_DIR, 'data', 'validated');
const OUT_PATH = path.join(ROOT_DIR, 'supabase', 'seed.sql');

async function readValidated<T>(fileName: string): Promise<T> {
  const raw = await fs.readFile(path.join(VALIDATED_DIR, fileName), 'utf-8');
  return JSON.parse(raw) as T;
}

function sqlVal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`Número no finito: ${v}`);
    return String(v);
  }
  if (typeof v === 'string') {
    return `'${v.replace(/'/g, "''")}'`;
  }
  throw new Error(`Tipo no soportado para SQL: ${typeof v}`);
}

function sqlJsonb(v: unknown): string {
  const raw = JSON.stringify(v);
  return `'${raw.replace(/'/g, "''")}'::jsonb`;
}

function upsertBlock(
  table: string,
  pk: string,
  columns: string[],
  rows: string[][]
): string {
  if (rows.length === 0) return `-- (${table}: 0 filas)\n`;
  const colList = columns.join(', ');
  const valuesList = rows.map((r) => `  (${r.join(', ')})`).join(',\n');
  const updateList = columns
    .filter((c) => c !== pk)
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(', ');

  return [
    `-- Tabla: public.${table} (${rows.length} filas)`,
    `INSERT INTO public.${table} (${colList}) VALUES`,
    `${valuesList}`,
    `ON CONFLICT (${pk}) DO UPDATE SET ${updateList};`,
    '',
  ].join('\n');
}

async function main() {
  const dataset: AtlasDataset = AtlasDatasetSchema.parse({
    manifest: await readValidated('manifest.json'),
    fuentes: await readValidated('fuentes.json'),
    provincias: await readValidated('provincias.json'),
    departamentos: await readValidated('departamentos.json'),
    productos: await readValidated('productos.json'),
    productos_zonas: await readValidated('productos_zonas.json'),
    procesos: await readValidated('procesos.json'),
    pasos_proceso: await readValidated('pasos_proceso.json'),
    conexiones_proceso: await readValidated('conexiones_proceso.json'),
    empresas: await readValidated('empresas.json'),
    plantas: await readValidated('plantas.json'),
    produccion: await readValidated('produccion.json'),
    comercio_exterior: await readValidated('comercio_exterior.json'),
  });

  const integrity = validateDatasetIntegrity(dataset);
  if (!integrity.ok) {
    console.error('[supabase:seed] Falló integridad referencial:', integrity.errors);
    process.exit(1);
  }

  const pfdList = PfdDatasetSchema.parse(await readValidated('pfd_procesos.json'));

  const sections: string[] = [
    '-- =============================================================================',
    '-- Atlas Químico Argentino — Seed idempotente generado desde data/validated/',
    `-- Generado: ${new Date().toISOString()}`,
    '-- =============================================================================',
    'BEGIN;',
    '',
    upsertBlock(
      'atlas_manifest',
      'id',
      ['id', 'version_esquema', 'generado_en', 'origen', 'es_ejemplo', 'nota'],
      [
        [
          '1',
          sqlVal(dataset.manifest.version_esquema),
          sqlVal(dataset.manifest.generado_en),
          sqlVal(dataset.manifest.origen),
          sqlVal(dataset.manifest.es_ejemplo),
          sqlVal(dataset.manifest.nota),
        ],
      ]
    ),
    upsertBlock(
      'fuentes',
      'fuente_id',
      ['fuente_id', 'nombre', 'organismo', 'tipo', 'url', 'fecha_descarga', 'hash', 'archivo_raw', 'notas'],
      dataset.fuentes.map((f) => [
        sqlVal(f.fuente_id),
        sqlVal(f.nombre),
        sqlVal(f.organismo),
        sqlVal(f.tipo),
        sqlVal(f.url),
        sqlVal(f.fecha_descarga),
        sqlVal(f.hash),
        sqlVal(f.archivo_raw),
        sqlVal(f.notas),
      ])
    ),
    upsertBlock(
      'provincias',
      'provincia_id',
      ['provincia_id', 'nombre', 'iso_3166_2', 'region', 'cobertura_datos', 'nota_cobertura'],
      dataset.provincias.map((p) => [
        sqlVal(p.provincia_id),
        sqlVal(p.nombre),
        sqlVal(p.iso_3166_2),
        sqlVal(p.region),
        sqlVal(p.cobertura_datos),
        sqlVal(p.nota_cobertura),
      ])
    ),
    upsertBlock(
      'departamentos',
      'departamento_id',
      ['departamento_id', 'provincia_id', 'nombre', 'tipo_zona', 'tiene_datos_confiables', 'cobertura_datos', 'nota_cobertura'],
      dataset.departamentos.map((d) => [
        sqlVal(d.departamento_id),
        sqlVal(d.provincia_id),
        sqlVal(d.nombre),
        sqlVal(d.tipo_zona),
        sqlVal(d.tiene_datos_confiables),
        sqlVal(d.cobertura_datos),
        sqlVal(d.nota_cobertura),
      ])
    ),
    upsertBlock(
      'productos',
      'producto_id',
      ['producto_id', 'nombre', 'categoria', 'formula_quimica', 'icono_id', 'descripcion_corta', 'mdx_slug', 'estado_mvp'],
      dataset.productos.map((p) => [
        sqlVal(p.producto_id),
        sqlVal(p.nombre),
        sqlVal(p.categoria),
        sqlVal(p.formula_quimica),
        sqlVal(p.icono_id),
        sqlVal(p.descripcion_corta),
        sqlVal(p.mdx_slug),
        sqlVal(p.estado_mvp),
      ])
    ),
    upsertBlock(
      'productos_zonas',
      'relacion_id',
      ['relacion_id', 'producto_id', 'provincia_id', 'departamento_id', 'es_dominante', 'rol_en_cadena', 'anio', 'fuente_id', 'cita_ubicacion', 'confianza'],
      dataset.productos_zonas.map((z) => [
        sqlVal(z.relacion_id),
        sqlVal(z.producto_id),
        sqlVal(z.provincia_id),
        sqlVal(z.departamento_id),
        sqlVal(z.es_dominante),
        sqlVal(z.rol_en_cadena),
        sqlVal(z.procedencia.anio),
        sqlVal(z.procedencia.fuente_id),
        sqlVal(z.procedencia.cita_ubicacion),
        sqlVal(z.procedencia.confianza),
      ])
    ),
    upsertBlock(
      'procesos',
      'proceso_id',
      [
        'proceso_id',
        'producto_id',
        'nombre',
        'ruta_tecnologica',
        'reaccion_global',
        'energia_especifica_valor',
        'energia_especifica_estado',
        'energia_especifica_unidad',
        'descripcion',
        'anio',
        'fuente_id',
        'cita_ubicacion',
        'confianza',
      ],
      dataset.procesos.map((p) => [
        sqlVal(p.proceso_id),
        sqlVal(p.producto_id),
        sqlVal(p.nombre),
        sqlVal(p.ruta_tecnologica),
        sqlVal(p.reaccion_global),
        sqlVal(p.energia_especifica.valor),
        sqlVal(p.energia_especifica.estado),
        sqlVal(p.energia_especifica.unidad),
        sqlVal(p.descripcion),
        sqlVal(p.procedencia.anio),
        sqlVal(p.procedencia.fuente_id),
        sqlVal(p.procedencia.cita_ubicacion),
        sqlVal(p.procedencia.confianza),
      ])
    ),
    upsertBlock(
      'pasos_proceso',
      'paso_id',
      [
        'paso_id',
        'proceso_id',
        'orden',
        'nombre',
        'tipo_paso',
        'reaccion_balanceada',
        'temperatura_c',
        'presion_bar',
        'reactivos',
        'productos',
        'insumos',
        'subproductos',
        'energia_valor',
        'energia_estado',
        'energia_unidad',
        'descripcion',
        'pos_x',
        'pos_y',
        'anio',
        'fuente_id',
        'cita_ubicacion',
        'confianza',
      ],
      dataset.pasos_proceso.map((s) => [
        sqlVal(s.paso_id),
        sqlVal(s.proceso_id),
        sqlVal(s.orden),
        sqlVal(s.nombre),
        sqlVal(s.tipo_paso),
        sqlVal(s.reaccion_balanceada),
        sqlVal(s.temperatura_c),
        sqlVal(s.presion_bar),
        sqlJsonb(s.reactivos),
        sqlJsonb(s.productos),
        sqlJsonb(s.insumos),
        sqlJsonb(s.subproductos),
        sqlVal(s.energia.valor),
        sqlVal(s.energia.estado),
        sqlVal(s.energia.unidad),
        sqlVal(s.descripcion),
        sqlVal(s.pos_x),
        sqlVal(s.pos_y),
        sqlVal(s.procedencia.anio),
        sqlVal(s.procedencia.fuente_id),
        sqlVal(s.procedencia.cita_ubicacion),
        sqlVal(s.procedencia.confianza),
      ])
    ),
    upsertBlock(
      'conexiones_proceso',
      'conexion_id',
      [
        'conexion_id',
        'proceso_id',
        'origen_paso_id',
        'destino_paso_id',
        'corriente_nombre',
        'tipo_corriente',
        'flujo_valor',
        'flujo_estado',
        'flujo_unidad',
        'anio',
        'fuente_id',
        'cita_ubicacion',
        'confianza',
      ],
      dataset.conexiones_proceso.map((c) => [
        sqlVal(c.conexion_id),
        sqlVal(c.proceso_id),
        sqlVal(c.origen_paso_id),
        sqlVal(c.destino_paso_id),
        sqlVal(c.corriente_nombre),
        sqlVal(c.tipo_corriente),
        sqlVal(c.flujo.valor),
        sqlVal(c.flujo.estado),
        sqlVal(c.flujo.unidad),
        sqlVal(c.procedencia.anio),
        sqlVal(c.procedencia.fuente_id),
        sqlVal(c.procedencia.cita_ubicacion),
        sqlVal(c.procedencia.confianza),
      ])
    ),
    upsertBlock(
      'empresas',
      'empresa_id',
      ['empresa_id', 'razon_social', 'tipo_capital', 'sitio_web_oficial', 'hechos_verificables', 'anio', 'fuente_id', 'cita_ubicacion', 'confianza'],
      dataset.empresas.map((e) => [
        sqlVal(e.empresa_id),
        sqlVal(e.razon_social),
        sqlVal(e.tipo_capital),
        sqlVal(e.sitio_web_oficial),
        sqlVal(e.hechos_verificables),
        sqlVal(e.procedencia.anio),
        sqlVal(e.procedencia.fuente_id),
        sqlVal(e.procedencia.cita_ubicacion),
        sqlVal(e.procedencia.confianza),
      ])
    ),
    upsertBlock(
      'plantas',
      'planta_id',
      [
        'planta_id',
        'empresa_id',
        'producto_id',
        'provincia_id',
        'departamento_id',
        'nombre',
        'localidad',
        'lat',
        'lon',
        'estado_operativo',
        'capacidad_valor',
        'capacidad_estado',
        'capacidad_unidad',
        'anio',
        'fuente_id',
        'cita_ubicacion',
        'confianza',
      ],
      dataset.plantas.map((pl) => [
        sqlVal(pl.planta_id),
        sqlVal(pl.empresa_id),
        sqlVal(pl.producto_id),
        sqlVal(pl.provincia_id),
        sqlVal(pl.departamento_id),
        sqlVal(pl.nombre),
        sqlVal(pl.localidad),
        sqlVal(pl.lat),
        sqlVal(pl.lon),
        sqlVal(pl.estado_operativo),
        sqlVal(pl.capacidad.valor),
        sqlVal(pl.capacidad.estado),
        sqlVal(pl.capacidad.unidad),
        sqlVal(pl.procedencia.anio),
        sqlVal(pl.procedencia.fuente_id),
        sqlVal(pl.procedencia.cita_ubicacion),
        sqlVal(pl.procedencia.confianza),
      ])
    ),
    upsertBlock(
      'produccion',
      'registro_id',
      ['registro_id', 'producto_id', 'provincia_id', 'anio', 'valor', 'estado', 'unidad', 'fuente_id', 'cita_ubicacion', 'confianza'],
      dataset.produccion.map((pr) => [
        sqlVal(pr.registro_id),
        sqlVal(pr.producto_id),
        sqlVal(pr.provincia_id),
        sqlVal(pr.anio),
        sqlVal(pr.medicion.valor),
        sqlVal(pr.medicion.estado),
        sqlVal(pr.medicion.unidad),
        sqlVal(pr.procedencia.fuente_id),
        sqlVal(pr.procedencia.cita_ubicacion),
        sqlVal(pr.procedencia.confianza),
      ])
    ),
    upsertBlock(
      'comercio_exterior',
      'registro_id',
      [
        'registro_id',
        'producto_id',
        'anio',
        'ncm_codigo',
        'metrica',
        'exportacion_valor',
        'exportacion_estado',
        'importacion_valor',
        'importacion_estado',
        'saldo_comercial_valor',
        'saldo_comercial_estado',
        'unidad',
        'fuente_id',
        'cita_ubicacion',
        'confianza',
      ],
      dataset.comercio_exterior.map((ce) => [
        sqlVal(ce.registro_id),
        sqlVal(ce.producto_id),
        sqlVal(ce.anio),
        sqlVal(ce.ncm_codigo),
        sqlVal(ce.metrica),
        sqlVal(ce.exportacion.valor),
        sqlVal(ce.exportacion.estado),
        sqlVal(ce.importacion.valor),
        sqlVal(ce.importacion.estado),
        sqlVal(ce.saldo_comercial.valor),
        sqlVal(ce.saldo_comercial.estado),
        sqlVal(ce.exportacion.unidad ?? ce.importacion.unidad ?? ce.saldo_comercial.unidad),
        sqlVal(ce.procedencia.fuente_id),
        sqlVal(ce.procedencia.cita_ubicacion),
        sqlVal(ce.procedencia.confianza),
      ])
    ),
    upsertBlock(
      'pfd_procesos',
      'proceso_id',
      [
        'proceso_id',
        'producto_id',
        'titulo',
        'norma_simbologia',
        'base_calculo',
        'resumen_tecnico',
        'nota_metodologica',
        'canvas_width',
        'canvas_height',
        'secciones',
        'equipos',
        'corrientes',
        'servicios',
        'limites_bateria',
      ],
      pfdList.map((pfd) => [
        sqlVal(pfd.proceso_id),
        sqlVal(pfd.producto_id),
        sqlVal(pfd.titulo),
        sqlVal(pfd.norma_simbologia),
        sqlVal(pfd.base_calculo),
        sqlVal(pfd.resumen_tecnico),
        sqlVal(pfd.nota_metodologica),
        sqlVal(pfd.canvas_width),
        sqlVal(pfd.canvas_height),
        sqlJsonb(pfd.secciones),
        sqlJsonb(pfd.equipos),
        sqlJsonb(pfd.corrientes),
        sqlJsonb(pfd.servicios),
        sqlJsonb(pfd.limites_bateria),
      ])
    ),
    'COMMIT;',
    '',
  ];

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, sections.join('\n'), 'utf-8');
  console.log('[supabase:seed] OK — supabase/seed.sql generado desde data/validated/.');
}

main().catch((err) => {
  console.error('[supabase:seed] ERROR:', err);
  process.exit(1);
});
