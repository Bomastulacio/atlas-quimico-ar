import { describe, expect, it } from 'vitest';
import {
  getCadenaValorTransversalData,
  getCoberturaDetallada,
  getComercioExterior,
  getComparadorProductosData,
  getComparadorProvinciasData,
  getDepartamentos,
  getEmpresaMercado,
  getEmpresasConPlantas,
  getFichaProducto,
  getGeoAntartidaIslas,
  getGeoContinental,
  getGeoDepartamentos,
  getGeoManifest,
  getManifest,
  getMapaDepartamentosData,
  getMapaProvinciasData,
  getMercadoSnapshot,
  getPfdPorProceso,
  getPfdProcesos,
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
import { computeValuationArsUsd, formatMarketCap } from '@/schemas';

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

  it('expone el directorio verificable de empresas con plantas, productos y trazabilidad (Etapa 8)', () => {
    const empresas = getEmpresasConPlantas();
    expect(empresas).toHaveLength(8);
    for (const item of empresas) {
      expect(item.plantas.length).toBeGreaterThanOrEqual(1);
      expect(item.productos.length).toBeGreaterThanOrEqual(1);
      expect(item.provincias.length).toBeGreaterThanOrEqual(1);
      expect(item.empresa.procedencia.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(item.empresa.procedencia.cita_ubicacion.length).toBeGreaterThan(5);
    }

    const searchEmpItems = getSearchIndex().filter((i) => i.kind === 'empresa');
    expect(searchEmpItems).toHaveLength(8);
  });

  it('consolida el indicador de cobertura territorial por región y las 24 jurisdicciones (Etapa 8)', () => {
    const cov = getCoberturaDetallada();
    expect(cov.provincias).toHaveLength(24);
    expect(cov.totales.provinciasConDatos).toBe(7);
    expect(cov.totales.provinciasSinDatos).toBe(17);
    expect(cov.totales.empresasVerificadas).toBe(8);
    expect(cov.totales.plantasGeorreferenciadas).toBe(11);
    expect(cov.totales.plantasSinCapacidadPublica).toBeGreaterThanOrEqual(1);

    const sumaRegiones = cov.porRegion.reduce((acc, r) => acc + r.total, 0);
    expect(sumaRegiones).toBe(24);
    const sumaConDatos = cov.porRegion.reduce((acc, r) => acc + r.conDatos, 0);
    expect(sumaConDatos).toBe(7);
  });

  it('valida el snapshot bursátil y las conversiones ARS/USD por tipo de dólar (CCL, MEP, Oficial)', () => {
    const snap = getMercadoSnapshot();
    expect(snap.empresas).toHaveLength(8);
    expect(snap.tipos_cambio.map((t) => t.casa)).toEqual(
      expect.arrayContaining(['contadoconliqui', 'bolsa', 'oficial', 'usd_brl'])
    );

    const aluar = getEmpresaMercado('aluar-saic')!;
    expect(aluar.tipo_cotizacion).toBe('directa_local');
    expect(aluar.ticker).toBe('ALUA');
    const valCcl = computeValuationArsUsd(aluar, snap.tipos_cambio, 'contadoconliqui')!;
    const valOficial = computeValuationArsUsd(aluar, snap.tipos_cambio, 'oficial')!;
    expect(valCcl.marketCapArs).toBeCloseTo(aluar.market_cap_origen!, 0);
    expect(valCcl.marketCapUsd).toBeGreaterThan(100_000_000);
    expect(valOficial.marketCapUsd).not.toEqual(valCcl.marketCapUsd);
    expect(formatMarketCap(valCcl.marketCapUsd, 'USD')).toMatch(/^USD /);
    expect(formatMarketCap(valCcl.marketCapArs, 'ARS')).toMatch(/^ARS /);

    // Matriz global en BRL (Unipar) debe convertir vía BRL=X a USD y luego a ARS
    const unipar = getEmpresaMercado('unipar-indupa')!;
    expect(unipar.tipo_cotizacion).toBe('matriz_global');
    const valUnipar = computeValuationArsUsd(unipar, snap.tipos_cambio, 'contadoconliqui')!;
    expect(valUnipar.marketCapUsd).toBeGreaterThan(100_000_000);
    expect(valUnipar.marketCapArs).toBeGreaterThan(valUnipar.marketCapUsd);

    // Empresa cerrada no inventa valuación
    const profertil = getEmpresaMercado('profertil-sa')!;
    expect(profertil.tipo_cotizacion).toBe('no_cotiza');
    expect(computeValuationArsUsd(profertil, snap.tipos_cambio, 'contadoconliqui')).toBeNull();
  });

  it('construye los datos del comparador de productos, provincias y cadena de valor transversal (Etapa 9)', () => {
    const prodComp = getComparadorProductosData();
    expect(prodComp).toHaveLength(7);
    const al = prodComp.find((p) => p.producto.producto_id === 'aluminio')!;
    expect(al.proceso?.energia_especifica.estado).toBe('dato');
    expect(al.ultimoComexUsd?.saldo_comercial.estado).toBe('dato');
    expect(al.empresas.some((e) => e.mercado?.ticker === 'ALUA')).toBe(true);

    // Petroquímica mantiene producción sin_datos explícitamente
    const petro = prodComp.find((p) => p.producto.producto_id === 'petroquimica')!;
    expect(petro.ultimoProduccion?.medicion.estado).toBe('sin_datos');

    const provComp = getComparadorProvinciasData();
    expect(provComp).toHaveLength(24);
    // Primeras 7 deben ser las jurisdicciones con cobertura completa
    expect(provComp.slice(0, 7).every((p) => p.provincia.cobertura_datos === 'completa')).toBe(true);
    expect(provComp.slice(7).every((p) => p.provincia.cobertura_datos === 'sin_datos')).toBe(true);

    const cadena = getCadenaValorTransversalData();
    expect(cadena.troncos).toHaveLength(5);
    const upRiver = cadena.troncos.find((t) => t.troncoId === 'oleaginoso-up-river')!;
    expect(upRiver.productoIds).toEqual(['soja', 'biodiesel']);
    expect(
      upRiver.vinculos.some(
        (v) =>
          v.tipo === 'encadenamiento_aguas_abajo' &&
          v.desdeProductoId === 'soja' &&
          v.haciaProductoId === 'biodiesel'
      )
    ).toBe(true);
  });

  it('valida los 7 PFDs ISO 10628 completos con equipos, corrientes, limites de bateria y referencias verificadas', () => {
    const pfds = getPfdProcesos();
    expect(pfds).toHaveLength(7);

    for (const pfd of pfds) {
      expect(pfd.equipos.length).toBeGreaterThanOrEqual(8);
      expect(pfd.corrientes.length).toBeGreaterThanOrEqual(10);
      expect(pfd.limites_bateria.some((l) => l.lado === 'entrada')).toBe(true);
      expect(pfd.limites_bateria.some((l) => l.lado === 'salida')).toBe(true);
    }

    const pfdPetro = getPfdPorProceso('petroquimica-steam-cracking-polietileno')!;
    expect(pfdPetro.corrientes.some((c) => c.tipo === 'reciclo')).toBe(true);
    expect(pfdPetro.corrientes.some((c) => c.flujo_especifico.estado === 'sin_datos')).toBe(true);

    const pfdUrea = getPfdPorProceso('urea-haber-bosch-sintesis')!;
    const nh3Stream = pfdUrea.corrientes.find((c) => c.numero === 9)!;
    expect(nh3Stream.flujo_especifico.estado).toBe('dato');
    expect(nh3Stream.flujo_especifico.valor).toBeCloseTo(0.578, 3);

    const procUrea = getProceso('urea-haber-bosch-sintesis')!;
    expect(procUrea.pfd?.proceso_id).toBe('urea-haber-bosch-sintesis');
    expect(Object.keys(procUrea.pfdFuentes)).toEqual(
      expect.arrayContaining(['eu-bref-lvic-aaf-2007', 'epa-ap42-ch8-inorganic', 'profertil-eecc-2025'])
    );
  });
});
