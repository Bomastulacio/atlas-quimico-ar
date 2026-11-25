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

interface OutDeptFeature {
  type: 'Feature';
  properties: {
    id: string;
    nombre: string;
    provincia_id: string;
    provincia_nombre: string;
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
const GEO_DIR = path.join(process.cwd(), 'data', 'validated', 'geo');
const MANIFEST_GEO_PATH = path.join(GEO_DIR, 'manifest.geo.json');
const OUT_GEO_PATH = path.join(GEO_DIR, 'departamentos_activos.geojson');
const OFFICIAL_URL = 'https://apis.datos.gob.ar/georef/api/v2.0/departamentos.geojson';

function sha256(content: string | Buffer): string {
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

function roundCoord(n: number): number {
  return Math.round(n * 100000) / 100000;
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
    .filter((h): h is Ring => h !== null && ringArea(h) > 0.0005);
  return [outer, ...holes];
}

async function main() {
  const deptosJson = JSON.parse(
    await fs.readFile(VALIDATED_DEPTOS_PATH, 'utf-8')
  ) as DepartamentoValidado[];
  const targetIds = new Map(
    deptosJson
      .filter((d) => d.tiene_datos_confiables)
      .map((d) => [d.departamento_id, d])
  );

  console.log(
    `[geo:prepare:deptos] Descargando en memoria ${OFFICIAL_URL} para filtrar ${targetIds.size} departamentos con datos confiables...`
  );
  const res = await fetch(OFFICIAL_URL, {
    headers: { 'User-Agent': 'atlas-quimico-ar/0.1 (georef-sync)' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al descargar ${OFFICIAL_URL}`);
  }
  const rawBuffer = Buffer.from(await res.arrayBuffer());
  const rawHash = sha256(rawBuffer);
  const rawGeo = JSON.parse(rawBuffer.toString('utf-8')) as {
    type: string;
    features: GeorefDeptFeature[];
  };

  console.log(
    `[geo:prepare:deptos] Descargados ${Math.round(rawBuffer.byteLength / 1024 / 1024)} MB (${rawGeo.features.length} departamentos totales en IGN/Georef). Hash: ${rawHash}`
  );

  const outFeatures: OutDeptFeature[] = [];
  for (const feat of rawGeo.features) {
    const rawId = String(feat.properties?.id ?? '').padStart(5, '0');
    const target = targetIds.get(rawId);
    if (!target || !feat.geometry) continue;

    const rawPolys: MultiPolygonCoords =
      feat.geometry.type === 'Polygon'
        ? [feat.geometry.coordinates]
        : feat.geometry.coordinates;

    // Tolerancia de alta precisión (0.0008°, ~80m) para zoom profundo de hasta 18x sin perder costas ni bordes
    const sorted = [...rawPolys].sort((a, b) => ringArea(b[0]!) - ringArea(a[0]!));
    const kept: MultiPolygonCoords = [];
    sorted.forEach((poly, idx) => {
      if (idx === 0 || ringArea(poly[0]!) >= 0.0004) {
        const simp = simplifyPolygon(poly, 0.0008);
        if (simp) kept.push(simp);
      }
    });

    if (kept.length === 0) continue;

    outFeatures.push({
      type: 'Feature',
      properties: {
        id: rawId,
        nombre: target.nombre,
        provincia_id: target.provincia_id,
        provincia_nombre:
          feat.properties?.provincia?.nombre ?? feat.properties?.provincia_nombre ?? '',
      },
      geometry:
        kept.length === 1
          ? { type: 'Polygon', coordinates: kept[0]! }
          : { type: 'MultiPolygon', coordinates: kept },
    });
  }

  outFeatures.sort((a, b) => a.properties.id.localeCompare(b.properties.id));

  const missing = [...targetIds.keys()].filter(
    (id) => !outFeatures.some((f) => f.properties.id === id)
  );
  if (missing.length > 0) {
    throw new Error(`Faltan polígonos Georef para los departamentos: ${missing.join(', ')}`);
  }

  const outJson = JSON.stringify({
    type: 'FeatureCollection',
    features: outFeatures,
  });

  await fs.mkdir(GEO_DIR, { recursive: true });
  await fs.writeFile(OUT_GEO_PATH, outJson, 'utf-8');

  const manifest = JSON.parse(await fs.readFile(MANIFEST_GEO_PATH, 'utf-8')) as Record<
    string,
    unknown
  >;
  const existingValidated = (manifest.archivos_validados ?? {}) as Record<string, unknown>;
  manifest.departamentos_oficial = {
    fuente: 'API Georef — División político-territorial de Departamentos (IGN / datos.gob.ar)',
    organismo: 'IGN / Secretaría de Innovación, Ciencia y Tecnología',
    url: OFFICIAL_URL,
    fecha_descarga: new Date().toISOString().slice(0, 10),
    hash_raw: rawHash,
    criterio: 'Solo departamentos con tiene_datos_confiables = true en departamentos.json',
  };
  manifest.archivos_validados = {
    ...existingValidated,
    'departamentos_activos.geojson': {
      departamentos: outFeatures.length,
      bytes: Buffer.byteLength(outJson, 'utf-8'),
      hash: sha256(outJson),
    },
  };

  await fs.writeFile(MANIFEST_GEO_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');

  console.log(
    `[geo:prepare:deptos] OK — ${outFeatures.length} departamentos validados (${Math.round(
      Buffer.byteLength(outJson, 'utf-8') / 1024
    )} KB) en data/validated/geo/departamentos_activos.geojson.`
  );
}

main().catch((err) => {
  console.error('[geo:prepare:deptos] ERROR:', err);
  process.exit(1);
});
