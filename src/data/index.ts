/**
 * Capa única de acceso a datos del Atlas Químico y Productivo de Argentina.
 *
 * REGLA ARQUITECTÓNICA:
 * - Ningún componente o página lee Google Sheets ni importa JSONs de `data/` directamente.
 * - Toda lectura pasa por estas funciones tipadas.
 * - Migrar a Supabase / PostgreSQL implica reemplazar únicamente el proveedor interno
 *   de este módulo sin tocar componentes ni páginas.
 */
import manifestRaw from '@data/manifest.json';
import fuentesRaw from '@data/fuentes.json';
import provinciasRaw from '@data/provincias.json';
import departamentosRaw from '@data/departamentos.json';
import productosRaw from '@data/productos.json';
import productosZonasRaw from '@data/productos_zonas.json';
import procesosRaw from '@data/procesos.json';
import pasosProcesoRaw from '@data/pasos_proceso.json';
import conexionesProcesoRaw from '@data/conexiones_proceso.json';
import empresasRaw from '@data/empresas.json';
import plantasRaw from '@data/plantas.json';
import produccionRaw from '@data/produccion.json';
import comercioExteriorRaw from '@data/comercio_exterior.json';
import mercadoRaw from '@data/mercado.json';

import {
  AtlasDatasetSchema,
  MercadoSnapshotSchema,
  type AtlasDataset,
  type CoberturaDatos,
  type ComercioExteriorRegistro,
  type ConexionProceso,
  type DatasetManifest,
  type Departamento,
  type Empresa,
  type EmpresaMercado,
  type Fuente,
  type MercadoSnapshot,
  type PasoProceso,
  type Planta,
  type Proceso,
  type ProduccionRegistro,
  type Producto,
  type ProductoZona,
  type Provincia,
} from '@/schemas';

let cachedDataset: AtlasDataset | null = null;
let cachedMercado: MercadoSnapshot | null = null;

export function getMercadoSnapshot(): MercadoSnapshot {
  if (cachedMercado) return cachedMercado;
  cachedMercado = MercadoSnapshotSchema.parse(mercadoRaw);
  return cachedMercado;
}

export function getEmpresaMercado(empresaId: string): EmpresaMercado | undefined {
  return getMercadoSnapshot().empresas.find((e) => e.empresa_id === empresaId);
}

function loadDataset(): AtlasDataset {
  if (cachedDataset) return cachedDataset;
  cachedDataset = AtlasDatasetSchema.parse({
    manifest: manifestRaw,
    fuentes: fuentesRaw,
    provincias: provinciasRaw,
    departamentos: departamentosRaw,
    productos: productosRaw,
    productos_zonas: productosZonasRaw,
    procesos: procesosRaw,
    pasos_proceso: pasosProcesoRaw,
    conexiones_proceso: conexionesProcesoRaw,
    empresas: empresasRaw,
    plantas: plantasRaw,
    produccion: produccionRaw,
    comercio_exterior: comercioExteriorRaw,
  });
  return cachedDataset;
}

export function getManifest(): DatasetManifest {
  return loadDataset().manifest;
}

export function isExampleDataset(): boolean {
  return loadDataset().manifest.es_ejemplo;
}

export function getFuentes(): Fuente[] {
  return loadDataset().fuentes;
}

export function getFuente(fuenteId: string): Fuente | undefined {
  return loadDataset().fuentes.find((f) => f.fuente_id === fuenteId);
}

export function getProvincias(): Provincia[] {
  return loadDataset().provincias;
}

export function getProvincia(provinciaId: string): Provincia | undefined {
  return loadDataset().provincias.find((p) => p.provincia_id === provinciaId);
}

export function getDepartamentos(provinciaId?: string): Departamento[] {
  const deptos = loadDataset().departamentos;
  return provinciaId ? deptos.filter((d) => d.provincia_id === provinciaId) : deptos;
}

export function getDepartamento(departamentoId: string): Departamento | undefined {
  return loadDataset().departamentos.find((d) => d.departamento_id === departamentoId);
}

export function getProductos(): Producto[] {
  return loadDataset().productos;
}

export function getProducto(productoId: string): Producto | undefined {
  return loadDataset().productos.find((p) => p.producto_id === productoId);
}

export interface ProductosDeProvincia {
  dominante: Producto | null;
  secundarios: Producto[];
  relaciones: ProductoZona[];
}

