import { z } from 'zod';
import {
  IsoDateSchema,
  ProvenanceSchema,
  Sha256Schema,
  TipoFuenteSchema,
  ValorMedidoSchema,
} from './provenance';

const SlugSchema = z
  .string()
  .min(2)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El ID debe ser un slug estable en minúsculas (a-z, 0-9, -)');

const GeorefProvinciaIdSchema = z
  .string()
  .regex(/^\d{2}$/, 'provincia_id debe ser código oficial Georef de 2 dígitos');

const GeorefDepartamentoIdSchema = z
  .string()
  .regex(/^\d{5}$/, 'departamento_id debe ser código oficial Georef de 5 dígitos');

export const CoberturaDatosSchema = z.enum(['completa', 'parcial', 'baja', 'sin_datos']);
export type CoberturaDatos = z.infer<typeof CoberturaDatosSchema>;

export const RegionArgentinaSchema = z.enum([
  'NOA',
  'NEA',
  'Cuyo',
  'Centro',
  'Pampeana',
  'Patagonia',
]);

export const FuenteSchema = z.object({
  fuente_id: SlugSchema,
  nombre: z.string().min(1),
  organismo: z.string().min(1),
  tipo: TipoFuenteSchema,
  url: z.string().url(),
  fecha_descarga: IsoDateSchema,
  hash: Sha256Schema,
  archivo_raw: z.string().nullable(),
  notas: z.string().nullable(),
});
export type Fuente = z.infer<typeof FuenteSchema>;

export const ProvinciaSchema = z.object({
  provincia_id: GeorefProvinciaIdSchema,
  nombre: z.string().min(1),
  iso_3166_2: z.string().regex(/^AR-[A-Z]$/, 'Código ISO 3166-2 argentino esperado (ej. AR-U)'),
  region: RegionArgentinaSchema,
  cobertura_datos: CoberturaDatosSchema,
  nota_cobertura: z.string().nullable(),
});
export type Provincia = z.infer<typeof ProvinciaSchema>;

export const DepartamentoSchema = z
  .object({
    departamento_id: GeorefDepartamentoIdSchema,
    provincia_id: GeorefProvinciaIdSchema,
    nombre: z.string().min(1),
    tipo_zona: z.enum(['agro', 'polo_industrial', 'minero', 'energetico', 'mixto']),
    tiene_datos_confiables: z.boolean(),
    cobertura_datos: CoberturaDatosSchema,
    nota_cobertura: z.string().nullable(),
  })
  .refine((d) => d.departamento_id.startsWith(d.provincia_id), {
    message: 'departamento_id debe comenzar con su provincia_id Georef',
    path: ['departamento_id'],
  });
export type Departamento = z.infer<typeof DepartamentoSchema>;

export const CategoriaProductoSchema = z.enum([
  'metalurgia',
  'mineria_quimica',
  'fertilizantes',
  'agroindustria',
  'petroquimica',
  'bioenergia',
]);

export const ProductoSchema = z.object({
  producto_id: SlugSchema,
  nombre: z.string().min(1),
  categoria: CategoriaProductoSchema,
  formula_quimica: z.string().nullable(),
  icono_id: SlugSchema,
  descripcion_corta: z.string().min(10),
  mdx_slug: SlugSchema.nullable(),
  estado_mvp: z.enum(['ejemplo', 'en_curso', 'validado', 'pendiente']),
});
export type Producto = z.infer<typeof ProductoSchema>;

export const ProductoZonaSchema = z.object({
  relacion_id: SlugSchema,
  producto_id: SlugSchema,
  provincia_id: GeorefProvinciaIdSchema,
  departamento_id: GeorefDepartamentoIdSchema.nullable(),
  es_dominante: z.boolean(),
  rol_en_cadena: z.enum(['extraccion', 'procesamiento', 'refinacion', 'sintesis', 'logistica_export']),
  procedencia: ProvenanceSchema,
});
export type ProductoZona = z.infer<typeof ProductoZonaSchema>;

export const ProcesoSchema = z.object({
  proceso_id: SlugSchema,
  producto_id: SlugSchema,
  nombre: z.string().min(1),
  ruta_tecnologica: z.string().min(1),
  reaccion_global: z.string().nullable(),
  energia_especifica: ValorMedidoSchema,
  descripcion: z.string().min(10),
  procedencia: ProvenanceSchema,
});
export type Proceso = z.infer<typeof ProcesoSchema>;

