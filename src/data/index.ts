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
import pfdProcesosRaw from '@data/pfd_procesos.json';

import {
  AtlasDatasetSchema,
  MercadoSnapshotSchema,
  PfdDatasetSchema,
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
  type PfdProceso,
  type Planta,
  type Proceso,
  type ProduccionRegistro,
  type Producto,
  type ProductoZona,
  type Provincia,
} from '@/schemas';

let cachedDataset: AtlasDataset | null = null;
let cachedMercado: MercadoSnapshot | null = null;
let cachedPfd: PfdProceso[] | null = null;

export function getPfdProcesos(): PfdProceso[] {
  if (cachedPfd) return cachedPfd;
  cachedPfd = PfdDatasetSchema.parse(pfdProcesosRaw);
  return cachedPfd;
}

export function getPfdPorProceso(procesoId: string): PfdProceso | null {
  return getPfdProcesos().find((p) => p.proceso_id === procesoId) ?? null;
}

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
  pfd: PfdProceso | null;
  pfdFuentes: Record<string, Fuente>;
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
  const pfd = getPfdPorProceso(procesoId);
  const pfdFuentes: Record<string, Fuente> = {};
  if (pfd) {
    const fMap = new Map(ds.fuentes.map((f) => [f.fuente_id, f]));
    const ids = new Set<string>([
      ...pfd.equipos.map((e) => e.fuente_id),
      ...pfd.corrientes.map((c) => c.fuente_id),
    ]);
    for (const id of ids) {
      const f = fMap.get(id);
      if (f) pfdFuentes[id] = f;
    }
  }

  return { proceso, pasos, conexiones, pfd, pfdFuentes };
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

/* ============================================================================
   ETAPA 9: COMPARADOR DE PRODUCTOS / PROVINCIAS Y CADENA DE VALOR TRANSVERSAL
   ============================================================================ */

export interface ComparadorEmpresaResumen {
  empresa_id: string;
  razon_social: string;
  tipo_capital: Empresa['tipo_capital'];
  mercado: EmpresaMercado | null;
}

export interface ComparadorProductoItem {
  producto: Producto;
  proceso: {
    proceso_id: string;
    nombre: string;
    ruta_tecnologica: string;
    reaccion_global: string | null;
    energia_especifica: Proceso['energia_especifica'];
    pasosCount: number;
    fuente: string;
    anio: number;
  } | null;
  ultimoProduccion: ProduccionRegistro | null;
  ultimoComexUsd: ComercioExteriorRegistro | null;
  provincias: Array<{ provincia_id: string; nombre: string; region: Provincia['region'] }>;
  departamentos: Array<{
    departamento_id: string;
    provincia_id: string;
    nombre: string;
    provinciaNombre: string;
  }>;
  plantasCount: number;
  plantasConCapacidad: number;
  plantasDetalle: Array<{
    planta_id: string;
    nombre: string;
    localidad: string;
    provinciaNombre: string;
    empresaNombre: string;
    capacidad: Planta['capacidad'];
  }>;
  empresas: ComparadorEmpresaResumen[];
}

