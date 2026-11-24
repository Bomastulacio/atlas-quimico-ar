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

import {
  AtlasDatasetSchema,
  type AtlasDataset,
  type CoberturaDatos,
  type ComercioExteriorRegistro,
  type ConexionProceso,
  type DatasetManifest,
  type Departamento,
  type Empresa,
  type Fuente,
  type PasoProceso,
  type Planta,
  type Proceso,
  type ProduccionRegistro,
  type Producto,
  type ProductoZona,
  type Provincia,
} from '@/schemas';

let cachedDataset: AtlasDataset | null = null;

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
  getGeoManifest,
  type GeoManifest,
  type ProvinciaGeoProperties,
  type ProvinciasFeatureCollection,
} from './geo';

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