export const CorrienteEspecieSchema = z.object({
  especie: z.string().min(1),
  cantidad: z.number().finite().nullable(),
  unidad: z.string().min(1),
});
export type CorrienteEspecie = z.infer<typeof CorrienteEspecieSchema>;

export const PasoProcesoSchema = z.object({
  paso_id: SlugSchema,
  proceso_id: SlugSchema,
  orden: z.number().int().positive(),
  nombre: z.string().min(1),
  tipo_paso: z.enum([
    'materia_prima',
    'preparacion',
    'reaccion',
    'separacion',
    'refinacion',
    'producto',
    'subproducto',
    'emision',
  ]),
  reaccion_balanceada: z.string().nullable(),
  temperatura_c: z.string().nullable(),
  presion_bar: z.string().nullable(),
  reactivos: z.array(CorrienteEspecieSchema),
  productos: z.array(CorrienteEspecieSchema),
  insumos: z.array(CorrienteEspecieSchema),
  subproductos: z.array(CorrienteEspecieSchema),
  energia: ValorMedidoSchema,
  descripcion: z.string().min(10),
  pos_x: z.number().finite(),
  pos_y: z.number().finite(),
  procedencia: ProvenanceSchema,
});
export type PasoProceso = z.infer<typeof PasoProcesoSchema>;

export const ConexionProcesoSchema = z
  .object({
    conexion_id: SlugSchema,
    proceso_id: SlugSchema,
    origen_paso_id: SlugSchema,
    destino_paso_id: SlugSchema,
    corriente_nombre: z.string().min(1),
    tipo_corriente: z.enum(['principal', 'insumo', 'subproducto', 'reciclo', 'emision', 'residuo']),
    flujo: ValorMedidoSchema,
    procedencia: ProvenanceSchema,
  })
  .refine((c) => c.origen_paso_id !== c.destino_paso_id, {
    message: 'Una conexión no puede tener el mismo paso como origen y destino',
    path: ['destino_paso_id'],
  });
export type ConexionProceso = z.infer<typeof ConexionProcesoSchema>;

export const CuitSchema = z
  .string()
  .regex(/^\d{2}-\d{8}-\d$/, 'El CUIT debe tener formato argentino XX-XXXXXXXX-X');

export const RolSocietarioSchema = z.enum([
  'operadora_industrial',
  'logistica_puerto',
  'energia_utilidades',
  'comercializadora',
  'ingenieria_servicios',
  'vpu_rigi',
  'holding',
  'agrupamiento',
]);
export type RolSocietario = z.infer<typeof RolSocietarioSchema>;

export const EmpresaSchema = z.object({
  empresa_id: SlugSchema,
  razon_social: z.string().min(1),
  cuit: CuitSchema.nullable().default(null),
  empresa_matriz_id: SlugSchema.nullable().default(null),
  rol_societario: RolSocietarioSchema.default('operadora_industrial'),
  participacion_matriz_pct: z.number().gt(0).lte(100).nullable().default(null),
  tipo_capital: z.enum(['nacional', 'extranjero', 'mixto', 'estatal', 'sin_datos']),
  sitio_web_oficial: z.string().url().nullable(),
  hechos_verificables: z.string().min(10),
  procedencia: ProvenanceSchema,
});
export type Empresa = z.infer<typeof EmpresaSchema>;

export const PlantaSchema = z.object({
  planta_id: SlugSchema,
  empresa_id: SlugSchema,
  producto_id: SlugSchema,
  provincia_id: GeorefProvinciaIdSchema,
  departamento_id: GeorefDepartamentoIdSchema.nullable(),
  nombre: z.string().min(1),
  localidad: z.string().min(1),
  lat: z.number().min(-56, 'Latitud fuera de rango argentino').max(-21, 'Latitud fuera de rango argentino'),
  lon: z.number().min(-74, 'Longitud fuera de rango argentino').max(-53, 'Longitud fuera de rango argentino'),
  estado_operativo: z.enum(['operativa', 'en_construccion', 'ampliacion', 'inactiva', 'sin_datos']),
  capacidad: ValorMedidoSchema,
  procedencia: ProvenanceSchema,
});
export type Planta = z.infer<typeof PlantaSchema>;

