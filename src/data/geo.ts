import type { FeatureCollection, Geometry } from 'geojson';
import continentalRaw from '@data/geo/provincias_continental.geojson?raw';
import antartidaRaw from '@data/geo/antartida_islas.geojson?raw';
import manifestGeoRaw from '@data/geo/manifest.geo.json';

export interface ProvinciaGeoProperties {
  id: string;
  nombre: string;
  sector?: 'continental_malvinas' | 'antartida_islas';
}

export type ProvinciasFeatureCollection = FeatureCollection<Geometry, ProvinciaGeoProperties>;

export interface GeoManifest {
  fuente: string;
  organismo: string;
  url: string;
  fecha_descarga: string;
  archivo_raw: string;
  hash_raw: string;
  proyeccion_recomendada: {
    continental_malvinas: string;
    antartida_islas: string;
  };
  archivos_validados: Record<
    string,
    {
      jurisdicciones?: number;
      features?: number;
      bytes: number;
      hash: string;
    }
  >;
}

let cachedContinental: ProvinciasFeatureCollection | null = null;
let cachedAntartida: ProvinciasFeatureCollection | null = null;

export function getGeoContinental(): ProvinciasFeatureCollection {
  if (!cachedContinental) {
    cachedContinental = JSON.parse(continentalRaw) as ProvinciasFeatureCollection;
  }
  return cachedContinental;
}

export function getGeoAntartidaIslas(): ProvinciasFeatureCollection {
  if (!cachedAntartida) {
    cachedAntartida = JSON.parse(antartidaRaw) as ProvinciasFeatureCollection;
  }
  return cachedAntartida;
}

export function getGeoManifest(): GeoManifest {
  return manifestGeoRaw as GeoManifest;
}
