import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

type Position = [number, number];
type Ring = Position[];
type PolygonCoords = Ring[];
type MultiPolygonCoords = PolygonCoords[];

interface GeorefDeptFeature {
  type: 'Feature';
  properties: {
    id?: string;
    nombre?: string;
    provincia?: { id?: string; nombre?: string };
    provincia_id?: string;
    provincia_nombre?: string;
  };
  geometry:
    | { type: 'Polygon'; coordinates: PolygonCoords }
    | { type: 'MultiPolygon'; coordinates: MultiPolygonCoords }
    | null;
}

export interface ProvinceDeptShardFeature {
  type: 'Feature';
  properties: {
    id: string;
    nombre: string;
    provincia_id: string;
    activo: boolean;
  };
  geometry:
    | { type: 'Polygon'; coordinates: PolygonCoords }
    | { type: 'MultiPolygon'; coordinates: MultiPolygonCoords };
}

interface DepartamentoValidado {
  departamento_id: string;
  provincia_id: string;
  nombre: string;
  tiene_datos_confiables: boolean;
}

const VALIDATED_DEPTOS_PATH = path.join(process.cwd(), 'data', 'validated', 'departamentos.json');
const OUT_DIR = path.join(process.cwd(), 'public', 'geo', 'provincias');
const OFFICIAL_URL = 'https://apis.datos.gob.ar/georef/api/v2.0/departamentos.geojson';

function sha256(content: string | Buffer): string {
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

function roundCoord(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function ringArea(ring: Ring): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[i + 1]!;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function perpendicularDistance(p: Position, a: Position, b: Position): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function simplifyDP(points: Ring, tolerance: number): Ring {
  if (points.length <= 4) return points;
  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i]!, points[0]!, points[end]!);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > tolerance) {
    const left = simplifyDP(points.slice(0, index + 1), tolerance);
    const right = simplifyDP(points.slice(index), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0]!, points[end]!];
}

function simplifyRing(ring: Ring, tolerance: number): Ring | null {
  if (ring.length < 4) return null;
  const simplified = simplifyDP(ring, tolerance).map(
    ([x, y]): Position => [roundCoord(x), roundCoord(y)]
  );
  const first = simplified[0]!;
  const last = simplified[simplified.length - 1]!;
  if (first[0] !== last[0] || first[1] !== last[1]) {
    simplified.push([first[0], first[1]]);
  }
  return simplified.length >= 4 ? simplified : null;
}

function simplifyPolygon(poly: PolygonCoords, tolerance: number): PolygonCoords | null {
  const outer = simplifyRing(poly[0]!, tolerance);
  if (!outer) return null;
  const holes = poly
    .slice(1)
    .map((h) => simplifyRing(h, tolerance))
    .filter((h): h is Ring => h !== null && ringArea(h) > 0.0006);
  return [outer, ...holes];
}