export const UnidadPlantaSchema = z.object({
  unidad_id: SlugSchema,
  planta_id: SlugSchema,
  proceso_id: SlugSchema,
  producto_id: SlugSchema,
  nombre_unidad: z.string().min(1),
  rol_unidad: z.enum(['principal', 'integrada', 'subproducto', 'servicios']),
  capacidad: ValorMedidoSchema,
  procedencia: ProvenanceSchema,
});
export type UnidadPlanta = z.infer<typeof UnidadPlantaSchema>;

export const VinculoB2BSchema = z
  .object({
    vinculo_id: SlugSchema,
    proveedor_empresa_id: SlugSchema,
    cliente_empresa_id: SlugSchema,
    tipo_vinculo: z.enum([
      'suministro_insumo',
      'energia_electrica',
      'logistica_ducto',
      'logistica_puerto',
      'ingenieria_montaje',
      'comercializacion_producto',
    ]),
    insumo_o_servicio: z.string().min(1),
    producto_id: SlugSchema.nullable().default(null),
    planta_cliente_id: SlugSchema.nullable().default(null),
    relacion_societaria: z.enum(['controlada', 'vinculada_jv', 'tercero_independiente']),
    volumen: ValorMedidoSchema,
    procedencia: ProvenanceSchema,
  })
  .refine((v) => v.proveedor_empresa_id !== v.cliente_empresa_id, {
    message: 'Un vínculo B2B no puede tener la misma empresa como proveedor y cliente',
    path: ['cliente_empresa_id'],
  });
export type VinculoB2B = z.infer<typeof VinculoB2BSchema>;

export const ProduccionRegistroSchema = z.object({
  registro_id: SlugSchema,
  producto_id: SlugSchema,
  provincia_id: GeorefProvinciaIdSchema.nullable(),
  anio: z.number().int().min(1900).max(2100),
  medicion: ValorMedidoSchema,
  procedencia: ProvenanceSchema,
});
export type ProduccionRegistro = z.infer<typeof ProduccionRegistroSchema>;

export const ComercioExteriorRegistroSchema = z
  .object({
    registro_id: SlugSchema,
    producto_id: SlugSchema,
    anio: z.number().int().min(1900).max(2100),
    ncm_codigo: z.string().min(2).nullable(),
    metrica: z.enum(['valor_usd', 'volumen_t']),
    exportacion: ValorMedidoSchema,
    importacion: ValorMedidoSchema,
    saldo_comercial: ValorMedidoSchema,
    procedencia: ProvenanceSchema,
  })
  .superRefine((reg, ctx) => {
    if (
      reg.exportacion.estado === 'dato' &&
      reg.importacion.estado === 'dato' &&
      reg.saldo_comercial.estado === 'dato'
    ) {
      const esperado = reg.exportacion.valor - reg.importacion.valor;
      if (Math.abs(reg.saldo_comercial.valor - esperado) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `saldo_comercial (${reg.saldo_comercial.valor}) no coincide con exportacion - importacion (${esperado})`,
          path: ['saldo_comercial'],
        });
      }
    }
  });
export type ComercioExteriorRegistro = z.infer<typeof ComercioExteriorRegistroSchema>;

export const ManifestSchema = z.object({
  version_esquema: z.string().min(1),
  generado_en: z.string().datetime(),
  origen: z.enum(['google_sheets', 'sheets_local', 'supabase', 'fixtures_ejemplo']),
  es_ejemplo: z.boolean(),
  nota: z.string(),
  tablas: z.record(
    z.string(),
    z.object({
      registros: z.number().int().nonnegative(),
      hash: Sha256Schema,
    })
  ),
});
export type DatasetManifest = z.infer<typeof ManifestSchema>;