export function getComparadorProductosData(): ComparadorProductoItem[] {
  const ds = loadDataset();
  const mercadoMap = new Map(getMercadoSnapshot().empresas.map((m) => [m.empresa_id, m]));
  const deptMap = new Map(ds.departamentos.map((d) => [d.departamento_id, d]));
  const provMap = new Map(ds.provincias.map((p) => [p.provincia_id, p]));

  return ds.productos.map((producto) => {
    const ficha = getFichaProducto(producto.producto_id)!;
    const procCompleto = ficha.procesos[0] ?? null;

    // Prioriza el año más reciente con dato verificado; si todos son sin_datos, devuelve el más reciente explícito
    const ultimoProduccion =
      ficha.produccion.find((r) => r.medicion.estado === 'dato') ?? ficha.produccion[0] ?? null;

    const comexUsdList = ficha.comercioExterior.filter((c) => c.metrica === 'valor_usd');
    const ultimoComexUsd =
      comexUsdList.find(
        (c) =>
          c.saldo_comercial.estado === 'dato' ||
          c.exportacion.estado === 'dato' ||
          c.importacion.estado === 'dato'
      ) ??
      comexUsdList[0] ??
      null;

    const provSeen = new Set<string>();
    const provincias: ComparadorProductoItem['provincias'] = [];
    for (const z of ficha.zonas) {
      if (provSeen.has(z.provincia.provincia_id)) continue;
      provSeen.add(z.provincia.provincia_id);
      provincias.push({
        provincia_id: z.provincia.provincia_id,
        nombre: z.provincia.nombre,
        region: z.provincia.region,
      });
    }

    const deptSeen = new Set<string>();
    const departamentos: ComparadorProductoItem['departamentos'] = [];
    for (const pl of ficha.plantas) {
      if (!pl.departamento_id || deptSeen.has(pl.departamento_id)) continue;
      const d = deptMap.get(pl.departamento_id);
      if (!d || !d.tiene_datos_confiables) continue;
      deptSeen.add(d.departamento_id);
      departamentos.push({
        departamento_id: d.departamento_id,
        provincia_id: d.provincia_id,
        nombre: d.nombre,
        provinciaNombre: provMap.get(d.provincia_id)?.nombre ?? d.provincia_id,
      });
    }

    const empSeen = new Set<string>();
    const empresas: ComparadorEmpresaResumen[] = [];
    for (const pl of ficha.plantas) {
      if (!pl.empresa || empSeen.has(pl.empresa.empresa_id)) continue;
      empSeen.add(pl.empresa.empresa_id);
      empresas.push({
        empresa_id: pl.empresa.empresa_id,
        razon_social: pl.empresa.razon_social,
        tipo_capital: pl.empresa.tipo_capital,
        mercado: mercadoMap.get(pl.empresa.empresa_id) ?? null,
      });
    }

    const plantasDetalle = ficha.plantas.map((pl) => ({
      planta_id: pl.planta_id,
      nombre: pl.nombre,
      localidad: pl.localidad,
      provinciaNombre: pl.provincia?.nombre ?? pl.provincia_id,
      empresaNombre: pl.empresa?.razon_social ?? pl.empresa_id,
      capacidad: pl.capacidad,
    }));

    return {
      producto,
      proceso: procCompleto
        ? {
            proceso_id: procCompleto.proceso.proceso_id,
            nombre: procCompleto.proceso.nombre,
            ruta_tecnologica: procCompleto.proceso.ruta_tecnologica,
            reaccion_global: procCompleto.proceso.reaccion_global,
            energia_especifica: procCompleto.proceso.energia_especifica,
            pasosCount: procCompleto.pasos.length,
            fuente: procCompleto.proceso.procedencia.fuente,
            anio: procCompleto.proceso.procedencia.anio,
          }
        : null,
      ultimoProduccion,
      ultimoComexUsd,
      provincias,
      departamentos,
      plantasCount: ficha.plantas.length,
      plantasConCapacidad: ficha.plantas.filter((p) => p.capacidad.estado === 'dato').length,
      plantasDetalle,
      empresas,
    };
  });
}

export interface ComparadorProvinciaItem {
  provincia: Provincia;
  dominante: Producto | null;
  secundarios: Producto[];
  departamentosConfiables: Departamento[];
  plantas: Array<{
    planta_id: string;
    nombre: string;
    localidad: string;
    producto_id: string;
    productoNombre: string;
    empresaNombre: string;
    capacidad: Planta['capacidad'];
  }>;
  empresas: ComparadorEmpresaResumen[];
  ultimoAnioDato: number | null;
  fuentesCount: number;
}

export function getComparadorProvinciasData(): ComparadorProvinciaItem[] {
  const ds = loadDataset();
  const mercadoMap = new Map(getMercadoSnapshot().empresas.map((m) => [m.empresa_id, m]));
  const empMap = new Map(ds.empresas.map((e) => [e.empresa_id, e]));
  const prodMap = new Map(ds.productos.map((p) => [p.producto_id, p]));

  return [...ds.provincias]
    .sort((a, b) => {
      const aHas = a.cobertura_datos !== 'sin_datos' ? 0 : 1;
      const bHas = b.cobertura_datos !== 'sin_datos' ? 0 : 1;
      if (aHas !== bHas) return aHas - bHas;
      return a.nombre.localeCompare(b.nombre, 'es');
    })
    .map((provincia) => {
      const { dominante, secundarios, relaciones } = getProductosPorProvincia(
        provincia.provincia_id
      );
      const departamentosConfiables = ds.departamentos.filter(
        (d) => d.provincia_id === provincia.provincia_id && d.tiene_datos_confiables
      );
      const rawPlantas = ds.plantas.filter((pl) => pl.provincia_id === provincia.provincia_id);

      const empSeen = new Set<string>();
      const empresas: ComparadorEmpresaResumen[] = [];
      const fuenteIds = new Set<string>(relaciones.map((r) => r.procedencia.fuente_id));
      const anios: number[] = relaciones.map((r) => r.procedencia.anio);

      const plantas = rawPlantas.map((pl) => {
        fuenteIds.add(pl.procedencia.fuente_id);
        anios.push(pl.procedencia.anio);
        const emp = empMap.get(pl.empresa_id);
        if (emp && !empSeen.has(emp.empresa_id)) {
          empSeen.add(emp.empresa_id);
          empresas.push({
            empresa_id: emp.empresa_id,
            razon_social: emp.razon_social,
            tipo_capital: emp.tipo_capital,
            mercado: mercadoMap.get(emp.empresa_id) ?? null,
          });
        }
        return {
          planta_id: pl.planta_id,
          nombre: pl.nombre,
          localidad: pl.localidad,
          producto_id: pl.producto_id,
          productoNombre: prodMap.get(pl.producto_id)?.nombre ?? pl.producto_id,
          empresaNombre: emp?.razon_social ?? pl.empresa_id,
          capacidad: pl.capacidad,
        };
      });

      return {
        provincia,
        dominante,
        secundarios,
        departamentosConfiables,
        plantas,
        empresas,
        ultimoAnioDato: anios.length > 0 ? Math.max(...anios) : null,
        fuentesCount: fuenteIds.size,
      };
    });
}

