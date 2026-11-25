import { describe, expect, it } from 'vitest';
import {
  getComercioExterior,
  getDepartamentos,
  getFichaProducto,
  getGeoAntartidaIslas,
  getGeoContinental,
  getGeoDepartamentos,
  getGeoManifest,
  getManifest,
  getMapaDepartamentosData,
  getMapaProvinciasData,
  getProceso,
  getProduccion,
  getProductos,
  getProductosPorProvincia,
  getProvincia,
  getProvincias,
  getResumenCobertura,
  getSearchIndex,
  isExampleDataset,
} from '@/data';

describe('Capa única de acceso a datos (src/data)', () => {
  it('declara el origen verificado (supabase) en modo real sin marcadores de ejemplo', () => {
    expect(['sheets_local', 'supabase']).toContain(getManifest().origen);
    expect(isExampleDataset()).toBe(false);
  });

  it('carga las 24 jurisdicciones oficiales Georef (23 provincias + CABA) con 7 completas y 17 sin_datos', () => {
    const provincias = getProvincias();
    expect(provincias).toHaveLength(24);
    for (const id of ['06', '10', '22', '26', '38', '66', '82']) {
      expect(getProvincia(id)?.cobertura_datos).toBe('completa');
    }
    expect(getProvincia('94')?.iso_3166_2).toBe('AR-V');
  });

  it('resuelve producto dominante y secundarios por provincia', () => {
    const buenosAires = getProductosPorProvincia('06');
    expect(buenosAires.dominante?.producto_id).toBe('urea');
    expect(buenosAires.secundarios.map((p) => p.producto_id)).toContain('petroquimica');

    const santaFe = getProductosPorProvincia('82');
    expect(santaFe.dominante?.producto_id).toBe('soja');
    expect(santaFe.secundarios.map((p) => p.producto_id)).toContain('biodiesel');
  });

  it('valida las 7 cadenas MVP completas con procesos, pasos y comercio exterior verificados', () => {
    const expectedIds = ['aluminio', 'litio', 'urea', 'algodon', 'soja', 'petroquimica', 'biodiesel'];
    expect(getProductos()).toHaveLength(7);

    for (const id of expectedIds) {
      const ficha = getFichaProducto(id);
      expect(ficha).toBeDefined();
      expect(ficha?.producto.estado_mvp).toBe('validado');
      expect(ficha?.procesos).toHaveLength(1);
      expect(ficha?.procesos[0].pasos.length).toBeGreaterThanOrEqual(5);
      expect(ficha?.plantas.length).toBeGreaterThanOrEqual(1);
      expect(ficha?.comercioExterior.length).toBeGreaterThanOrEqual(3);
    }

    expect(getProceso('aluminio-hall-heroult')?.pasos).toHaveLength(6);
    expect(getProduccion('aluminio')).toHaveLength(5);
    expect(getComercioExterior('aluminio')).toHaveLength(10);
  });

  it('mantiene transparencia explícita sin_datos donde no existe dato público auditado', () => {
    const petro = getFichaProducto('petroquimica');
    expect(petro?.produccion[0].medicion.estado).toBe('sin_datos');
    expect(petro?.produccion[0].medicion.valor).toBeNull();

    const algodon = getFichaProducto('algodon');
    expect(algodon?.plantas[0].capacidad.estado).toBe('sin_datos');

    const ureaComex24 = getComercioExterior('urea').find(
      (c) => c.registro_id === 'comex-urea-310210-2024-usd'
    );
    expect(ureaComex24?.exportacion.estado).toBe('sin_datos');
    expect(ureaComex24?.exportacion.valor).toBeNull();
  });

  it('calcula el resumen de cobertura provincial y departamental', () => {
    const resumen = getResumenCobertura();
    expect(resumen.totalProvincias).toBe(24);
    expect(resumen.porNivel.completa).toBe(7);
    expect(resumen.porNivel.sin_datos).toBe(17);
    expect(resumen.departamentosConDatos).toBe(10);
    expect(getDepartamentos()).toHaveLength(10);
  });

  it('alinea 1:1 los 24 códigos Georef del GeoJSON IGN con las provincias y las 11 plantas', () => {
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

    const totalPlantas = mapaData.reduce((acc, p) => acc + p.plantas.length, 0);
    expect(totalPlantas).toBe(11);
  });

  it('alinea 1:1 los 10 departamentos confiables con el GeoJSON oficial IGN y el índice de búsqueda', () => {
    const deptGeo = getGeoDepartamentos();
    const deptData = getMapaDepartamentosData();
    const manifestGeo = getGeoManifest();

    expect(deptGeo.features).toHaveLength(10);
    expect(deptData).toHaveLength(10);
    expect(manifestGeo.departamentos_oficial?.hash_raw).toMatch(/^sha256:[a-f0-9]{64}$/);

    const geoDeptIds = new Set(deptGeo.features.map((f) => f.properties.id));
    for (const item of deptData) {
      expect(item.departamento.tiene_datos_confiables).toBe(true);
      expect(geoDeptIds.has(item.departamento.departamento_id)).toBe(true);
      expect(item.productos.length).toBeGreaterThanOrEqual(1);
    }

    const searchDeptItems = getSearchIndex().filter((i) => i.kind === 'departamento');
    expect(searchDeptItems).toHaveLength(10);
  });
});
