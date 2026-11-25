import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

type Position = [number, number];
type Ring = Position[];
type PolygonCoords = Ring[];
type MultiPolygonCoords = PolygonCoords[];

interface GeoFeature {
  type: 'Feature';
  properties: {
    id: string;
    nombre: string;
    sector?: 'continental_malvinas' | 'antartida_islas';
  };
  geometry:
    | { type: 'Polygon'; coordinates: PolygonCoords }
    | { type: 'MultiPolygon'; coordinates: MultiPolygonCoords };
}

interface GeoFeatureCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

const RAW_PATH = path.join(process.cwd(), 'data', 'raw', 'georef_provincias.geojson');
const OUT_DIR = path.join(process.cwd(), 'data', 'validated', 'geo');
const OFFICIAL_URL = 'https://apis.datos.gob.ar/georef/api/v2.0/provincias.geojson';

function sha256(content: string | Buffer): string {
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

function roundCoord(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function ringArea(ring: Ring): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function perpendicularDistance(p: Position, a: Position, b: Position): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) {
    return Math.hypot(p[0] - a[0], p[1] - a[1]);
  }
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const projX = a[0] + t * dx;
  const projY = a[1] + t * dy;
  return Math.hypot(p[0] - projX, p[1] - projY);
}

function simplifyDP(points: Ring, tolerance: number): Ring {
  if (points.length <= 4) return points;
  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
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
  return [points[0], points[end]];
}

function simplifyRing(ring: Ring, tolerance: number): Ring | null {
  if (ring.length < 4) return null;
  const simplified = simplifyDP(ring, tolerance).map(([x, y]): Position => [
    roundCoord(x),
    roundCoord(y),
  ]);
  // Cerrar el anillo si se perdió el cierre y evitar polígonos degenerados
  const first = simplified[0];
  const last = simplified[simplified.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    simplified.push([first[0], first[1]]);
  }
  return simplified.length >= 4 ? simplified : null;
}

function simplifyPolygon(poly: PolygonCoords, tolerance: number): PolygonCoords | null {
  const outer = simplifyRing(poly[0], tolerance);
  if (!outer) return null;
  const holes = poly
    .slice(1)
    .map((h) => simplifyRing(h, tolerance))
    .filter((h): h is Ring => h !== null && ringArea(h) > 0.002);
  return [outer, ...holes];
}

function polyBounds(poly: PolygonCoords) {
  let minLon = 180;
  let maxLon = -180;
  let minLat = 90;
  let maxLat = -90;
  for (const [lon, lat] of poly[0]) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLon, maxLon, minLat, maxLat };
}

