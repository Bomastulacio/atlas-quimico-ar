import type { FeatureCollection, Geometry } from 'geojson';
import continentalRaw from '@data/geo/provincias_continental.geojson?raw';
import antartidaRaw from '@data/geo/antartida_islas.geojson?raw';
import departamentosRaw from '@data/geo/departamentos_activos.geojson?raw';
import manifestGeoRaw from '@data/geo/manifest.geo.json';

export interface ProvinciaGeoProperties {
  id: string;
  nombre: string;
  sector?: 'continental_malvinas' | 'antartida_islas';
}

export interface DepartamentoGeoProperties {
  id: string;
  nombre: string;
  provincia_id: string;
  provincia_nombre: string;
}

export type ProvinciasFeatureCollection = FeatureCollection<Geometry, ProvinciaGeoProperties>;
export type DepartamentosFeatureCollection = FeatureCollection<Geometry, DepartamentoGeoProperties>;

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
  departamentos_oficial?: {
    fuente: string;
    organismo: string;
    url: string;
    fecha_descarga: string;
    hash_raw: string;
    criterio: string;
  };
  archivos_validados: Record<
    string,
    {
      jurisdicciones?: number;
      departamentos?: number;
      features?: number;
      bytes: number;
      hash: string;
    }
  >;
}

let cachedContinental: ProvinciasFeatureCollection | null = null;
let cachedAntartida: ProvinciasFeatureCollection | null = null;
let cachedDepartamentos: DepartamentosFeatureCollection | null = null;

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

export function getGeoDepartamentos(): DepartamentosFeatureCollection {
  if (!cachedDepartamentos) {
    cachedDepartamentos = JSON.parse(departamentosRaw) as DepartamentosFeatureCollection;
  }
  return cachedDepartamentos;
}

export function getGeoManifest(): GeoManifest {
  return manifestGeoRaw as GeoManifest;
}
