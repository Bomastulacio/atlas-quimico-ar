import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { AtlasDatasetSchema, validateDatasetIntegrity } from '../src/schemas';

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

function sha256(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return `sha256:${crypto.createHash('sha256').update(normalized).digest('hex')}`;
}

async function readJsonFile(fileName: string): Promise<{ raw: string; data: unknown }> {
  const fullPath = path.join(VALIDATED_DIR, fileName);
  const raw = await fs.readFile(fullPath, 'utf-8');
  return { raw, data: JSON.parse(raw) };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const strictReal = args.has('--strict-real') || process.env.DATA_STRICT_REAL === 'true';

  const manifestFile = await readJsonFile('manifest.json');
  const candidate: Record<string, unknown> = {
    manifest: manifestFile.data,
  };

  const hashMismatches: string[] = [];
  const manifestObj = manifestFile.data as {
    tablas?: Record<string, { registros: number; hash: string }>;
  };

  for (const tab of TABS) {
    const { raw, data } = await readJsonFile(`${tab}.json`);
    candidate[tab] = data;

    const actualHash = sha256(raw);
    const expectedHash = manifestObj.tablas?.[tab]?.hash;
    if (!expectedHash) {
      hashMismatches.push(`Falta entrada en manifest.json para la tabla "${tab}"`);
    } else if (actualHash !== expectedHash) {
      hashMismatches.push(
        `Hash alterado en "${tab}.json": esperado ${expectedHash}, actual ${actualHash}. Regenerar con sheets-to-json.`
      );
    }
  }

  if (hashMismatches.length > 0) {
    console.error('[data:validate] ERROR de integridad de archivos:');
    for (const m of hashMismatches) console.error(`  - ${m}`);
    process.exit(1);
  }

  const parsed = AtlasDatasetSchema.safeParse(candidate);
  if (!parsed.success) {
    console.error('[data:validate] ERROR de esquema Zod:');
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  const integrity = validateDatasetIntegrity(parsed.data, { strictReal });
  if (!integrity.ok) {
    console.error('[data:validate] ERROR de integridad referencial / política de datos:');
    for (const err of integrity.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  const totalTablas = TABS.length;
  console.log(
    `[data:validate] OK — ${totalTablas} tablas, ${parsed.data.provincias.length} provincias, ${parsed.data.productos.length} productos, modo=${
      parsed.data.manifest.es_ejemplo ? 'EJEMPLO' : 'OFICIAL'
    }${strictReal ? ' (strict-real)' : ''}.`
  );
}

main().catch((err) => {
  console.error('[data:validate] FALLO CRÍTICO:', err);
  process.exit(1);
});