async function loadRawProvinciasBuffer(): Promise<Buffer> {
  try {
    return await fs.readFile(RAW_PATH);
  } catch {
    console.log(`[geo:prepare] Descargando en memoria ${OFFICIAL_URL}...`);
    const res = await fetch(OFFICIAL_URL, {
      headers: { 'User-Agent': 'atlas-quimico-ar/0.1 (georef-sync)' },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} al descargar ${OFFICIAL_URL}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
}

async function main() {
  const rawBuffer = await loadRawProvinciasBuffer();
  const rawHash = sha256(rawBuffer);
  const rawGeo = JSON.parse(rawBuffer.toString('utf-8')) as GeoFeatureCollection;

  const continentalFeatures: GeoFeature[] = [];
  const antartidaIslasFeatures: GeoFeature[] = [];

  for (const feat of rawGeo.features) {
    const id = String(feat.properties.id).padStart(2, '0');
    const nombre = feat.properties.nombre;

    // Tolerancia fina (0.006°, ~600m) para conservar riberas y límites en zoom departamental profundo
    const tol = id === '02' ? 0.0015 : 0.006;
    const minArea = id === '02' ? 0 : 0.008;

    const rawPolys: MultiPolygonCoords =
      feat.geometry.type === 'Polygon'
        ? [feat.geometry.coordinates]
        : feat.geometry.coordinates;

    if (id === '94') {
      const mainAndMalvinas: MultiPolygonCoords = [];
      const antartidaAndGeorgias: MultiPolygonCoords = [];

      for (const poly of rawPolys) {
        const b = polyBounds(poly);
        const area = ringArea(poly[0]);

        if (b.maxLat <= -60) {
          // Sector Antártico Argentino (recuadro bicontinental polar)
          if (area >= 0.08) {
            const simp = simplifyPolygon(poly, 0.06);
            if (simp) antartidaAndGeorgias.push(simp);
          }
        } else if (b.minLon > -42) {
          // Georgias del Sur y Sandwich del Sur (recuadro Islas del Atlántico Sur)
          if (area >= 0.02) {
            const simp = simplifyPolygon(poly, 0.03);
            if (simp) antartidaAndGeorgias.push(simp);
          }
        } else {
          // Isla Grande de Tierra del Fuego, Isla de los Estados e Islas Malvinas
          if (area >= 0.015) {
            const simp = simplifyPolygon(poly, 0.022);
            if (simp) mainAndMalvinas.push(simp);
          }
        }
      }

      continentalFeatures.push({
        type: 'Feature',
        properties: { id, nombre, sector: 'continental_malvinas' },
        geometry: { type: 'MultiPolygon', coordinates: mainAndMalvinas },
      });

      antartidaIslasFeatures.push({
        type: 'Feature',
        properties: { id, nombre, sector: 'antartida_islas' },
        geometry: { type: 'MultiPolygon', coordinates: antartidaAndGeorgias },
      });
      continue;
    }

    // Resto de las 23 jurisdicciones: conservar siempre el polígono más grande + islas significativas
    const sorted = [...rawPolys].sort((a, b) => ringArea(b[0]) - ringArea(a[0]));
    const kept: MultiPolygonCoords = [];
    sorted.forEach((poly, index) => {
      if (index === 0 || ringArea(poly[0]) >= minArea) {
        const simp = simplifyPolygon(poly, tol);
        if (simp) kept.push(simp);
      }
    });

    continentalFeatures.push({
      type: 'Feature',
      properties: { id, nombre, sector: 'continental_malvinas' },
      geometry:
        kept.length === 1
          ? { type: 'Polygon', coordinates: kept[0] }
          : { type: 'MultiPolygon', coordinates: kept },
    });
  }

  // Orden determinista por código Georef
  continentalFeatures.sort((a, b) => a.properties.id.localeCompare(b.properties.id));

  const continentalJson = JSON.stringify({
    type: 'FeatureCollection',
    features: continentalFeatures,
  });
  const antartidaJson = JSON.stringify({
    type: 'FeatureCollection',
    features: antartidaIslasFeatures,
  });

  let existingManifest: Record<string, unknown> = {};
  try {
    existingManifest = JSON.parse(
      await fs.readFile(path.join(OUT_DIR, 'manifest.geo.json'), 'utf-8')
    ) as Record<string, unknown>;
  } catch {
    existingManifest = {};
  }
  const existingValidated = (existingManifest.archivos_validados ?? {}) as Record<string, unknown>;

  const manifestGeo: Record<string, unknown> = {
    ...existingManifest,
    fuente: 'API Georef - División político-territorial de Provincias (IGN / datos.gob.ar)',
    organismo: 'IGN / Secretaría de Innovación, Ciencia y Tecnología',
    url: OFFICIAL_URL,
    fecha_descarga: new Date().toISOString().slice(0, 10),
    archivo_raw: 'storage://atlas-raw-sources/georef-ar/provincias.geojson',
    hash_raw: rawHash,
    proyeccion_recomendada: {
      continental_malvinas: 'Transverse Mercator centrada en 64°O (familia Gauss-Krüger IGN)',
      antartida_islas: 'Stereographic Polar centrada en Polo Sur / 50°O (recuadro bicontinental IGN)',
    },
    archivos_validados: {
      ...existingValidated,
      'provincias_continental.geojson': {
        jurisdicciones: continentalFeatures.length,
        bytes: Buffer.byteLength(continentalJson, 'utf-8'),
        hash: sha256(continentalJson),
      },
      'antartida_islas.geojson': {
        features: antartidaIslasFeatures.length,
        bytes: Buffer.byteLength(antartidaJson, 'utf-8'),
        hash: sha256(antartidaJson),
      },
    },
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, 'provincias_continental.geojson'), continentalJson, 'utf-8');
  await fs.writeFile(path.join(OUT_DIR, 'antartida_islas.geojson'), antartidaJson, 'utf-8');
  await fs.writeFile(
    path.join(OUT_DIR, 'manifest.geo.json'),
    `${JSON.stringify(manifestGeo, null, 2)}\n`,
    'utf-8'
  );

  console.log(
    `[geo:prepare] OK — ${continentalFeatures.length} jurisdicciones (${Math.round(
      Buffer.byteLength(continentalJson) / 1024
    )} KB) + recuadro Antártida/Islas (${Math.round(
      Buffer.byteLength(antartidaJson) / 1024
    )} KB).`
  );
  console.log(`[geo:prepare] Hash raw oficial: ${rawHash}`);
}

main().catch((err) => {
  console.error('[geo:prepare] ERROR:', err);
  process.exit(1);
});