export interface CadenaValorLink {
  id: string;
  desdeProductoId: string | null;
  desdeEtiqueta: string;
  haciaProductoId: string;
  flujoQuimico: string;
  nodoTerritorial: string;
  tipo: 'insumo_primario' | 'encadenamiento_aguas_abajo';
}

export interface TroncoCadenaValor {
  troncoId: string;
  titulo: string;
  regionClave: string;
  insumoBase: string;
  formulaInsumo: string;
  acento: 'cobalt' | 'emerald' | 'ochre' | 'red';
  resumen: string;
  productoIds: string[];
  vinculos: CadenaValorLink[];
}

export interface CadenaValorTransversalData {
  troncos: TroncoCadenaValor[];
  productos: ComparadorProductoItem[];
}

export function getCadenaValorTransversalData(): CadenaValorTransversalData {
  const productos = getComparadorProductosData();
  const validIds = new Set(productos.map((p) => p.producto.producto_id));

  const troncos: TroncoCadenaValor[] = [
    {
      troncoId: 'gas-bahia-blanca',
      titulo: 'Tronco Gas Natural · Polo Bahía Blanca',
      regionClave: 'Buenos Aires (Bahía Blanca / Ing. White)',
      insumoBase: 'Gas natural (metano y etano separado)',
      formulaInsumo: 'CH4 + C2H6',
      acento: 'cobalt',
      resumen:
        'Un mismo nodo gasífero y portuario abastece dos grandes cadenas químicas independientes: la fracción metano sintetiza amoníaco y urea; la fracción etano alimenta el craqueo con vapor para etileno, polietileno y PVC.',
      productoIds: ['urea', 'petroquimica'].filter((id) => validIds.has(id)),
      vinculos: [
        {
          id: 'gas-a-urea',
          desdeProductoId: null,
          desdeEtiqueta: 'Metano (CH4) + aire + vapor',
          haciaProductoId: 'urea',
          flujoQuimico: 'Reformado catalítico + Haber-Bosch -> NH3 + CO2 -> CO(NH2)2',
          nodoTerritorial: 'Ingeniero White, Bahía Blanca',
          tipo: 'insumo_primario',
        },
        {
          id: 'gas-a-petroquimica',
          desdeProductoId: null,
          desdeEtiqueta: 'Etano (C2H6) de gas natural',
          haciaProductoId: 'petroquimica',
          flujoQuimico: 'Steam cracking (800-850 °C) -> C2H4 + H2 -> polietilenos y PVC',
          nodoTerritorial: 'Polo Petroquímico Bahía Blanca',
          tipo: 'insumo_primario',
        },
      ],
    },
    {
      troncoId: 'oleaginoso-up-river',
      titulo: 'Tronco Oleaginoso · Corredor Up-River',
      regionClave: 'Santa Fe (San Lorenzo, Timbúes y Rosario)',
      insumoBase: 'Poroto de soja + solvente hexano y metanol',
      formulaInsumo: 'Triglicéridos + CH4O',
      acento: 'ochre',
      resumen:
        'Encadenamiento vertical directo en el mismo cordón portuario del Paraná: la molienda de soja extrae harina proteica y aceite crudo; parte de ese aceite se transesterifica aguas abajo con metanol para producir biodiésel FAME y glicerina.',
      productoIds: ['soja', 'biodiesel'].filter((id) => validIds.has(id)),
      vinculos: [
        {
          id: 'poroto-a-soja',
          desdeProductoId: null,
          desdeEtiqueta: 'Poroto de soja + hexano (reciclo cerrado)',
          haciaProductoId: 'soja',
          flujoQuimico: 'Molienda y extracción continua -> harina proteica + aceite crudo',
          nodoTerritorial: 'Timbúes y San Lorenzo (Santa Fe)',
          tipo: 'insumo_primario',
        },
        {
          id: 'soja-a-biodiesel',
          desdeProductoId: 'soja',
          desdeEtiqueta: 'Aceite crudo de soja + metanol (CH4O)',
          haciaProductoId: 'biodiesel',
          flujoQuimico: 'Transesterificación alcalina -> biodiésel FAME (B100) + glicerina',
          nodoTerritorial: 'San Lorenzo y Gran Rosario (Santa Fe)',
          tipo: 'encadenamiento_aguas_abajo',
        },
      ],
    },
    {
      troncoId: 'electrometalurgia-patagonia',
      titulo: 'Tronco Electrometalúrgico · Golfo Nuevo',
      regionClave: 'Chubut (Puerto Madryn, Biedma)',
      insumoBase: 'Alúmina importada + energía eléctrica + carbono',
      formulaInsumo: 'Al2O3 + C + electricidad',
      acento: 'cobalt',
      resumen:
        'Cadena electro-intensiva de enclave portuario: la alúmina llega por buque al Muelle Storni y se reduce en cubas Hall-Héroult con energía hidroeléctrica, térmica y eólica hacia lingotes, barrotes y alambrón.',
      productoIds: ['aluminio'].filter((id) => validIds.has(id)),
      vinculos: [
        {
          id: 'alumina-a-aluminio',
          desdeProductoId: null,
          desdeEtiqueta: 'Alúmina calcinada (Al2O3) + ánodos de C',
          haciaProductoId: 'aluminio',
          flujoQuimico: 'Reducción electrolítica a 960 °C (14,2 MWh/t Al) -> Al primario',
          nodoTerritorial: 'Puerto Madryn (Chubut)',
          tipo: 'insumo_primario',
        },
      ],
    },
    {
      troncoId: 'puna-litio',
      titulo: 'Tronco Evaporítico · Puna Argentina',
      regionClave: 'Jujuy, Catamarca y Salta',
      insumoBase: 'Salmuera de salar de altura + ceniza de soda',
      formulaInsumo: 'LiCl + Na2CO3',
      acento: 'emerald',
      resumen:
        'Salmueras ricas en litio bombeadas en salares de la Puna (Olaroz, Fénix, Caucharí-Olaroz y Centenario-Ratones) se concentran por evaporación solar o extracción directa y precipitan carbonato de litio grado batería.',
      productoIds: ['litio'].filter((id) => validIds.has(id)),
      vinculos: [
        {
          id: 'salmuera-a-litio',
          desdeProductoId: null,
          desdeEtiqueta: 'Salmuera de salar (LiCl) + Na2CO3',
          haciaProductoId: 'litio',
          flujoQuimico: 'Concentración + purificación + carbonatación -> Li2CO3',
          nodoTerritorial: 'Susques, Antofagasta de la Sierra y Los Andes',
          tipo: 'insumo_primario',
        },
      ],
    },
    {
      troncoId: 'celulosa-nea',
      titulo: 'Tronco Fibra Celulósica · NEA',
      regionClave: 'Chaco (9 de Julio / Las Breñas)',
      insumoBase: 'Algodón en bruto cosechado',
      formulaInsumo: '(C6H10O5)n + H2O2',
      acento: 'ochre',
      resumen:
        'El algodón en bruto pasa por desmote mecánico (separación de fibra y semilla oleaginosa) y refinación química húmeda con descrudado alcalino y blanqueo con peróxido de hidrógeno hacia fibra textil.',
      productoIds: ['algodon'].filter((id) => validIds.has(id)),
      vinculos: [
        {
          id: 'bruto-a-algodon',
          desdeProductoId: null,
          desdeEtiqueta: 'Algodón en bruto + NaOH / H2O2',
          haciaProductoId: 'algodon',
          flujoQuimico: 'Desmote industrial + blanqueo -> fibra de celulosa + semilla',
          nodoTerritorial: 'Las Breñas, 9 de Julio (Chaco)',
          tipo: 'insumo_primario',
        },
      ],
    },
  ];

  return { troncos, productos };
}