export function getProductosPorProvincia(provinciaId: string): ProductosDeProvincia {
  const ds = loadDataset();
  const relaciones = ds.productos_zonas.filter((r) => r.provincia_id === provinciaId);
  const byId = new Map(ds.productos.map((p) => [p.producto_id, p]));

  const dominanteRel = relaciones.find((r) => r.es_dominante) ?? relaciones[0] ?? null;
  const dominante = dominanteRel ? (byId.get(dominanteRel.producto_id) ?? null) : null;

  const vistos = new Set<string>(dominante ? [dominante.producto_id] : []);
  const secundarios: Producto[] = [];
  for (const rel of relaciones) {
    if (vistos.has(rel.producto_id)) continue;
    const prod = byId.get(rel.producto_id);
    if (prod) {
      vistos.add(prod.producto_id);
      secundarios.push(prod);
    }
  }

  return { dominante, secundarios, relaciones };
}

export function getZonasPorProducto(productoId: string): Array<ProductoZona & { provincia: Provincia }> {
  const ds = loadDataset();
  const provMap = new Map(ds.provincias.map((p) => [p.provincia_id, p]));
  return ds.productos_zonas
    .filter((r) => r.producto_id === productoId)
    .flatMap((r) => {
      const provincia = provMap.get(r.provincia_id);
      return provincia ? [{ ...r, provincia }] : [];
    });
}

export interface ProcesoCompleto {
  proceso: Proceso;
  pasos: PasoProceso[];
  conexiones: ConexionProceso[];
}

export function getProcesos(productoId?: string): Proceso[] {
  const procesos = loadDataset().procesos;
  return productoId ? procesos.filter((p) => p.producto_id === productoId) : procesos;
}

export function getProceso(procesoId: string): ProcesoCompleto | undefined {
  const ds = loadDataset();
  const proceso = ds.procesos.find((p) => p.proceso_id === procesoId);
  if (!proceso) return undefined;

  const pasos = ds.pasos_proceso
    .filter((s) => s.proceso_id === procesoId)
    .sort((a, b) => a.orden - b.orden);
  const conexiones = ds.conexiones_proceso.filter((c) => c.proceso_id === procesoId);

  return { proceso, pasos, conexiones };
}

export function getEmpresas(): Empresa[] {
  return loadDataset().empresas;
}

export function getEmpresa(empresaId: string): Empresa | undefined {
  return loadDataset().empresas.find((e) => e.empresa_id === empresaId);
}

export function getPlantas(filtros?: {
  productoId?: string;
  provinciaId?: string;
  empresaId?: string;
}): Planta[] {
  let plantas = loadDataset().plantas;
  if (filtros?.productoId) {
    plantas = plantas.filter((p) => p.producto_id === filtros.productoId);
  }
  if (filtros?.provinciaId) {
    plantas = plantas.filter((p) => p.provincia_id === filtros.provinciaId);
  }
  if (filtros?.empresaId) {
    plantas = plantas.filter((p) => p.empresa_id === filtros.empresaId);
  }
  return plantas;
}

export function getProduccion(productoId: string, provinciaId?: string | null): ProduccionRegistro[] {
  return loadDataset()
    .produccion.filter((r) => {
      if (r.producto_id !== productoId) return false;
      if (provinciaId === undefined) return true;
      return r.provincia_id === provinciaId;
    })
    .sort((a, b) => b.anio - a.anio);
}

export function getComercioExterior(productoId: string): ComercioExteriorRegistro[] {
  return loadDataset()
    .comercio_exterior.filter((r) => r.producto_id === productoId)
    .sort((a, b) => b.anio - a.anio);
}

export interface ResumenCobertura {
  totalProvincias: number;
  porNivel: Record<CoberturaDatos, number>;
  departamentosConDatos: number;
}

export function getResumenCobertura(): ResumenCobertura {
  const ds = loadDataset();
  const porNivel: Record<CoberturaDatos, number> = {
    completa: 0,
    parcial: 0,
    baja: 0,
    sin_datos: 0,
  };
  for (const p of ds.provincias) {
    porNivel[p.cobertura_datos] += 1;
  }
  return {
    totalProvincias: ds.provincias.length,
    porNivel,
    departamentosConDatos: ds.departamentos.filter((d) => d.tiene_datos_confiables).length,
  };
}

export {
  getGeoContinental,
  getGeoAntartidaIslas,
  getGeoDepartamentos,
  getGeoManifest,
  type DepartamentoGeoProperties,
  type DepartamentosFeatureCollection,
  type GeoManifest,
  type ProvinciaGeoProperties,
  type ProvinciasFeatureCollection,
} from './geo';

