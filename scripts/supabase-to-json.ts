/**
 * Descarga las 12 tablas relacionales desde Supabase (PostgREST API usando
 * clave pública `SUPABASE_PUBLISHABLE_KEY`), valida esquema + integridad
 * referencial con Zod y escribe los JSON compilados en `data/validated/`.
 *
 * Mantiene la regla arquitectónica: el navegador nunca consulta Supabase
 * directo; toda la web lee desde `src/data/` sobre `data/validated/`.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  AtlasDatasetSchema,
  PfdDatasetSchema,
  validateDatasetIntegrity,
  type AtlasDataset,
  type Fuente,
  type Provenance,
  type ValorMedido,
} from '../src/schemas';

const VALIDATED_DIR = path.join(process.cwd(), 'data', 'validated');

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
type DbRow = Record<string, unknown>;

function sha256(content: string): string {
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

const PAGE_SIZE = 1000;

async function fetchTable(baseUrl: string, apiKey: string, table: string): Promise<DbRow[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/rest/v1/${table}?select=*`;
  const allRows: DbRow[] = [];
  let offset = 0;

  while (true) {
    const res = await fetch(url, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Error consultando "${table}" en Supabase (${res.status}): ${body}`);
    }
    const batch = (await res.json()) as DbRow[];
    allRows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return allRows;
}

function resolveProvenance(row: DbRow, fuentesMap: Map<string, Fuente>, ctx: string): Provenance {
  const fuenteId = String(row.fuente_id ?? '').trim();
  const fuente = fuentesMap.get(fuenteId);
  if (!fuente) {
    throw new Error(`[${ctx}] fuente_id "${fuenteId}" no existe en la tabla "fuentes"`);
  }
  return {
    anio: Number(row.anio),
    fuente_id: fuente.fuente_id,
    fuente: fuente.nombre,
    url: fuente.url,
    fecha_descarga: fuente.fecha_descarga,
    hash: fuente.hash,
    cita_ubicacion: String(row.cita_ubicacion ?? ''),
    confianza: String(row.confianza) as Provenance['confianza'],
  };
}

function buildValorMedido(
  valor: unknown,
  estado: unknown,
  unidad: unknown,
  procedencia: Provenance,
  ctx: string
): ValorMedido {
  const est = String(estado);
  if (est === 'sin_datos') {
    if (valor !== null && valor !== undefined) {
      throw new Error(`[${ctx}] estado="sin_datos" pero valor no es NULL (${String(valor)})`);
    }
    return {
      estado: 'sin_datos',
      valor: null,
      unidad: unidad ? String(unidad) : null,
      procedencia,
    };
  }
  if (est === 'dato') {
    return {
      estado: 'dato',
      valor: Number(valor),
      unidad: String(unidad ?? ''),
      procedencia,
    };
  }
  throw new Error(`[${ctx}] estado inválido "${est}"`);
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  const strictReal = process.argv.includes('--strict-real') || process.env.DATA_STRICT_REAL === 'true';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Faltan SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY en el entorno (ver .env.example).'
    );
  }

  console.log(`[supabase-to-json] Sincronizando 12 tablas desde ${supabaseUrl}...`);

  const raw = {} as Record<TabName, DbRow[]>;
  await Promise.all(
    TABS.map(async (tab) => {
      raw[tab] = await fetchTable(supabaseUrl, supabaseKey, tab);
    })
  );

  const fuentes: Fuente[] = raw.fuentes.map((r) => ({
    fuente_id: String(r.fuente_id),
    nombre: String(r.nombre),
    organismo: String(r.organismo),
    tipo: String(r.tipo) as Fuente['tipo'],
    url: String(r.url),
    fecha_descarga: String(r.fecha_descarga).slice(0, 10),
    hash: String(r.hash),
    archivo_raw: r.archivo_raw ? String(r.archivo_raw) : null,
    notas: r.notas ? String(r.notas) : null,
  }));
  const fuentesMap = new Map(fuentes.map((f) => [f.fuente_id, f]));

  const provincias = raw.provincias
    .map((r) => ({
      provincia_id: String(r.provincia_id).trim(),
      nombre: String(r.nombre),
      iso_3166_2: String(r.iso_3166_2),
      region: String(r.region),
      cobertura_datos: String(r.cobertura_datos),
      nota_cobertura: r.nota_cobertura ? String(r.nota_cobertura) : null,
    }))
    .sort((a, b) => a.provincia_id.localeCompare(b.provincia_id));

  const departamentos = raw.departamentos
    .map((r) => ({
      departamento_id: String(r.departamento_id).trim(),
      provincia_id: String(r.provincia_id).trim(),
      nombre: String(r.nombre),
      tipo_zona: String(r.tipo_zona),
      tiene_datos_confiables: Boolean(r.tiene_datos_confiables),
      cobertura_datos: String(r.cobertura_datos),
      nota_cobertura: r.nota_cobertura ? String(r.nota_cobertura) : null,
    }))
    .sort((a, b) => a.departamento_id.localeCompare(b.departamento_id));

  const productos = raw.productos.map((r) => ({
    producto_id: String(r.producto_id),
    nombre: String(r.nombre),
    categoria: String(r.categoria),
    formula_quimica: r.formula_quimica ? String(r.formula_quimica) : null,
    icono_id: String(r.icono_id),
    descripcion_corta: String(r.descripcion_corta),
    mdx_slug: r.mdx_slug ? String(r.mdx_slug) : null,
    estado_mvp: String(r.estado_mvp),
  }));

  const productos_zonas = raw.productos_zonas.map((r, i) => ({
    relacion_id: String(r.relacion_id),
    producto_id: String(r.producto_id),
    provincia_id: String(r.provincia_id).trim(),
    departamento_id: r.departamento_id ? String(r.departamento_id).trim() : null,
    es_dominante: Boolean(r.es_dominante),
    rol_en_cadena: String(r.rol_en_cadena),
    procedencia: resolveProvenance(r, fuentesMap, `productos_zonas[${i}]`),
  }));

  const procesos = raw.procesos.map((r, i) => {
    const procedencia = resolveProvenance(r, fuentesMap, `procesos[${i}]`);
    return {
      proceso_id: String(r.proceso_id),
      producto_id: String(r.producto_id),
      nombre: String(r.nombre),
      ruta_tecnologica: String(r.ruta_tecnologica),
      reaccion_global: r.reaccion_global ? String(r.reaccion_global) : null,
      energia_especifica: buildValorMedido(
        r.energia_especifica_valor,
        r.energia_especifica_estado,
        r.energia_especifica_unidad,
        procedencia,
        `procesos[${i}].energia_especifica`
      ),
      descripcion: String(r.descripcion),
      procedencia,
    };
  });

  const pasos_proceso = raw.pasos_proceso
    .map((r, i) => {
      const procedencia = resolveProvenance(r, fuentesMap, `pasos_proceso[${i}]`);
      return {
        paso_id: String(r.paso_id),
        proceso_id: String(r.proceso_id),
        orden: Number(r.orden),
        nombre: String(r.nombre),
        tipo_paso: String(r.tipo_paso),
        reaccion_balanceada: r.reaccion_balanceada ? String(r.reaccion_balanceada) : null,
        temperatura_c: r.temperatura_c ? String(r.temperatura_c) : null,
        presion_bar: r.presion_bar ? String(r.presion_bar) : null,
        reactivos: Array.isArray(r.reactivos) ? r.reactivos : [],
        productos: Array.isArray(r.productos) ? r.productos : [],
        insumos: Array.isArray(r.insumos) ? r.insumos : [],
        subproductos: Array.isArray(r.subproductos) ? r.subproductos : [],
        energia: buildValorMedido(
          r.energia_valor,
          r.energia_estado,
          r.energia_unidad,
          procedencia,
          `pasos_proceso[${i}].energia`
        ),
        descripcion: String(r.descripcion),
        pos_x: Number(r.pos_x),
        pos_y: Number(r.pos_y),
        procedencia,
      };
    })
    .sort((a, b) => a.orden - b.orden);

  const conexiones_proceso = raw.conexiones_proceso.map((r, i) => {
    const procedencia = resolveProvenance(r, fuentesMap, `conexiones_proceso[${i}]`);
    return {
      conexion_id: String(r.conexion_id),
      proceso_id: String(r.proceso_id),
      origen_paso_id: String(r.origen_paso_id),
      destino_paso_id: String(r.destino_paso_id),
      corriente_nombre: String(r.corriente_nombre),
      tipo_corriente: String(r.tipo_corriente),
      flujo: buildValorMedido(
        r.flujo_valor,
        r.flujo_estado,
        r.flujo_unidad,
        procedencia,
        `conexiones_proceso[${i}].flujo`
      ),
      procedencia,
    };
  });

  const empresas = raw.empresas.map((r, i) => ({
    empresa_id: String(r.empresa_id),
    razon_social: String(r.razon_social),
    tipo_capital: String(r.tipo_capital),
    sitio_web_oficial: r.sitio_web_oficial ? String(r.sitio_web_oficial) : null,
    hechos_verificables: String(r.hechos_verificables),
    procedencia: resolveProvenance(r, fuentesMap, `empresas[${i}]`),
  }));

  const plantas = raw.plantas.map((r, i) => {
    const procedencia = resolveProvenance(r, fuentesMap, `plantas[${i}]`);
    return {
      planta_id: String(r.planta_id),
      empresa_id: String(r.empresa_id),
      producto_id: String(r.producto_id),
      provincia_id: String(r.provincia_id).trim(),
      departamento_id: r.departamento_id ? String(r.departamento_id).trim() : null,
      nombre: String(r.nombre),
      localidad: String(r.localidad),
      lat: Number(r.lat),
      lon: Number(r.lon),
      estado_operativo: String(r.estado_operativo),
      capacidad: buildValorMedido(
        r.capacidad_valor,
        r.capacidad_estado,
        r.capacidad_unidad,
        procedencia,
        `plantas[${i}].capacidad`
      ),
      procedencia,
    };
  });

  const produccion = raw.produccion.map((r, i) => {
    const procedencia = resolveProvenance(r, fuentesMap, `produccion[${i}]`);
    return {
      registro_id: String(r.registro_id),
      producto_id: String(r.producto_id),
      provincia_id: r.provincia_id ? String(r.provincia_id).trim() : null,
      anio: Number(r.anio),
      medicion: buildValorMedido(
        r.valor,
        r.estado,
        r.unidad,
        procedencia,
        `produccion[${i}].medicion`
      ),
      procedencia,
    };
  });

  const comercio_exterior = raw.comercio_exterior.map((r, i) => {
    const procedencia = resolveProvenance(r, fuentesMap, `comercio_exterior[${i}]`);
    return {
      registro_id: String(r.registro_id),
      producto_id: String(r.producto_id),
      anio: Number(r.anio),
      ncm_codigo: r.ncm_codigo ? String(r.ncm_codigo) : null,
      metrica: String(r.metrica),
      exportacion: buildValorMedido(
        r.exportacion_valor,
        r.exportacion_estado,
        r.unidad,
        procedencia,
        `comercio_exterior[${i}].exportacion`
      ),
      importacion: buildValorMedido(
        r.importacion_valor,
        r.importacion_estado,
        r.unidad,
        procedencia,
        `comercio_exterior[${i}].importacion`
      ),
      saldo_comercial: buildValorMedido(
        r.saldo_comercial_valor,
        r.saldo_comercial_estado,
        r.unidad,
        procedencia,
        `comercio_exterior[${i}].saldo_comercial`
      ),
      procedencia,
    };
  });

  // Excluir fuentes placeholder de tipo 'ejemplo' que ya no están referenciadas por ninguna tabla
  const referencedFuenteIds = new Set<string>([
    ...productos_zonas.map((r) => r.procedencia.fuente_id),
    ...procesos.map((r) => r.procedencia.fuente_id),
    ...pasos_proceso.map((r) => r.procedencia.fuente_id),
    ...conexiones_proceso.map((r) => r.procedencia.fuente_id),
    ...empresas.map((r) => r.procedencia.fuente_id),
    ...plantas.map((r) => r.procedencia.fuente_id),
    ...produccion.map((r) => r.procedencia.fuente_id),
    ...comercio_exterior.map((r) => r.procedencia.fuente_id),
  ]);
  const fuentesActivas = fuentes.filter(
    (f) => f.tipo !== 'ejemplo' || referencedFuenteIds.has(f.fuente_id)
  );

  const tablesPayload: Record<TabName, unknown[]> = {
    fuentes: fuentesActivas,
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

  const esEjemplo = fuentesActivas.some((f) => f.tipo === 'ejemplo');
  const validadosCount = productos.filter((p) => p.estado_mvp === 'validado').length;

  const parsed: AtlasDataset = AtlasDatasetSchema.parse({
    manifest: {
      version_esquema: '1.0.0',
      generado_en: new Date().toISOString(),
      origen: 'supabase',
      es_ejemplo: esEjemplo,
      nota: esEjemplo
        ? `Sincronizado desde Supabase (${validadosCount} cadena(s) verificadas con fuentes oficiales; marcadores pendientes para Etapa 6).`
        : 'Dataset oficial sincronizado íntegramente desde Supabase.',
      tablas: manifestTablas,
    },
    ...tablesPayload,
  });

  const integrity = validateDatasetIntegrity(parsed, { strictReal });
  if (!integrity.ok) {
    console.error('[supabase-to-json] Falló validación de integridad:', integrity.errors);
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

  // Sincronizar también pfd_procesos cuando la tabla exista y tenga filas
  const pfdRows = await fetchTable(supabaseUrl, supabaseKey, 'pfd_procesos');
  if (pfdRows.length > 0) {
    const cleanedPfds = pfdRows.map(({ updated_at: _u, ...rest }) => rest);
    const parsedPfds = PfdDatasetSchema.parse(cleanedPfds);
    await fs.writeFile(
      path.join(VALIDATED_DIR, 'pfd_procesos.json'),
      `${JSON.stringify(parsedPfds, null, 2)}\n`,
      'utf-8'
    );
  }

  console.log(
    `[supabase-to-json] OK — ${TABS.length} tablas + ${pfdRows.length} PFDs descargados con paginación desde Supabase y escritos en data/validated/.`
  );
}

main().catch((err) => {
  console.error('[supabase-to-json] ERROR:', err);
  process.exit(1);
});