export const AtlasDatasetSchema = z.object({
  manifest: ManifestSchema,
  fuentes: z.array(FuenteSchema),
  provincias: z.array(ProvinciaSchema),
  departamentos: z.array(DepartamentoSchema),
  productos: z.array(ProductoSchema),
  productos_zonas: z.array(ProductoZonaSchema),
  procesos: z.array(ProcesoSchema),
  pasos_proceso: z.array(PasoProcesoSchema),
  conexiones_proceso: z.array(ConexionProcesoSchema),
  empresas: z.array(EmpresaSchema),
  plantas: z.array(PlantaSchema),
  unidades_planta: z.array(UnidadPlantaSchema).default([]),
  vinculos_b2b: z.array(VinculoB2BSchema).default([]),
  produccion: z.array(ProduccionRegistroSchema),
  comercio_exterior: z.array(ComercioExteriorRegistroSchema),
});
export type AtlasDataset = z.infer<typeof AtlasDatasetSchema>;

export interface IntegrityCheckResult {
  ok: boolean;
  errors: string[];
}

function checkUniqueIds<T>(
  rows: T[],
  getId: (r: T) => string,
  tableName: string,
  errors: string[]
): Set<string> {
  const seen = new Set<string>();
  for (const row of rows) {
    const id = getId(row);
    if (seen.has(id)) {
      errors.push(`[${tableName}] ID duplicado: "${id}"`);
    }
    seen.add(id);
  }
  return seen;
}

/**
 * Valida integridad referencial entre todas las tablas del dataset
 * y aplica la barrera `strictReal` para bloquear datos de ejemplo en producción.
 */
