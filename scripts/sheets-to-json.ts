import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import {
  AtlasDatasetSchema,
  validateDatasetIntegrity,
  type AtlasDataset,
  type Fuente,
  type Provenance,
  type ValorMedido,
} from '../src/schemas';

const ROOT_DIR = process.cwd();
const FIXTURES_DIR = path.join(ROOT_DIR, 'data', 'fixtures', 'ejemplo_sheets');
const RAW_DIR = path.join(ROOT_DIR, 'data', 'raw');
const VALIDATED_DIR = path.join(ROOT_DIR, 'data', 'validated');

const TABS = [
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
  'comercio_exterior',
] as const;

type TabName = (typeof TABS)[number];
type RawRow = Record<string, string>;

function sha256(content: string | Buffer): string {
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

function cleanStr(value: string | undefined): string {
  return (value ?? '').trim();
}

function optionalStr(value: string | undefined): string | null {
  const s = cleanStr(value);
  return s.length > 0 ? s : null;
}

function parseBool(value: string | undefined, context: string): boolean {
  const s = cleanStr(value).toLowerCase();
  if (s === 'true' || s === '1' || s === 'si' || s === 'sí') return true;
  if (s === 'false' || s === '0' || s === 'no') return false;
  throw new Error(`[${context}] Valor booleano inválido: "${value}"`);
}

function parseIntStrict(value: string | undefined, context: string): number {
  const s = cleanStr(value);
  if (!/^-?\d+$/.test(s)) {
    throw new Error(`[${context}] Entero inválido: "${value}"`);
  }
  return Number.parseInt(s, 10);
}

function parseNumberStrict(value: string | undefined, context: string): number {
  const s = cleanStr(value);
  if (s.length === 0) {
    throw new Error(`[${context}] Se esperaba un número pero la celda está vacía`);
  }
  const n = Number(s);
  if (!Number.isFinite(n)) {
    throw new Error(`[${context}] Número inválido: "${value}"`);
  }
  return n;
}

function parseJsonArray(value: string | undefined, context: string): unknown[] {
  const s = cleanStr(value);
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    if (!Array.isArray(parsed)) {
      throw new Error('No es un arreglo JSON');
    }
    return parsed;
  } catch (err) {
    throw new Error(`[${context}] JSON inválido: ${(err as Error).message}`);
  }
}

function resolveProvenance(
  row: RawRow,
  fuentesMap: Map<string, Fuente>,
  context: string
): Provenance {
  const fuenteId = cleanStr(row.fuente_id);
  const fuente = fuentesMap.get(fuenteId);
  if (!fuente) {
    throw new Error(`[${context}] fuente_id "${fuenteId}" no existe en la pestaña "fuentes"`);
  }
  return {
    anio: parseIntStrict(row.anio, `${context}.anio`),
    fuente_id: fuente.fuente_id,
    fuente: fuente.nombre,
    url: fuente.url,
    fecha_descarga: fuente.fecha_descarga,
    hash: fuente.hash,
    cita_ubicacion: cleanStr(row.cita_ubicacion),
    confianza: cleanStr(row.confianza) as Provenance['confianza'],
  };
}

function buildValorMedido(
  valorRaw: string | undefined,
  estadoRaw: string | undefined,
  unidadRaw: string | undefined,
  procedencia: Provenance,
  context: string
): ValorMedido {
  const estado = cleanStr(estadoRaw);
  if (estado === 'sin_datos') {
    if (cleanStr(valorRaw).length > 0) {
      throw new Error(
        `[${context}] estado="sin_datos" pero se proveyó un valor numérico ("${valorRaw}"). Debe quedar vacío.`
      );
    }
    return {
      estado: 'sin_datos',
      valor: null,
      unidad: optionalStr(unidadRaw),
      procedencia,
    };
  }
  if (estado === 'dato') {
    const unidad = cleanStr(unidadRaw);
    if (!unidad) {
      throw new Error(`[${context}] unidad obligatoria cuando estado="dato"`);
    }
    return {
      estado: 'dato',
      valor: parseNumberStrict(valorRaw, `${context}.valor`),
      unidad,
      procedencia,
    };
  }
  throw new Error(`[${context}] estado inválido "${estado}" (usar "dato" o "sin_datos")`);
}

