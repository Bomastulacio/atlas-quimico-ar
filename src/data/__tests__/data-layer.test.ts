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
  it('declara el origen verificado (sheets_local o supabase) y mantiene honestidad sobre cadenas pendientes', () => {
    expect(['sheets_local', 'supabase']).toContain(getManifest().origen);
    // Sigue en true mientras existan marcadores pendientes de Etapa 6 (algodón, soja, petroquímica, biodiésel)
    expect(isExampleDataset()).toBe(true);
  });

  it('carga las 24 jurisdicciones oficiales Georef (23 provincias + CABA)', () => {
    const provincias = getProvincias();
    expect(provincias).toHaveLength(24);
    expect(getProvincia('26')?.nombre).toBe('Chubut');
    expect(getProvincia('26')?.cobertura_datos).toBe('completa');
    expect(getProvincia('38')?.cobertura_datos).toBe('completa');
    expect(getProvincia('10')?.cobertura_datos).toBe('completa');
    expect(getProvincia('66')?.cobertura_datos).toBe('completa');
    expect(getProvincia('06')?.cobertura_datos).toBe('parcial');
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

  it('devuelve la ficha verificada completa de litio (Puna) con 5 pasos, 5 conexiones, 3 plantas y comercio UN Comtrade', () => {
    const ficha = getFichaProducto('litio');
    expect(ficha).toBeDefined();
    expect(ficha?.producto.estado_mvp).toBe('validado');
    expect(ficha?.procesos).toHaveLength(1);
    expect(ficha?.procesos[0].pasos.map((p) => p.orden)).toEqual([1, 2, 3, 4, 5]);
    expect(ficha?.procesos[0].conexiones).toHaveLength(5);
    expect(ficha?.plantas).toHaveLength(3);
    expect(getProduccion('litio')).toHaveLength(2);
    expect(getComercioExterior('litio')).toHaveLength(4);
    // Olaroz sin capacidad oficial publicada y volumen importado 2024 sin_datos
    const olaroz = ficha?.plantas.find((p) => p.planta_id === 'olaroz-sales-de-jujuy');
    expect(olaroz?.capacidad.estado).toBe('sin_datos');
    const comex2024Vol = ficha?.comercioExterior.find((c) => c.registro_id === 'comex-litio-2024-t');
    expect(comex2024Vol?.importacion.estado).toBe('sin_datos');
    expect(comex2024Vol?.importacion.valor).toBeNull();
  });

  it('devuelve la ficha verificada completa de urea (Bahía Blanca) con 5 pasos, 6 conexiones, serie Profertil CNV y UN Comtrade', () => {
    const ficha = getFichaProducto('urea');
    expect(ficha).toBeDefined();
    expect(ficha?.producto.estado_mvp).toBe('validado');
    expect(ficha?.procesos).toHaveLength(1);
    expect(ficha?.procesos[0].pasos.map((p) => p.orden)).toEqual([1, 2, 3, 4, 5]);
    expect(ficha?.procesos[0].conexiones).toHaveLength(6);
    expect(ficha?.plantas).toHaveLength(1);
    expect(ficha?.plantas[0].capacidad.estado).toBe('dato');
    expect(getProduccion('urea')).toHaveLength(4);
    expect(getComercioExterior('urea')).toHaveLength(3);
    // Exportaciones 2024 no reportadas por UN Comtrade deben figurar como sin_datos
    const comex2024 = ficha?.comercioExterior.find((c) => c.registro_id === 'comex-urea-310210-2024-usd');
    expect(comex2024?.exportacion.estado).toBe('sin_datos');
    expect(comex2024?.exportacion.valor).toBeNull();
  });

  it('mantiene pendientes las 4 cadenas restantes de Etapa 6 sin inventar cifras', () => {
    for (const id of ['algodon', 'soja', 'petroquimica', 'biodiesel']) {
      const ficha = getFichaProducto(id);
      expect(ficha?.producto.estado_mvp).toBe('pendiente');
      expect(ficha?.produccion).toHaveLength(0);
    }
  });

  it('calcula el resumen de cobertura provincial y departamental', () => {
    const resumen = getResumenCobertura();
    expect(resumen.totalProvincias).toBe(24);
    expect(resumen.porNivel.completa).toBe(4);
    expect(resumen.porNivel.parcial).toBe(1);
    expect(resumen.departamentosConDatos).toBe(6);
    expect(getDepartamentos()).toHaveLength(6);
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

    const buenosAires = mapaData.find((p) => p.provincia.provincia_id === '06');
    expect(buenosAires?.dominante?.producto_id).toBe('urea');
    expect(buenosAires?.plantas).toHaveLength(1);
  });
});
