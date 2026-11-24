/**
 * Genera el Set de Oro de Aluminio (`data/golden/aluminio.golden.json`) a partir
 * del dataset validado en `data/validated/`, aislando exclusivamente registros
 * verificados con fuentes oficiales y sometiéndolo a `strictReal: true`.
 *
 * Este archivo sirve como benchmark determinista para evaluar los agentes de
 * LangGraph en las Etapas 4 y 5.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  AtlasDatasetSchema,
  validateDatasetIntegrity,
  type AtlasDataset,
} from '../src/schemas';

const ROOT_DIR = process.cwd();
const VALIDATED_DIR = path.join(ROOT_DIR, 'data', 'validated');
const GOLDEN_DIR = path.join(ROOT_DIR, 'data', 'golden');
const GOLDEN_PATH = path.join(GOLDEN_DIR, 'aluminio.golden.json');

function sha256(content: string): string {
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

async function readValidated<T>(fileName: string): Promise<T> {
  const raw = await fs.readFile(path.join(VALIDATED_DIR, fileName), 'utf-8');
  return JSON.parse(raw) as T;
}

async function main() {
  const fullDataset = AtlasDatasetSchema.parse({
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

  const TARGET_PRODUCT = 'aluminio';

  const productos = fullDataset.productos.filter((p) => p.producto_id === TARGET_PRODUCT);
  const productos_zonas = fullDataset.productos_zonas.filter((z) => z.producto_id === TARGET_PRODUCT);
  const procesos = fullDataset.procesos.filter((p) => p.producto_id === TARGET_PRODUCT);
  const procesoIds = new Set(procesos.map((p) => p.proceso_id));
  const pasos_proceso = fullDataset.pasos_proceso.filter((s) => procesoIds.has(s.proceso_id));
  const conexiones_proceso = fullDataset.conexiones_proceso.filter((c) => procesoIds.has(c.proceso_id));
  const plantas = fullDataset.plantas.filter((pl) => pl.producto_id === TARGET_PRODUCT);
  const empresaIds = new Set(plantas.map((pl) => pl.empresa_id));
  const empresas = fullDataset.empresas.filter((e) => empresaIds.has(e.empresa_id));
  const produccion = fullDataset.produccion.filter((pr) => pr.producto_id === TARGET_PRODUCT);
  const comercio_exterior = fullDataset.comercio_exterior.filter(
    (ce) => ce.producto_id === TARGET_PRODUCT
  );

  const provinciaIds = new Set<string>([
    ...productos_zonas.map((z) => z.provincia_id),
    ...plantas.map((pl) => pl.provincia_id),
    ...produccion.map((pr) => pr.provincia_id).filter((id): id is string => id !== null),
  ]);
  const provincias = fullDataset.provincias.filter((p) => provinciaIds.has(p.provincia_id));

  const deptoIds = new Set<string>([
    ...productos_zonas.map((z) => z.departamento_id).filter((id): id is string => id !== null),
    ...plantas.map((pl) => pl.departamento_id).filter((id): id is string => id !== null),
  ]);
  const departamentos = fullDataset.departamentos.filter((d) => deptoIds.has(d.departamento_id));

  // Recolectar únicamente fuentes referenciadas (excluye cualquier fuente de ejemplo)
  const usedFuenteIds = new Set<string>([
    ...productos_zonas.map((r) => r.procedencia.fuente_id),
    ...procesos.map((r) => r.procedencia.fuente_id),
    ...pasos_proceso.map((r) => r.procedencia.fuente_id),
    ...conexiones_proceso.map((r) => r.procedencia.fuente_id),
    ...empresas.map((r) => r.procedencia.fuente_id),
    ...plantas.map((r) => r.procedencia.fuente_id),
    ...produccion.map((r) => r.procedencia.fuente_id),
    ...comercio_exterior.map((r) => r.procedencia.fuente_id),
  ]);
  const fuentes = fullDataset.fuentes.filter(
    (f) => usedFuenteIds.has(f.fuente_id) && f.tipo !== 'ejemplo'
  );

  const tables = {
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

  const manifestTablas: Record<string, { registros: number; hash: string }> = {};
  for (const [key, rows] of Object.entries(tables)) {
    manifestTablas[key] = {
      registros: rows.length,
      hash: sha256(JSON.stringify(rows, null, 2)),
    };
  }

  const goldenCandidate: AtlasDataset = AtlasDatasetSchema.parse({
    manifest: {
      version_esquema: '1.0.0',
      generado_en: new Date().toISOString(),
      origen: 'sheets_local',
      es_ejemplo: false,
      nota: 'Set de Oro de Aluminio primario (Chubut): 100% verificado con fuentes oficiales (Aluar EEFF/CNV 2025, INDEC, UN Comtrade, IPCC 2006 y USGS MCS 2025). Referencia de evaluación para agentes LangGraph (Etapas 4-5).',
      tablas: manifestTablas,
    },
    ...tables,
  });

  const integrity = validateDatasetIntegrity(goldenCandidate, { strictReal: true });
  if (!integrity.ok) {
    console.error('[data:golden] FALLÓ la validación strictReal del Set de Oro:');
    for (const err of integrity.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  await fs.mkdir(GOLDEN_DIR, { recursive: true });
  await fs.writeFile(GOLDEN_PATH, `${JSON.stringify(goldenCandidate, null, 2)}\n`, 'utf-8');

  console.log(
    `[data:golden] OK — Set de Oro escrito en data/golden/aluminio.golden.json ` +
      `(${fuentes.length} fuentes oficiales, ${pasos_proceso.length} pasos, ${conexiones_proceso.length} conexiones, ` +
      `${produccion.length} registros de producción, ${comercio_exterior.length} registros de comercio exterior; strictReal=PASS).`
  );
}

main().catch((err) => {
  console.error('[data:golden] ERROR:', err);
  process.exit(1);
});