async function loadTabCsv(
  tab: TabName,
  options: { fromFixtures: boolean; sheetId?: string }
): Promise<string> {
  if (options.fromFixtures) {
    const fixturePath = path.join(FIXTURES_DIR, `${tab}.csv`);
    return fs.readFile(fixturePath, 'utf-8');
  }
  if (!options.sheetId) {
    throw new Error(
      'Falta GOOGLE_SHEET_ID en el entorno. Para probar sin planilla real usá: npm run data:sync:example'
    );
  }
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
    options.sheetId
  )}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error descargando pestaña "${tab}" (${res.status} ${res.statusText})`);
  }
  const csvText = await res.text();
  await fs.mkdir(RAW_DIR, { recursive: true });
  await fs.writeFile(path.join(RAW_DIR, `sheets_${tab}.csv`), csvText, 'utf-8');
  return csvText;
}

function parseCsvRows(csvText: string): RawRow[] {
  return parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as RawRow[];
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const fromFixtures = args.has('--from-fixtures');
  const strictReal = args.has('--strict-real') || process.env.DATA_STRICT_REAL === 'true';
  const sheetId = process.env.GOOGLE_SHEET_ID;

  console.log(
    `[sheets-to-json] Origen: ${fromFixtures ? 'fixtures de ejemplo (Etapa 1)' : 'Google Sheets'}`
  );

  const rawRows = {} as Record<TabName, RawRow[]>;
  for (const tab of TABS) {
    const csv = await loadTabCsv(tab, { fromFixtures, sheetId });
    rawRows[tab] = parseCsvRows(csv);
  }

  const fuentes: Fuente[] = rawRows.fuentes.map((row) => ({
    fuente_id: cleanStr(row.fuente_id),
    nombre: cleanStr(row.nombre),
    organismo: cleanStr(row.organismo),
    tipo: cleanStr(row.tipo) as Fuente['tipo'],
    url: cleanStr(row.url),
    fecha_descarga: cleanStr(row.fecha_descarga),
    hash: cleanStr(row.hash),
    archivo_raw: optionalStr(row.archivo_raw),
    notas: optionalStr(row.notas),
  }));
  const fuentesMap = new Map(fuentes.map((f) => [f.fuente_id, f]));

  const provincias = rawRows.provincias.map((row) => ({
    provincia_id: cleanStr(row.provincia_id).padStart(2, '0'),
    nombre: cleanStr(row.nombre),
    iso_3166_2: cleanStr(row.iso_3166_2),
    region: cleanStr(row.region),
    cobertura_datos: cleanStr(row.cobertura_datos),
    nota_cobertura: optionalStr(row.nota_cobertura),
  }));

  const departamentos = rawRows.departamentos.map((row, idx) => ({
    departamento_id: cleanStr(row.departamento_id).padStart(5, '0'),
    provincia_id: cleanStr(row.provincia_id).padStart(2, '0'),
    nombre: cleanStr(row.nombre),
    tipo_zona: cleanStr(row.tipo_zona),
    tiene_datos_confiables: parseBool(row.tiene_datos_confiables, `departamentos[${idx}]`),
    cobertura_datos: cleanStr(row.cobertura_datos),
    nota_cobertura: optionalStr(row.nota_cobertura),
  }));

  const productos = rawRows.productos.map((row) => ({
    producto_id: cleanStr(row.producto_id),
    nombre: cleanStr(row.nombre),
    categoria: cleanStr(row.categoria),
    formula_quimica: optionalStr(row.formula_quimica),
    icono_id: cleanStr(row.icono_id),
    descripcion_corta: cleanStr(row.descripcion_corta),
    mdx_slug: optionalStr(row.mdx_slug),
    estado_mvp: cleanStr(row.estado_mvp),
  }));

  const productos_zonas = rawRows.productos_zonas.map((row, idx) => ({
    relacion_id: cleanStr(row.relacion_id),
    producto_id: cleanStr(row.producto_id),
    provincia_id: cleanStr(row.provincia_id).padStart(2, '0'),
    departamento_id: optionalStr(row.departamento_id)?.padStart(5, '0') ?? null,
    es_dominante: parseBool(row.es_dominante, `productos_zonas[${idx}].es_dominante`),
    rol_en_cadena: cleanStr(row.rol_en_cadena),
    procedencia: resolveProvenance(row, fuentesMap, `productos_zonas[${idx}]`),
  }));

  const procesos = rawRows.procesos.map((row, idx) => {
    const procedencia = resolveProvenance(row, fuentesMap, `procesos[${idx}]`);
    return {
      proceso_id: cleanStr(row.proceso_id),
      producto_id: cleanStr(row.producto_id),
      nombre: cleanStr(row.nombre),
      ruta_tecnologica: cleanStr(row.ruta_tecnologica),
      reaccion_global: optionalStr(row.reaccion_global),
      energia_especifica: buildValorMedido(
        row.energia_especifica_valor,
        row.energia_especifica_estado,
        row.energia_especifica_unidad,
        procedencia,
        `procesos[${idx}].energia_especifica`
      ),
      descripcion: cleanStr(row.descripcion),
      procedencia,
    };
  });

  const pasos_proceso = rawRows.pasos_proceso.map((row, idx) => {
    const procedencia = resolveProvenance(row, fuentesMap, `pasos_proceso[${idx}]`);
    return {
      paso_id: cleanStr(row.paso_id),
      proceso_id: cleanStr(row.proceso_id),
      orden: parseIntStrict(row.orden, `pasos_proceso[${idx}].orden`),
      nombre: cleanStr(row.nombre),
      tipo_paso: cleanStr(row.tipo_paso),
      reaccion_balanceada: optionalStr(row.reaccion_balanceada),
      temperatura_c: optionalStr(row.temperatura_c),
      presion_bar: optionalStr(row.presion_bar),
      reactivos: parseJsonArray(row.reactivos_json, `pasos_proceso[${idx}].reactivos_json`),
      productos: parseJsonArray(row.productos_json, `pasos_proceso[${idx}].productos_json`),
      insumos: parseJsonArray(row.insumos_json, `pasos_proceso[${idx}].insumos_json`),
      subproductos: parseJsonArray(row.subproductos_json, `pasos_proceso[${idx}].subproductos_json`),
      energia: buildValorMedido(
        row.energia_valor,
        row.energia_estado,
        row.energia_unidad,
        procedencia,
        `pasos_proceso[${idx}].energia`
      ),
      descripcion: cleanStr(row.descripcion),
      pos_x: parseNumberStrict(row.pos_x, `pasos_proceso[${idx}].pos_x`),
      pos_y: parseNumberStrict(row.pos_y, `pasos_proceso[${idx}].pos_y`),
      procedencia,
    };
  });

  const conexiones_proceso = rawRows.conexiones_proceso.map((row, idx) => {
    const procedencia = resolveProvenance(row, fuentesMap, `conexiones_proceso[${idx}]`);
    return {
      conexion_id: cleanStr(row.conexion_id),
      proceso_id: cleanStr(row.proceso_id),
      origen_paso_id: cleanStr(row.origen_paso_id),
      destino_paso_id: cleanStr(row.destino_paso_id),
      corriente_nombre: cleanStr(row.corriente_nombre),
      tipo_corriente: cleanStr(row.tipo_corriente),
      flujo: buildValorMedido(
        row.flujo_valor,
        row.flujo_estado,
        row.flujo_unidad,
        procedencia,
        `conexiones_proceso[${idx}].flujo`
      ),
      procedencia,
    };
  });

  const empresas = rawRows.empresas.map((row, idx) => ({
    empresa_id: cleanStr(row.empresa_id),
    razon_social: cleanStr(row.razon_social),
    tipo_capital: cleanStr(row.tipo_capital),
    sitio_web_oficial: optionalStr(row.sitio_web_oficial),
    hechos_verificables: cleanStr(row.hechos_verificables),
    procedencia: resolveProvenance(row, fuentesMap, `empresas[${idx}]`),
  }));

  const plantas = rawRows.plantas.map((row, idx) => {
    const procedencia = resolveProvenance(row, fuentesMap, `plantas[${idx}]`);
    return {
      planta_id: cleanStr(row.planta_id),
      empresa_id: cleanStr(row.empresa_id),
      producto_id: cleanStr(row.producto_id),
      provincia_id: cleanStr(row.provincia_id).padStart(2, '0'),
      departamento_id: optionalStr(row.departamento_id)?.padStart(5, '0') ?? null,
      nombre: cleanStr(row.nombre),
      localidad: cleanStr(row.localidad),
      lat: parseNumberStrict(row.lat, `plantas[${idx}].lat`),
      lon: parseNumberStrict(row.lon, `plantas[${idx}].lon`),
      estado_operativo: cleanStr(row.estado_operativo),
      capacidad: buildValorMedido(
        row.capacidad_valor,
        row.capacidad_estado,
        row.capacidad_unidad,
        procedencia,
        `plantas[${idx}].capacidad`
      ),
      procedencia,
    };
  });

  const produccion = rawRows.produccion.map((row, idx) => {
    const procedencia = resolveProvenance(row, fuentesMap, `produccion[${idx}]`);
    return {
      registro_id: cleanStr(row.registro_id),
      producto_id: cleanStr(row.producto_id),
      provincia_id: optionalStr(row.provincia_id)?.padStart(2, '0') ?? null,
      anio: parseIntStrict(row.anio, `produccion[${idx}].anio`),
      medicion: buildValorMedido(
        row.valor,
        row.estado,
        row.unidad,
        procedencia,
        `produccion[${idx}].medicion`
      ),
      procedencia,
    };
  });

  const comercio_exterior = rawRows.comercio_exterior.map((row, idx) => {
    const procedencia = resolveProvenance(row, fuentesMap, `comercio_exterior[${idx}]`);
    return {
      registro_id: cleanStr(row.registro_id),
      producto_id: cleanStr(row.producto_id),
      anio: parseIntStrict(row.anio, `comercio_exterior[${idx}].anio`),
      ncm_codigo: optionalStr(row.ncm_codigo),
      metrica: cleanStr(row.metrica),
      exportacion: buildValorMedido(
        row.exportacion_valor,
        row.exportacion_estado,
        row.unidad,
        procedencia,
        `comercio_exterior[${idx}].exportacion`
      ),
      importacion: buildValorMedido(
        row.importacion_valor,
        row.importacion_estado,
        row.unidad,
        procedencia,
        `comercio_exterior[${idx}].importacion`
      ),
      saldo_comercial: buildValorMedido(
        row.saldo_comercial_valor,
        row.saldo_comercial_estado,
        row.unidad,
        procedencia,
        `comercio_exterior[${idx}].saldo_comercial`
      ),
      procedencia,
    };
  });

  const tablesPayload: Record<TabName, unknown[]> = {
    fuentes,
    provincias,
    departamentos,
    productos,
    productos_zonas,
    procesos,
    pasos_proceso,
    conexiones_proceso,
    empresas,
    plantas,
    produccion,
    comercio_exterior,
  };

  const serializedTables = {} as Record<TabName, string>;
  const manifestTablas: Record<string, { registros: number; hash: string }> = {};

  for (const tab of TABS) {
    const content = `${JSON.stringify(tablesPayload[tab], null, 2)}\n`;
    serializedTables[tab] = content;
    manifestTablas[tab] = {
      registros: tablesPayload[tab].length,
      hash: sha256(content),
    };
  }

  const esEjemplo =
    fromFixtures || fuentes.some((f) => f.tipo === 'ejemplo');

  const manifest = {
    version_esquema: '1.0.0',
    generado_en: new Date().toISOString(),
    origen: fromFixtures ? ('fixtures_ejemplo' as const) : ('google_sheets' as const),
    es_ejemplo: esEjemplo,
    nota: esEjemplo
      ? 'DATOS DE EJEMPLO (NO OFICIALES) generados para validar el contrato de Etapa 1 antes de aprobar docs/datos.md.'
      : 'Dataset compilado desde Google Sheets oficial del proyecto.',
    tablas: manifestTablas,
  };

  const candidateDataset = {
    manifest,
    ...tablesPayload,
  };

  const parsed: AtlasDataset = AtlasDatasetSchema.parse(candidateDataset);
  const integrity = validateDatasetIntegrity(parsed, { strictReal });
  if (!integrity.ok) {
    console.error('[sheets-to-json] Falló la validación de integridad referencial:');
    for (const err of integrity.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  await fs.mkdir(VALIDATED_DIR, { recursive: true });
  for (const tab of TABS) {
    await fs.writeFile(path.join(VALIDATED_DIR, `${tab}.json`), serializedTables[tab], 'utf-8');
  }
  await fs.writeFile(
    path.join(VALIDATED_DIR, 'manifest.json'),
    `${JSON.stringify(parsed.manifest, null, 2)}\n`,
    'utf-8'
  );

  console.log(`[sheets-to-json] OK — ${TABS.length} tablas validadas y escritas en data/validated/.`);
  if (esEjemplo) {
    console.log('[sheets-to-json] AVISO: dataset marcado explícitamente como EJEMPLO (es_ejemplo=true).');
  }
}

main().catch((err) => {
  console.error('[sheets-to-json] ERROR:', err);
  process.exit(1);
});
