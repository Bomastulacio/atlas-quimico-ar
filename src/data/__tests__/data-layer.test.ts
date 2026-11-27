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
  getFichaEmpresa,
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

  it('carga las 24 jurisdicciones oficiales Georef (23 provincias + CABA) con cobertura completa 24/24', () => {
    const provincias = getProvincias();
    expect(provincias).toHaveLength(24);
    for (const p of provincias) {
      expect(p.cobertura_datos).toBe('completa');
    }
    expect(getProvincia('94')?.iso_3166_2).toBe('AR-V');
    expect(getProvincia('02')?.iso_3166_2).toBe('AR-C');
  });

  it('resuelve producto dominante y secundarios por provincia', () => {
    const buenosAires = getProductosPorProvincia('06');
    expect(buenosAires.dominante?.producto_id).toBe('urea');
    expect(buenosAires.secundarios.map((p) => p.producto_id)).toContain('petroquimica');
    expect(buenosAires.secundarios.map((p) => p.producto_id)).toContain('galvanizado-caliente');

    const santaFe = getProductosPorProvincia('82');
    expect(santaFe.dominante?.producto_id).toBe('soja');
    expect(santaFe.secundarios.map((p) => p.producto_id)).toContain('biodiesel');
  });

  it('valida las 24 cadenas completas con procesos, pasos y comercio exterior verificados', () => {
    const expectedIds = [
      'aluminio',
      'litio',
      'urea',
      'algodon',
      'soja',
      'petroquimica',
      'biodiesel',
      'metanol',
      'polipropileno',
      'bioetanol-maiz',
      'bioetanol-cana',
      'soda-solvay',
      'cal-industrial',
      'oro-plata',
      'celulosa-kraft',
      'glp-gas-natural',
      'sal-industrial',
      'cemento-clinker',
      'citricos-limoneno',
      'resina-colofonia',
      'tanino-quebracho',
      'aceite-oliva',
      'farmoquimica-ifa',
      'galvanizado-caliente',
    ];
    expect(getProductos()).toHaveLength(24);

    for (const id of expectedIds) {
      const ficha = getFichaProducto(id);
      expect(ficha).toBeDefined();
      expect(ficha?.producto.estado_mvp).toBe('validado');
      expect(ficha?.procesos.length).toBeGreaterThanOrEqual(1);
      expect(ficha?.procesos[0].pasos.length).toBeGreaterThanOrEqual(5);
      expect(ficha?.plantas.length).toBeGreaterThanOrEqual(1);
      expect(ficha?.comercioExterior.length).toBeGreaterThanOrEqual(3);
    }

    expect(getFichaProducto('litio')?.procesos.map((p) => p.proceso.proceso_id)).toEqual([
      'litio-salmuera-carbonatacion',
      'litio-dle-adsorcion',
    ]);
    expect(getFichaProducto('petroquimica')?.procesos.map((p) => p.proceso.proceso_id)).toEqual([
      'petroquimica-steam-cracking-polietileno',
      'petroquimica-cloro-alcali-pvc',
      'petroquimica-reformado-btx-ensenada',
    ]);

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
    expect(resumen.porNivel.completa).toBe(24);
    expect(resumen.porNivel.sin_datos).toBe(0);
    expect(resumen.departamentosConDatos).toBe(36);
    expect(getDepartamentos()).toHaveLength(36);
  });

  it('alinea 1:1 los 24 códigos Georef del GeoJSON IGN con las provincias y las 35 plantas', () => {
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
    expect(totalPlantas).toBe(35);
  });

  it('alinea 1:1 los 36 departamentos confiables con el GeoJSON oficial IGN y el índice de búsqueda', () => {
    const deptGeo = getGeoDepartamentos();
    const deptData = getMapaDepartamentosData();
    const manifestGeo = getGeoManifest();

    expect(deptGeo.features).toHaveLength(36);
    expect(deptData).toHaveLength(36);
    expect(manifestGeo.departamentos_oficial?.hash_raw).toMatch(/^sha256:[a-f0-9]{64}$/);

    const geoDeptIds = new Set(deptGeo.features.map((f) => f.properties.id));
    for (const item of deptData) {
      expect(item.departamento.tiene_datos_confiables).toBe(true);
      expect(geoDeptIds.has(item.departamento.departamento_id)).toBe(true);
      expect(item.productos.length).toBeGreaterThanOrEqual(1);
    }

    const searchDeptItems = getSearchIndex().filter((i) => i.kind === 'departamento');
    expect(searchDeptItems).toHaveLength(36);
  });

  it('expone el directorio verificable de empresas con plantas, productos y trazabilidad (Etapa 8)', () => {
    const empresas = getEmpresasConPlantas();
    expect(empresas).toHaveLength(29);
    for (const item of empresas) {
      expect(item.plantas.length).toBeGreaterThanOrEqual(1);
      expect(item.productos.length).toBeGreaterThanOrEqual(1);
      expect(item.provincias.length).toBeGreaterThanOrEqual(1);
      expect(item.empresa.procedencia.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(item.empresa.procedencia.cita_ubicacion.length).toBeGreaterThan(5);
    }

    const searchEmpItems = getSearchIndex().filter((i) => i.kind === 'empresa');
    expect(searchEmpItems).toHaveLength(29);
  });

  it('consolida el indicador de cobertura territorial por región y las 24 jurisdicciones (Etapa 8)', () => {
    const cov = getCoberturaDetallada();
    expect(cov.provincias).toHaveLength(24);
    expect(cov.totales.provinciasConDatos).toBe(24);
    expect(cov.totales.provinciasSinDatos).toBe(0);
    expect(cov.totales.empresasVerificadas).toBe(29);
    expect(cov.totales.plantasGeorreferenciadas).toBe(35);
    expect(cov.totales.plantasSinCapacidadPublica).toBeGreaterThanOrEqual(1);

    const sumaRegiones = cov.porRegion.reduce((acc, r) => acc + r.total, 0);
    expect(sumaRegiones).toBe(24);
    const sumaConDatos = cov.porRegion.reduce((acc, r) => acc + r.conDatos, 0);
    expect(sumaConDatos).toBe(24);
  });

  it('valida el snapshot bursátil y las conversiones ARS/USD por tipo de dólar (CCL, MEP, Oficial)', () => {
    const snap = getMercadoSnapshot();
    expect(snap.empresas).toHaveLength(9);
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
    expect(prodComp).toHaveLength(24);
    const al = prodComp.find((p) => p.producto.producto_id === 'aluminio')!;
    expect(al.proceso?.energia_especifica.estado).toBe('dato');
    expect(al.ultimoComexUsd?.saldo_comercial.estado).toBe('dato');
    expect(al.empresas.some((e) => e.mercado?.ticker === 'ALUA')).toBe(true);

    // Petroquímica mantiene producción sin_datos explícitamente
    const petro = prodComp.find((p) => p.producto.producto_id === 'petroquimica')!;
    expect(petro.ultimoProduccion?.medicion.estado).toBe('sin_datos');

    const provComp = getComparadorProvinciasData();
    expect(provComp).toHaveLength(24);
    // Todas las 24 jurisdicciones cuentan con cobertura completa verificada
    expect(provComp.every((p) => p.provincia.cobertura_datos === 'completa')).toBe(true);

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

  it('valida los 27 PFDs ISO 10628 completos y rutas territoriales diferenciadas por provincia/depto', () => {
    const pfds = getPfdProcesos();
    expect(pfds).toHaveLength(27);

    for (const pfd of pfds) {
      expect(pfd.equipos.length).toBeGreaterThanOrEqual(7);
      expect(pfd.corrientes.length).toBeGreaterThanOrEqual(9);
      expect(pfd.limites_bateria.some((l) => l.lado === 'entrada')).toBe(true);
      expect(pfd.limites_bateria.some((l) => l.lado === 'salida')).toBe(true);
    }

    const provincias = getMapaProvinciasData();
    const jujuy = provincias.find((p) => p.provincia.provincia_id === '38')!;
    const catamarca = provincias.find((p) => p.provincia.provincia_id === '10')!;
    const buenosAires = provincias.find((p) => p.provincia.provincia_id === '06')!;
    expect(jujuy.rutasPorProducto.litio.map((r) => r.procesoId)).toEqual(['litio-salmuera-carbonatacion']);
    expect(catamarca.rutasPorProducto.litio.map((r) => r.procesoId)).toEqual(['litio-dle-adsorcion']);
    expect(buenosAires.rutasPorProducto.petroquimica.map((r) => r.procesoId)).toEqual(
      expect.arrayContaining([
        'petroquimica-steam-cracking-polietileno',
        'petroquimica-cloro-alcali-pvc',
        'petroquimica-reformado-btx-ensenada',
      ])
    );

    const deptos = getMapaDepartamentosData();
    const susques = deptos.find((d) => d.departamento.departamento_id === '38084')!;
    const antofagasta = deptos.find((d) => d.departamento.departamento_id === '10028')!;
    const ensenada = deptos.find((d) => d.departamento.departamento_id === '06245')!;
    const bahiaBlanca = deptos.find((d) => d.departamento.departamento_id === '06056')!;
    expect(susques.rutasPorProducto.litio[0].procesoId).toBe('litio-salmuera-carbonatacion');
    expect(antofagasta.rutasPorProducto.litio[0].procesoId).toBe('litio-dle-adsorcion');
    // Independencia territorial por localidad vía unidades_planta (Ensenada BTX ≠ Bahía Blanca PE/PVC)
    expect(ensenada.rutasPorProducto.petroquimica.map((r) => r.procesoId)).toEqual([
      'petroquimica-reformado-btx-ensenada',
    ]);
    expect(bahiaBlanca.rutasPorProducto.petroquimica.map((r) => r.procesoId)).toEqual([
      'petroquimica-steam-cracking-polietileno',
      'petroquimica-cloro-alcali-pvc',
    ]);

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

  it('resuelve la ficha nacional multiprovincial de YPF S.A. con CUIT y unidades_planta (Etapa 11)', () => {
    const ypf = getFichaEmpresa('ypf-sa')!;
    expect(ypf).toBeDefined();
    expect(ypf.empresa.cuit).toBe('30-54668997-9');
    expect(ypf.provincias.map((p) => p.provincia_id).sort()).toEqual(['06', '50', '58']);
    expect(ypf.plantas).toHaveLength(3);
    expect(ypf.unidadesCount).toBe(8);
    expect(ypf.complejosPorProvincia).toHaveLength(3);
    expect(ypf.mercado?.ticker).toBe('YPF');
    expect(ypf.fuentesCitadas.some((f) => f.fuente_id === 'ypf-sec-20f-2025')).toBe(true);
  });

  it('valida 26 CUITs verificados con módulo 11, trazabilidad BCRA y 3 sin_datos legales', () => {
    const empresas = getEmpresasConPlantas().map((e) => e.empresa);
    const conCuit = empresas.filter((e) => e.cuit !== null);
    const sinCuit = empresas.filter((e) => e.cuit === null).map((e) => e.empresa_id).sort();

    expect(conCuit).toHaveLength(26);
    expect(sinCuit).toEqual([
      'grupo-san-francisco-sa',
      'polo-citricola-concordia',
      'rio-tinto-litio-ar',
    ]);

    const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    for (const emp of conCuit) {
      expect(emp.cuit).toMatch(/^\d{2}-\d{8}-\d$/);
      const digits = emp.cuit!.replaceAll('-', '').split('').map(Number);
      const sum = weights.reduce((acc, w, idx) => acc + digits[idx] * w, 0);
      const rem = 11 - (sum % 11);
      const checkDigit = rem === 11 ? 0 : rem === 10 ? 9 : rem;
      expect(digits[10]).toBe(checkDigit);
    }

    const druetta = getFichaEmpresa('druetta-hnos-sa')!;
    expect(druetta.empresa.cuit).toBe('30-65543889-7');
    expect(druetta.fuentesCitadas.some((f) => f.fuente_id === 'bcra-cuit-druetta-hnos-sa')).toBe(true);

    expect(getFichaEmpresa('molinos-agro-sa')?.empresa.cuit).toBe('30-71511877-3');
    expect(getFichaEmpresa('dow-pbbpolisur')?.empresa.cuit).toBe('30-56025419-5');
  });
});