async function main() {
  const deptosJson = JSON.parse(
    await fs.readFile(VALIDATED_DEPTOS_PATH, 'utf-8')
  ) as DepartamentoValidado[];
  const activeMap = new Map(
    deptosJson.filter((d) => d.tiene_datos_confiables).map((d) => [d.departamento_id, d])
  );

  console.log(`[geo:provincias] Descargando en memoria ${OFFICIAL_URL}...`);
  const res = await fetch(OFFICIAL_URL, {
    headers: { 'User-Agent': 'atlas-quimico-ar/0.1 (georef-provincias-shards)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${OFFICIAL_URL}`);

  const rawBuffer = Buffer.from(await res.arrayBuffer());
  const rawHash = sha256(rawBuffer);
  const rawGeo = JSON.parse(rawBuffer.toString('utf-8')) as {
    type: string;
    features: GeorefDeptFeature[];
  };

  const byProv = new Map<string, ProvinceDeptShardFeature[]>();

  for (const feat of rawGeo.features) {
    const rawId = String(feat.properties?.id ?? '').padStart(5, '0');
    const provId = String(
      feat.properties?.provincia?.id ?? feat.properties?.provincia_id ?? rawId.slice(0, 2)
    ).padStart(2, '0');
    if (!feat.geometry) continue;
    // Excluir sector antártico e islas australes gigantes del shard 94 continental para encuadre limpio de Río Grande / Ushuaia / Tolhuin
    if (rawId === '94028' || rawId === '94021') continue;

    const isActive = activeMap.has(rawId);
    // CABA y conurbano son polígonos chicos: usar mayor precisión para que no pierdan forma
    const isCompactUrban = provId === '02' || (provId === '06' && ringArea(
      feat.geometry.type === 'Polygon' ? feat.geometry.coordinates[0]! : feat.geometry.coordinates[0]![0]!
    ) < 0.08);
    const tol = isActive || isCompactUrban ? 0.0008 : 0.0016;

    const rawPolys: MultiPolygonCoords =
      feat.geometry.type === 'Polygon' ? [feat.geometry.coordinates] : feat.geometry.coordinates;

    const sorted = [...rawPolys].sort((a, b) => ringArea(b[0]!) - ringArea(a[0]!));
    const kept: MultiPolygonCoords = [];
    sorted.forEach((poly, idx) => {
      if (idx === 0 || ringArea(poly[0]!) >= 0.0005) {
        const simp = simplifyPolygon(poly, tol);
        if (simp) kept.push(simp);
      }
    });
    if (kept.length === 0) continue;

    const activeRow = activeMap.get(rawId);
    const list = byProv.get(provId) ?? [];
    list.push({
      type: 'Feature',
      properties: {
        id: rawId,
        nombre: activeRow?.nombre ?? feat.properties?.nombre ?? rawId,
        provincia_id: provId,
        activo: isActive,
      },
      geometry:
        kept.length === 1
          ? { type: 'Polygon', coordinates: kept[0]! }
          : { type: 'MultiPolygon', coordinates: kept },
    });
    byProv.set(provId, list);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  const shardsMeta: Record<string, { departamentos: number; activos: number; bytes: number; hash: string }> = {};
  let totalBytes = 0;
  let totalDeptos = 0;

  for (const [provId, features] of [...byProv.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    features.sort((a, b) => a.properties.id.localeCompare(b.properties.id));
    const payload = JSON.stringify({
      type: 'FeatureCollection',
      provincia_id: provId,
      features,
    });
    const outPath = path.join(OUT_DIR, `${provId}.json`);
    await fs.writeFile(outPath, payload, 'utf-8');
    const bytes = Buffer.byteLength(payload, 'utf-8');
    totalBytes += bytes;
    totalDeptos += features.length;
    shardsMeta[provId] = {
      departamentos: features.length,
      activos: features.filter((f) => f.properties.activo).length,
      bytes,
      hash: sha256(payload),
    };
  }

  const manifestObj = {
    version: 1,
    fuente: OFFICIAL_URL,
    organismo: 'IGN / API Georef v2.0',
    fecha_descarga: new Date().toISOString().slice(0, 10),
    hash_raw: rawHash,
    total_provincias: Object.keys(shardsMeta).length,
    total_departamentos: totalDeptos,
    total_bytes: totalBytes,
    provincias: shardsMeta,
  };
  await fs.writeFile(
    path.join(OUT_DIR, 'manifest.json'),
    `${JSON.stringify(manifestObj, null, 2)}\n`,
    'utf-8'
  );

  console.log(
    `[geo:provincias] OK — ${Object.keys(shardsMeta).length} provincias, ${totalDeptos} departamentos (${Math.round(
      totalBytes / 1024
    )} KB totales, promedio ${Math.round(totalBytes / 1024 / 24)} KB/provincia) en public/geo/provincias/.`
  );
}

main().catch((err) => {
  console.error('[geo:provincias] ERROR:', err);
  process.exit(1);
});