export interface MapaDepartamentoResumen {
  departamento: Departamento;
  provincia: Provincia;
  productos: Producto[];
  plantas: Array<Planta & { empresaNombre: string | null }>;
}

export function getMapaDepartamentosData(): MapaDepartamentoResumen[] {
  const ds = loadDataset();
  const provMap = new Map(ds.provincias.map((p) => [p.provincia_id, p]));
  const prodMap = new Map(ds.productos.map((p) => [p.producto_id, p]));
  const empMap = new Map(ds.empresas.map((e) => [e.empresa_id, e.razon_social]));

  return ds.departamentos
    .filter((d) => d.tiene_datos_confiables)
    .flatMap((departamento) => {
      const provincia = provMap.get(departamento.provincia_id);
      if (!provincia) return [];

      const plantas = ds.plantas
        .filter((pl) => pl.departamento_id === departamento.departamento_id)
        .map((pl) => ({
          ...pl,
          empresaNombre: empMap.get(pl.empresa_id) ?? null,
        }));

      // Productos explícitamente asociados al departamento por plantas o zonas (fallback a provincia)
      const prodIds = new Set<string>([
        ...plantas.map((pl) => pl.producto_id),
        ...ds.productos_zonas
          .filter((z) => z.departamento_id === departamento.departamento_id)
          .map((z) => z.producto_id),
      ]);
      if (prodIds.size === 0) {
        for (const z of ds.productos_zonas.filter((r) => r.provincia_id === departamento.provincia_id)) {
          prodIds.add(z.producto_id);
        }
      }
      const productos = [...prodIds]
        .map((id) => prodMap.get(id))
        .filter((p): p is Producto => Boolean(p));

      return [{ departamento, provincia, productos, plantas }];
    });
}

export interface MapaProvinciaResumen {
  provincia: Provincia;
  dominante: Producto | null;
  secundarios: Producto[];
  relaciones: ProductoZona[];
  plantas: Array<Planta & { empresaNombre: string | null }>;
  departamentosConfiables: Departamento[];
}

export function getMapaProvinciasData(): MapaProvinciaResumen[] {
  const ds = loadDataset();
  const empMap = new Map(ds.empresas.map((e) => [e.empresa_id, e.razon_social]));

  return ds.provincias.map((provincia) => {
    const { dominante, secundarios, relaciones } = getProductosPorProvincia(provincia.provincia_id);
    const plantas = ds.plantas
      .filter((pl) => pl.provincia_id === provincia.provincia_id)
      .map((pl) => ({
        ...pl,
        empresaNombre: empMap.get(pl.empresa_id) ?? null,
      }));
    const departamentosConfiables = ds.departamentos.filter(
      (d) => d.provincia_id === provincia.provincia_id && d.tiene_datos_confiables
    );

    return {
      provincia,
      dominante,
      secundarios,
      relaciones,
      plantas,
      departamentosConfiables,
    };
  });
}

export interface FichaProducto {
  producto: Producto;
  zonas: Array<ProductoZona & { provincia: Provincia }>;
  procesos: ProcesoCompleto[];
  plantas: Array<Planta & { empresa: Empresa | null; provincia: Provincia | null }>;
  produccion: ProduccionRegistro[];
  comercioExterior: ComercioExteriorRegistro[];
}

export function getFichaProducto(productoId: string): FichaProducto | undefined {
  const producto = getProducto(productoId);
  if (!producto) return undefined;

  const ds = loadDataset();
  const empMap = new Map(ds.empresas.map((e) => [e.empresa_id, e]));
  const provMap = new Map(ds.provincias.map((p) => [p.provincia_id, p]));

  const procesos = getProcesos(productoId)
    .map((p) => getProceso(p.proceso_id))
    .filter((p): p is ProcesoCompleto => p !== undefined);

  const plantas = getPlantas({ productoId }).map((pl) => ({
    ...pl,
    empresa: empMap.get(pl.empresa_id) ?? null,
    provincia: provMap.get(pl.provincia_id) ?? null,
  }));

  return {
    producto,
    zonas: getZonasPorProducto(productoId),
    procesos,
    plantas,
    produccion: getProduccion(productoId),
    comercioExterior: getComercioExterior(productoId),
  };
}

export interface SearchIndexItem {
  id: string;
  kind: 'cadena' | 'provincia' | 'departamento' | 'empresa' | 'planta' | 'proceso';
  title: string;
  subtitle: string;
  href: string;
  keywords: string;
  provinciaId?: string;
  departamentoId?: string;
  iconId?: string;
  categoria?: Producto['categoria'];
}

