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
  getProduccion,
  getProductos,
  getProductosPorProvincia,
  getProvincia,
  getProvincias,
  getResumenCobertura,
  isExampleDataset,
} from '@/data';

describe('Capa única de acceso a datos (src/data)', () => {
  it('declara el origen de planillas locales y mantiene honestidad sobre cadenas pendientes', () => {
    expect(getManifest().origen).toBe('sheets_local');
    // Sigue en true mientras existan marcadores pendientes de Etapa 6 (solo Aluminio es 100% oficial)
    expect(isExampleDataset()).toBe(true);
  });

  it('carga las 24 jurisdicciones oficiales Georef (23 provincias + CABA)', () => {
    const provincias = getProvincias();
    expect(provincias).toHaveLength(24);
    expect(getProvincia('26')?.nombre).toBe('Chubut');
    expect(getProvincia('26')?.cobertura_datos).toBe('completa');
    expect(getProvincia('94')?.iso_3166_2).toBe('AR-V');
  });

  it('resuelve producto dominante y secundarios por provincia', () => {
    const buenosAires = getProductosPorProvincia('06');
    expect(buenosAires.dominante?.producto_id).toBe('urea');
    expect(buenosAires.secundarios.map((p) => p.producto_id)).toContain('petroquimica');
  });

  it('devuelve la ficha verificada completa de aluminio con 6 pasos, 7 conexiones, producción y comercio exterior', () => {
    const ficha = getFichaProducto('aluminio');
    expect(ficha).toBeDefined();
    expect(ficha?.producto.estado_mvp).toBe('validado');
    expect(ficha?.procesos).toHaveLength(1);
    expect(ficha?.procesos[0].pasos.map((p) => p.orden)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ficha?.procesos[0].conexiones).toHaveLength(7);
    expect(ficha?.plantas[0].provincia?.provincia_id).toBe('26');
    expect(ficha?.plantas[0].capacidad.estado).toBe('dato');
    expect(getProceso('aluminio-hall-heroult')?.pasos).toHaveLength(6);
    expect(getProduccion('aluminio')).toHaveLength(5);
    expect(getComercioExterior('aluminio')).toHaveLength(10);
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
    expect(resumen.porNivel.completa).toBe(1);
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