export function validateDatasetIntegrity(
  dataset: AtlasDataset,
  options: { strictReal?: boolean } = {}
): IntegrityCheckResult {
  const errors: string[] = [];

  const fuenteIds = checkUniqueIds(dataset.fuentes, (r) => r.fuente_id, 'fuentes', errors);
  const provinciaIds = checkUniqueIds(dataset.provincias, (r) => r.provincia_id, 'provincias', errors);
  const deptoMap = new Map<string, Departamento>();
  const deptoIds = checkUniqueIds(
    dataset.departamentos,
    (r) => {
      deptoMap.set(r.departamento_id, r);
      return r.departamento_id;
    },
    'departamentos',
    errors
  );
  const productoIds = checkUniqueIds(dataset.productos, (r) => r.producto_id, 'productos', errors);
  checkUniqueIds(dataset.productos_zonas, (r) => r.relacion_id, 'productos_zonas', errors);
  const procesoIds = checkUniqueIds(dataset.procesos, (r) => r.proceso_id, 'procesos', errors);
  const pasoMap = new Map<string, PasoProceso>();
  const pasoIds = checkUniqueIds(
    dataset.pasos_proceso,
    (r) => {
      pasoMap.set(r.paso_id, r);
      return r.paso_id;
    },
    'pasos_proceso',
    errors
  );
  checkUniqueIds(dataset.conexiones_proceso, (r) => r.conexion_id, 'conexiones_proceso', errors);
  const empresaIds = checkUniqueIds(dataset.empresas, (r) => r.empresa_id, 'empresas', errors);
  const plantaIds = checkUniqueIds(dataset.plantas, (r) => r.planta_id, 'plantas', errors);
  const unidadesPlanta = dataset.unidades_planta ?? [];
  checkUniqueIds(unidadesPlanta, (r) => r.unidad_id, 'unidades_planta', errors);
  const vinculosB2B = dataset.vinculos_b2b ?? [];
  checkUniqueIds(vinculosB2B, (r) => r.vinculo_id, 'vinculos_b2b', errors);
  checkUniqueIds(dataset.produccion, (r) => r.registro_id, 'produccion', errors);
  checkUniqueIds(dataset.comercio_exterior, (r) => r.registro_id, 'comercio_exterior', errors);

  const checkFuente = (table: string, id: string, fuenteId: string) => {
    if (!fuenteIds.has(fuenteId)) {
      errors.push(`[${table}:${id}] fuente_id inexistente: "${fuenteId}"`);
    }
  };

  const checkDepto = (table: string, id: string, provinciaId: string, departamentoId: string | null) => {
    if (!departamentoId) return;
    if (!deptoIds.has(departamentoId)) {
      errors.push(`[${table}:${id}] departamento_id inexistente: "${departamentoId}"`);
      return;
    }
    const depto = deptoMap.get(departamentoId);
    if (depto && depto.provincia_id !== provinciaId) {
      errors.push(
        `[${table}:${id}] departamento "${departamentoId}" pertenece a provincia "${depto.provincia_id}", no a "${provinciaId}"`
      );
    }
  };

  for (const d of dataset.departamentos) {
    if (!provinciaIds.has(d.provincia_id)) {
      errors.push(`[departamentos:${d.departamento_id}] provincia_id inexistente: "${d.provincia_id}"`);
    }
  }

  for (const pz of dataset.productos_zonas) {
    if (!productoIds.has(pz.producto_id)) {
      errors.push(`[productos_zonas:${pz.relacion_id}] producto_id inexistente: "${pz.producto_id}"`);
    }
    if (!provinciaIds.has(pz.provincia_id)) {
      errors.push(`[productos_zonas:${pz.relacion_id}] provincia_id inexistente: "${pz.provincia_id}"`);
    }
    checkDepto('productos_zonas', pz.relacion_id, pz.provincia_id, pz.departamento_id);
    checkFuente('productos_zonas', pz.relacion_id, pz.procedencia.fuente_id);
  }

  for (const p of dataset.procesos) {
    if (!productoIds.has(p.producto_id)) {
      errors.push(`[procesos:${p.proceso_id}] producto_id inexistente: "${p.producto_id}"`);
    }
    checkFuente('procesos', p.proceso_id, p.procedencia.fuente_id);
  }

  for (const paso of dataset.pasos_proceso) {
    if (!procesoIds.has(paso.proceso_id)) {
      errors.push(`[pasos_proceso:${paso.paso_id}] proceso_id inexistente: "${paso.proceso_id}"`);
    }
    checkFuente('pasos_proceso', paso.paso_id, paso.procedencia.fuente_id);
  }

  for (const c of dataset.conexiones_proceso) {
    if (!procesoIds.has(c.proceso_id)) {
      errors.push(`[conexiones_proceso:${c.conexion_id}] proceso_id inexistente: "${c.proceso_id}"`);
    }
    if (!pasoIds.has(c.origen_paso_id)) {
      errors.push(`[conexiones_proceso:${c.conexion_id}] origen_paso_id inexistente: "${c.origen_paso_id}"`);
    } else if (pasoMap.get(c.origen_paso_id)?.proceso_id !== c.proceso_id) {
      errors.push(`[conexiones_proceso:${c.conexion_id}] origen_paso_id pertenece a otro proceso`);
    }
    if (!pasoIds.has(c.destino_paso_id)) {
      errors.push(`[conexiones_proceso:${c.conexion_id}] destino_paso_id inexistente: "${c.destino_paso_id}"`);
    } else if (pasoMap.get(c.destino_paso_id)?.proceso_id !== c.proceso_id) {
      errors.push(`[conexiones_proceso:${c.conexion_id}] destino_paso_id pertenece a otro proceso`);
    }
    checkFuente('conexiones_proceso', c.conexion_id, c.procedencia.fuente_id);
  }

  for (const e of dataset.empresas) {
    if (e.empresa_matriz_id) {
      if (e.empresa_matriz_id === e.empresa_id) {
        errors.push(`[empresas:${e.empresa_id}] empresa_matriz_id no puede apuntar a sí misma`);
      } else if (!empresaIds.has(e.empresa_matriz_id)) {
        errors.push(`[empresas:${e.empresa_id}] empresa_matriz_id inexistente: "${e.empresa_matriz_id}"`);
      }
    }
    checkFuente('empresas', e.empresa_id, e.procedencia.fuente_id);
  }

  for (const pl of dataset.plantas) {
    if (!empresaIds.has(pl.empresa_id)) {
      errors.push(`[plantas:${pl.planta_id}] empresa_id inexistente: "${pl.empresa_id}"`);
    }
    if (!productoIds.has(pl.producto_id)) {
      errors.push(`[plantas:${pl.planta_id}] producto_id inexistente: "${pl.producto_id}"`);
    }
    if (!provinciaIds.has(pl.provincia_id)) {
      errors.push(`[plantas:${pl.planta_id}] provincia_id inexistente: "${pl.provincia_id}"`);
    }
    checkDepto('plantas', pl.planta_id, pl.provincia_id, pl.departamento_id);
    checkFuente('plantas', pl.planta_id, pl.procedencia.fuente_id);
  }

  for (const u of unidadesPlanta) {
    if (!plantaIds.has(u.planta_id)) {
      errors.push(`[unidades_planta:${u.unidad_id}] planta_id inexistente: "${u.planta_id}"`);
    }
    if (!procesoIds.has(u.proceso_id)) {
      errors.push(`[unidades_planta:${u.unidad_id}] proceso_id inexistente: "${u.proceso_id}"`);
    }
    if (!productoIds.has(u.producto_id)) {
      errors.push(`[unidades_planta:${u.unidad_id}] producto_id inexistente: "${u.producto_id}"`);
    }
    checkFuente('unidades_planta', u.unidad_id, u.procedencia.fuente_id);
  }

  for (const v of vinculosB2B) {
    if (!empresaIds.has(v.proveedor_empresa_id)) {
      errors.push(`[vinculos_b2b:${v.vinculo_id}] proveedor_empresa_id inexistente: "${v.proveedor_empresa_id}"`);
    }
    if (!empresaIds.has(v.cliente_empresa_id)) {
      errors.push(`[vinculos_b2b:${v.vinculo_id}] cliente_empresa_id inexistente: "${v.cliente_empresa_id}"`);
    }
    if (v.producto_id && !productoIds.has(v.producto_id)) {
      errors.push(`[vinculos_b2b:${v.vinculo_id}] producto_id inexistente: "${v.producto_id}"`);
    }
    if (v.planta_cliente_id && !plantaIds.has(v.planta_cliente_id)) {
      errors.push(`[vinculos_b2b:${v.vinculo_id}] planta_cliente_id inexistente: "${v.planta_cliente_id}"`);
    }
    checkFuente('vinculos_b2b', v.vinculo_id, v.procedencia.fuente_id);
  }

  for (const pr of dataset.produccion) {
    if (!productoIds.has(pr.producto_id)) {
      errors.push(`[produccion:${pr.registro_id}] producto_id inexistente: "${pr.producto_id}"`);
    }
    if (pr.provincia_id && !provinciaIds.has(pr.provincia_id)) {
      errors.push(`[produccion:${pr.registro_id}] provincia_id inexistente: "${pr.provincia_id}"`);
    }
    checkFuente('produccion', pr.registro_id, pr.procedencia.fuente_id);
  }

  for (const ce of dataset.comercio_exterior) {
    if (!productoIds.has(ce.producto_id)) {
      errors.push(`[comercio_exterior:${ce.registro_id}] producto_id inexistente: "${ce.producto_id}"`);
    }
    checkFuente('comercio_exterior', ce.registro_id, ce.procedencia.fuente_id);
  }

  if (options.strictReal) {
    if (dataset.manifest.es_ejemplo) {
      errors.push('[strictReal] El manifiesto marca el dataset como ejemplo; prohibido publicar en modo estricto');
    }
    const allProvenances = [
      ...dataset.productos_zonas.map((r) => ({ ctx: `productos_zonas:${r.relacion_id}`, p: r.procedencia })),
      ...dataset.procesos.map((r) => ({ ctx: `procesos:${r.proceso_id}`, p: r.procedencia })),
      ...dataset.pasos_proceso.map((r) => ({ ctx: `pasos_proceso:${r.paso_id}`, p: r.procedencia })),
      ...dataset.conexiones_proceso.map((r) => ({ ctx: `conexiones_proceso:${r.conexion_id}`, p: r.procedencia })),
      ...dataset.empresas.map((r) => ({ ctx: `empresas:${r.empresa_id}`, p: r.procedencia })),
      ...dataset.plantas.map((r) => ({ ctx: `plantas:${r.planta_id}`, p: r.procedencia })),
      ...unidadesPlanta.map((r) => ({ ctx: `unidades_planta:${r.unidad_id}`, p: r.procedencia })),
      ...vinculosB2B.map((r) => ({ ctx: `vinculos_b2b:${r.vinculo_id}`, p: r.procedencia })),
      ...dataset.produccion.map((r) => ({ ctx: `produccion:${r.registro_id}`, p: r.procedencia })),
      ...dataset.comercio_exterior.map((r) => ({ ctx: `comercio_exterior:${r.registro_id}`, p: r.procedencia })),
    ];
    for (const item of allProvenances) {
      if (item.p.confianza === 'ejemplo') {
        errors.push(`[strictReal] Registro con confianza="ejemplo" bloqueado: ${item.ctx}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