export function getSearchIndex(): SearchIndexItem[] {
  const ds = loadDataset();
  const provMap = new Map(ds.provincias.map((p) => [p.provincia_id, p]));
  const prodMap = new Map(ds.productos.map((p) => [p.producto_id, p]));

  const items: SearchIndexItem[] = [];

  for (const prod of ds.productos) {
    const zonas = getZonasPorProducto(prod.producto_id);
    const provNames = Array.from(new Set(zonas.map((z) => z.provincia.nombre)));
    items.push({
      id: `cadena-${prod.producto_id}`,
      kind: 'cadena',
      title: prod.nombre,
      subtitle: `${prod.formula_quimica ? `${prod.formula_quimica} · ` : ''}${provNames.join(', ') || 'Argentina'}`,
      href: `/productos/${prod.producto_id}`,
      keywords: `${prod.nombre} ${prod.producto_id} ${prod.formula_quimica ?? ''} ${prod.descripcion_corta} ${provNames.join(' ')}`,
      iconId: prod.icono_id,
      categoria: prod.categoria,
    });
  }

  for (const proc of ds.procesos) {
    const prod = prodMap.get(proc.producto_id);
    items.push({
      id: `proceso-${proc.proceso_id}`,
      kind: 'proceso',
      title: proc.nombre,
      subtitle: `${prod?.nombre ?? proc.producto_id}${proc.reaccion_global ? ` · ${proc.reaccion_global}` : ''}`,
      href: `/productos/${proc.producto_id}#diagrama`,
      keywords: `${proc.nombre} ${proc.ruta_tecnologica} ${proc.reaccion_global ?? ''} ${prod?.nombre ?? ''}`,
      iconId: prod?.icono_id,
      categoria: prod?.categoria,
    });
  }

  for (const emp of ds.empresas) {
    const empPlantas = ds.plantas.filter((pl) => pl.empresa_id === emp.empresa_id);
    const empProvs = Array.from(
      new Set(
        empPlantas
          .map((pl) => provMap.get(pl.provincia_id)?.nombre)
          .filter((n): n is string => Boolean(n))
      )
    );
    const empProds = Array.from(
      new Set(
        empPlantas
          .map((pl) => prodMap.get(pl.producto_id)?.nombre)
          .filter((n): n is string => Boolean(n))
      )
    );
    items.push({
      id: `empresa-${emp.empresa_id}`,
      kind: 'empresa',
      title: emp.razon_social,
      subtitle: `Capital ${emp.tipo_capital} · ${empProvs.join(', ') || 'Argentina'}`,
      href: `/empresas#${emp.empresa_id}`,
      keywords: `${emp.razon_social} ${emp.tipo_capital} ${emp.hechos_verificables} ${empProvs.join(' ')} ${empProds.join(' ')}`,
    });
  }

  for (const pl of ds.plantas) {
    const prov = provMap.get(pl.provincia_id);
    const prod = prodMap.get(pl.producto_id);
    items.push({
      id: `planta-${pl.planta_id}`,
      kind: 'planta',
      title: pl.nombre,
      subtitle: `${pl.localidad}, ${prov?.nombre ?? pl.provincia_id} · ${prod?.nombre ?? pl.producto_id}`,
      href: `/productos/${pl.producto_id}#empresas`,
      keywords: `${pl.nombre} ${pl.localidad} ${prov?.nombre ?? ''} ${prod?.nombre ?? ''}`,
      iconId: prod?.icono_id,
      categoria: prod?.categoria,
    });
  }

  for (const prov of ds.provincias) {
    const { dominante, secundarios } = getProductosPorProvincia(prov.provincia_id);
    const cadenas = dominante ? [dominante, ...secundarios].map((p) => p.nombre).join(', ') : 'Sin datos cargados';
    items.push({
      id: `prov-${prov.provincia_id}`,
      kind: 'provincia',
      title: prov.nombre,
      subtitle: `${prov.region} · ${cadenas}`,
      href: `/?provincia=${prov.provincia_id}#mapa`,
      keywords: `${prov.nombre} ${prov.region} ${prov.iso_3166_2} ${cadenas}`,
      provinciaId: prov.provincia_id,
    });
  }

  for (const deptItem of getMapaDepartamentosData()) {
    const { departamento, provincia, productos } = deptItem;
    const cadenas = productos.map((p) => p.nombre).join(', ');
    items.push({
      id: `dept-${departamento.departamento_id}`,
      kind: 'departamento',
      title: `${departamento.nombre} (${provincia.nombre})`,
      subtitle: `${departamento.tipo_zona.replace('_', ' ')} · ${cadenas || 'Con datos verificados'}`,
      href: `/?provincia=${provincia.provincia_id}&departamento=${departamento.departamento_id}#mapa`,
      keywords: `${departamento.nombre} ${provincia.nombre} ${departamento.departamento_id} ${departamento.nota_cobertura ?? ''} ${cadenas}`,
      provinciaId: provincia.provincia_id,
      departamentoId: departamento.departamento_id,
    });
  }

  return items;
}

