import { describe, expect, it } from 'vitest';
import {
  getComercioExterior,
  getDepartamentos,
  getFichaProducto,
  getGeoAntartidaIslas,
  getGeoContinental,
  getGeoManifest,
  getManifest,
  getMapaProvinciasData,
  getProceso,
  getProductos,
  getProductosPorProvincia,
  getProvincia,
  getProvincias,
  getResumenCobertura,
  isExampleDataset,
} from '@/data';

describe('Capa única de acceso a datos (src/data)', () => {
  it('marca el dataset inicial de Etapa 1 explícitamente como ejemplo', () => {
    expect(isExampleDataset()).toBe(true);
    expect(getManifest().origen).toBe('fixtures_ejemplo');
  });

  it('carga las 24 jurisdicciones oficiales Georef (23 provincias + CABA)', () => {
    const provincias = getProvincias();
    expect(provincias).toHaveLength(24);
    expect(getProvincia('26')?.nombre).toBe('Chubut');
    expect(getProvincia('94')?.iso_3166_2).toBe('AR-V');
  });

  it('resuelve producto dominante y secundarios por provincia', () => {
    const buenosAires = getProductosPorProvincia('06');
    expect(buenosAires.dominante?.producto_id).toBe('urea');
    expect(buenosAires.secundarios.map((p) => p.producto_id)).toContain('petroquimica');
  });

  it('devuelve la ficha completa de aluminio con pasos ordenados y conexiones', () => {
    const ficha = getFichaProducto('aluminio');
    expect(ficha).toBeDefined();
    expect(ficha?.procesos).toHaveLength(1);
    expect(ficha?.procesos[0].pasos.map((p) => p.orden)).toEqual([1, 2, 3]);
    expect(ficha?.procesos[0].conexiones).toHaveLength(2);
    expect(ficha?.plantas[0].provincia?.provincia_id).toBe('26');
    expect(getProceso('aluminio-hall-heroult')?.pasos).toHaveLength(3);
  });

  it('representa explícitamente "sin_datos" para productos sin cifras verificadas', () => {
    const comexLitio = getComercioExterior('litio');
    expect(comexLitio).toHaveLength(1);
    expect(comexLitio[0].exportacion.estado).toBe('sin_datos');
    expect(comexLitio[0].exportacion.valor).toBeNull();
  });

  it('calcula el resumen de cobertura provincial y departamental', () => {
    const resumen = getResumenCobertura();
    expect(resumen.totalProvincias).toBe(24);
    expect(resumen.departamentosConDatos).toBe(getDepartamentos().length);
    expect(getProductos()).toHaveLength(7);
  });

  it('alinea 1:1 los 24 códigos Georef del GeoJSON IGN con las provincias y el recuadro Antártida', () => {
    const continental = getGeoContinental();
    const antartida = getGeoAntartidaIslas();
    const manifestGeo = getGeoManifest();
    const mapaData = getMapaProvinciasData();

    expect(continental.features).toHaveLength(24);
    expect(antartida.features).toHaveLength(1);
    expect(antartida.features[0].properties.id).toBe('94');
    expect(manifestGeo.hash_raw).toMatch(/^sha256:[a-f0-9]{64}$/);

    const geoIds = new Set(continental.features.map((f) => f.properties.id));
    for (const item of mapaData) {
      expect(geoIds.has(item.provincia.provincia_id)).toBe(true);
    }

    const chubut = mapaData.find((p) => p.provincia.provincia_id === '26');
    expect(chubut?.dominante?.producto_id).toBe('aluminio');
    expect(chubut?.plantas).toHaveLength(1);
  });
});
