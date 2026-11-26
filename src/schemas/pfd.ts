import { z } from 'zod';
import { Sha256Schema } from './provenance';

const NonEmptyString = z.string().trim().min(1);

export const PfdSimboloEquipoSchema = z.enum([
  'furnace',
  'heat_exchanger',
  'reactor',
  'column',
  'separator',
  'compressor',
  'pump',
  'condenser',
  'tank',
  'granulator',
  'extruder',
  'dryer_bed',
  'electrolytic_cell',
  'filter_baghouse',
  'solar_pond',
  'centrifuge',
  'extractor',
  'mill_gin',
]);

export type PfdSimboloEquipo = z.infer<typeof PfdSimboloEquipoSchema>;

export const PfdSeccionSchema = z.object({
  area_id: NonEmptyString,
  titulo: NonEmptyString,
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

export type PfdSeccion = z.infer<typeof PfdSeccionSchema>;

export const PfdEquipoSchema = z.object({
  tag: NonEmptyString,
  nombre: NonEmptyString,
  simbolo: PfdSimboloEquipoSchema,
  area_id: NonEmptyString,
  x: z.number(),
  y: z.number(),
  temperatura_op: NonEmptyString.nullable(),
  presion_op: NonEmptyString.nullable(),
  reaccion: NonEmptyString.nullable(),
  condicion_critica: NonEmptyString.nullable(),
  descripcion: NonEmptyString,
  fuente_id: NonEmptyString,
  cita_ubicacion: NonEmptyString,
});

export type PfdEquipo = z.infer<typeof PfdEquipoSchema>;

export const PfdFlujoCorrienteSchema = z.discriminatedUnion('estado', [
  z.object({
    estado: z.literal('dato'),
    valor: z.number().finite(),
    unidad: NonEmptyString,
  }),
  z.object({
    estado: z.literal('sin_datos'),
    valor: z.null(),
    unidad: NonEmptyString,
  }),
]);

export type PfdFlujoCorriente = z.infer<typeof PfdFlujoCorrienteSchema>;

export const PfdCorrienteSchema = z.object({
  numero: z.number().int().positive(),
  nombre: NonEmptyString,
  tipo: z.enum(['proceso', 'reciclo', 'subproducto', 'emision']),
  origen_tag: NonEmptyString.nullable(),
  destino_tag: NonEmptyString.nullable(),
  puntos: z.array(z.tuple([z.number(), z.number()])).min(2),
  flag_pos: z.tuple([z.number(), z.number()]),
  especies: NonEmptyString,
  fase: z.enum(['Gas', 'Líquido', 'Sólido', 'Bifásico']),
  temperatura_c: NonEmptyString.nullable(),
  presion_bar: NonEmptyString.nullable(),
  flujo_especifico: PfdFlujoCorrienteSchema,
  nota_tecnica: NonEmptyString,
  fuente_id: NonEmptyString,
  cita_ubicacion: NonEmptyString,
});

export type PfdCorriente = z.infer<typeof PfdCorrienteSchema>;

export const PfdServicioSchema = z.object({
  id: NonEmptyString,
  equipo_tag: NonEmptyString,
  etiqueta: NonEmptyString,
  direccion: z.enum(['entrada', 'salida']),
  x: z.number(),
  y: z.number(),
  dx: z.number(),
  dy: z.number(),
});

export type PfdServicio = z.infer<typeof PfdServicioSchema>;

export const PfdFuenteRefSchema = z.object({
  fuente_id: NonEmptyString,
  nombre: NonEmptyString,
  organismo: NonEmptyString,
  url: z.string().url(),
  hash: Sha256Schema,
});

export type PfdFuenteRef = z.infer<typeof PfdFuenteRefSchema>;

export const PfdLimiteBateriaSchema = z.object({
  id: NonEmptyString,
  lado: z.enum(['entrada', 'salida']),
  categoria: z.enum(['materia_prima', 'servicio', 'producto', 'subproducto', 'emision']),
  nombre: NonEmptyString,
  formula: NonEmptyString,
  cantidad_masa: NonEmptyString,
  cantidad_molar: NonEmptyString.nullable(),
  fraccion_pureza: NonEmptyString.nullable(),
  corriente_num: z.number().int().positive().nullable(),
  y: z.number(),
  nota: NonEmptyString,
  fuente_id: NonEmptyString,
});

export type PfdLimiteBateria = z.infer<typeof PfdLimiteBateriaSchema>;

export const PfdProcesoSchema = z.object({
  proceso_id: NonEmptyString,
  producto_id: NonEmptyString,
  titulo: NonEmptyString,
  norma_simbologia: NonEmptyString,
  base_calculo: NonEmptyString,
  resumen_tecnico: NonEmptyString,
  nota_metodologica: NonEmptyString,
  canvas_width: z.number().positive(),
  canvas_height: z.number().positive(),
  secciones: z.array(PfdSeccionSchema).min(1),
  equipos: z.array(PfdEquipoSchema).min(4),
  corrientes: z.array(PfdCorrienteSchema).min(4),
  servicios: z.array(PfdServicioSchema),
  limites_bateria: z.array(PfdLimiteBateriaSchema).min(2),
});

export type PfdProceso = z.infer<typeof PfdProcesoSchema>;

export const PfdDatasetSchema = z.array(PfdProcesoSchema);