export interface ChainCardSummary {
  producto: Producto;
  jurisdicciones: string;
  plantasCount: number;
  pasosCount: number;
  reaccionGlobal: string | null;
  metricaLabel: string;
  metricaValor: string;
}

export function getChainCardSummaries(): ChainCardSummary[] {
  return getProductos().map((producto) => {
    const ficha = getFichaProducto(producto.producto_id);
    const provNames = Array.from(new Set((ficha?.zonas ?? []).map((z) => z.provincia.nombre)));
    const proc = ficha?.procesos[0];

    const latestProd = ficha?.produccion.find((r) => r.medicion.estado === 'dato');
    const latestComexUsd = ficha?.comercioExterior.find(
      (c) => c.metrica === 'valor_usd' && c.exportacion.estado === 'dato'
    );

    let metricaLabel = 'Producción registrada';
    let metricaValor = 'Sin datos';

    if (latestProd && latestProd.medicion.estado === 'dato') {
      metricaLabel = `Producción (${latestProd.anio})`;
      const v = latestProd.medicion.valor;
      metricaValor =
        v >= 1_000_000
          ? `${(v / 1_000_000).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Mt`
          : `${Math.round(v).toLocaleString('es-AR')} t`;
    } else if (latestComexUsd && latestComexUsd.saldo_comercial.estado === 'dato') {
      metricaLabel = `Saldo comercial (${latestComexUsd.anio})`;
      const s = latestComexUsd.saldo_comercial.valor;
      metricaValor = `${s >= 0 ? '+' : ''}USD ${s.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`;
    }

    return {
      producto,
      jurisdicciones: provNames.join(', ') || 'Argentina',
      plantasCount: ficha?.plantas.length ?? 0,
      pasosCount: proc?.pasos.length ?? 0,
      reaccionGlobal: proc?.proceso.reaccion_global ?? null,
      metricaLabel,
      metricaValor,
    };
  });
}

export interface PlantaConContexto extends Planta {
  provincia: Provincia;
  departamento: Departamento | null;
  producto: Producto;
}

export interface EmpresaConPlantas {
  empresa: Empresa;
  plantas: PlantaConContexto[];
  productos: Producto[];
  provincias: Provincia[];
  mercado: EmpresaMercado | null;
}

export function getEmpresasConPlantas(): EmpresaConPlantas[] {
  const ds = loadDataset();
  const mercadoMap = new Map(getMercadoSnapshot().empresas.map((m) => [m.empresa_id, m]));
  const provMap = new Map(ds.provincias.map((p) => [p.provincia_id, p]));
  const deptMap = new Map(ds.departamentos.map((d) => [d.departamento_id, d]));
  const prodMap = new Map(ds.productos.map((p) => [p.producto_id, p]));

  return [...ds.empresas]
    .sort((a, b) => a.razon_social.localeCompare(b.razon_social, 'es'))
    .map((empresa) => {
      const plantas = ds.plantas
        .filter((pl) => pl.empresa_id === empresa.empresa_id)
        .flatMap((pl) => {
          const provincia = provMap.get(pl.provincia_id);
          const producto = prodMap.get(pl.producto_id);
          if (!provincia || !producto) return [];
          const departamento = pl.departamento_id ? (deptMap.get(pl.departamento_id) ?? null) : null;
          return [{ ...pl, provincia, departamento, producto }];
        });

      const prodSeen = new Set<string>();
      const productos: Producto[] = [];
      const provSeen = new Set<string>();
      const provincias: Provincia[] = [];

      for (const pl of plantas) {
        if (!prodSeen.has(pl.producto.producto_id)) {
          prodSeen.add(pl.producto.producto_id);
          productos.push(pl.producto);
        }
        if (!provSeen.has(pl.provincia.provincia_id)) {
          provSeen.add(pl.provincia.provincia_id);
          provincias.push(pl.provincia);
        }
      }

      return {
        empresa,
        plantas,
        productos,
        provincias,
        mercado: mercadoMap.get(empresa.empresa_id) ?? null,
      };
    });
}

export interface ProvinciaCoberturaItem {
  provincia: Provincia;
  cadenas: Producto[];
  departamentosConfiables: Departamento[];
  plantasCount: number;
  ultimoAnioDato: number | null;
}

export interface RegionCoberturaResumen {
  region: Provincia['region'];
  total: number;
  conDatos: number;
  sinDatos: number;
  porcentaje: number;
  provinciasConDatos: string[];
}

export interface CoberturaDetallada {
  resumen: ResumenCobertura;
  totales: {
    totalProvincias: number;
    provinciasConDatos: number;
    provinciasSinDatos: number;
    departamentosConDatos: number;
    cadenasVerificadas: number;
    empresasVerificadas: number;
    plantasGeorreferenciadas: number;
    plantasSinCapacidadPublica: number;
    fuentesVerificadas: number;
    seriesProduccionSinDatos: number;
    seriesComexParciales: number;
  };
  porRegion: RegionCoberturaResumen[];
  provincias: ProvinciaCoberturaItem[];
}

const REGION_ORDER: Provincia['region'][] = [
  'NOA',
  'NEA',
  'Centro',
  'Pampeana',
  'Cuyo',
  'Patagonia',
];

export function getCoberturaDetallada(): CoberturaDetallada {
  const ds = loadDataset();
  const resumen = getResumenCobertura();

  const provincias: ProvinciaCoberturaItem[] = [...ds.provincias]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .map((provincia) => {
      const { dominante, secundarios, relaciones } = getProductosPorProvincia(provincia.provincia_id);
      const cadenas = dominante ? [dominante, ...secundarios] : [];
      const departamentosConfiables = ds.departamentos.filter(
        (d) => d.provincia_id === provincia.provincia_id && d.tiene_datos_confiables
      );
      const plantasProv = ds.plantas.filter((pl) => pl.provincia_id === provincia.provincia_id);
      const anios = [
        ...relaciones.map((r) => r.procedencia.anio),
        ...plantasProv.map((pl) => pl.procedencia.anio),
      ];
      const ultimoAnioDato = anios.length > 0 ? Math.max(...anios) : null;

      return {
        provincia,
        cadenas,
        departamentosConfiables,
        plantasCount: plantasProv.length,
        ultimoAnioDato,
      };
    });

  const porRegion: RegionCoberturaResumen[] = REGION_ORDER.map((region) => {
    const items = provincias.filter((p) => p.provincia.region === region);
    const conDatosItems = items.filter((p) => p.provincia.cobertura_datos !== 'sin_datos');
    const total = items.length;
    const conDatos = conDatosItems.length;
    return {
      region,
      total,
      conDatos,
      sinDatos: total - conDatos,
      porcentaje: total > 0 ? Math.round((conDatos / total) * 100) : 0,
      provinciasConDatos: conDatosItems.map((p) => p.provincia.nombre),
    };
  });

  const provinciasConDatos = provincias.filter(
    (p) => p.provincia.cobertura_datos !== 'sin_datos'
  ).length;
  const plantasSinCapacidadPublica = ds.plantas.filter(
    (pl) => pl.capacidad.estado === 'sin_datos'
  ).length;
  const seriesProduccionSinDatos = ds.produccion.filter(
    (r) => r.medicion.estado === 'sin_datos'
  ).length;
  const seriesComexParciales = ds.comercio_exterior.filter(
    (c) =>
      c.exportacion.estado === 'sin_datos' ||
      c.importacion.estado === 'sin_datos' ||
      c.saldo_comercial.estado === 'sin_datos'
  ).length;

  return {
    resumen,
    totales: {
      totalProvincias: ds.provincias.length,
      provinciasConDatos,
      provinciasSinDatos: ds.provincias.length - provinciasConDatos,
      departamentosConDatos: resumen.departamentosConDatos,
      cadenasVerificadas: ds.productos.filter((p) => p.estado_mvp === 'validado').length,
      empresasVerificadas: ds.empresas.length,
      plantasGeorreferenciadas: ds.plantas.length,
      plantasSinCapacidadPublica,
      fuentesVerificadas: ds.fuentes.length,
      seriesProduccionSinDatos,
      seriesComexParciales,
    },
    porRegion,
    provincias,
  };
}
