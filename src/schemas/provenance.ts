import { z } from 'zod';

export const ConfianzaSchema = z.enum(['alta', 'media', 'baja', 'ejemplo']);
export type Confianza = z.infer<typeof ConfianzaSchema>;

export const TipoFuenteSchema = z.enum(['oficial', 'tecnica', 'empresa', 'ejemplo']);
export type TipoFuente = z.infer<typeof TipoFuenteSchema>;

export const Sha256Schema = z
  .string()
  .regex(/^sha256:[a-f0-9]{64}$/i, 'El hash debe cumplir el formato sha256:<64 caracteres hex>');

export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe usar formato ISO YYYY-MM-DD');

export const AnioSchema = z
  .number()
  .int('El año debe ser un entero')
  .min(1900, 'Año fuera de rango mínimo (1900)')
  .max(2100, 'Año fuera de rango máximo (2100)');

/**
 * Trazabilidad obligatoria para toda cifra o hecho verificable.
 * Si falta cualquiera de estos campos, el build falla.
 */
export const ProvenanceSchema = z.object({
  anio: AnioSchema,
  fuente_id: z.string().min(1, 'fuente_id obligatorio'),
  fuente: z.string().min(1, 'Nombre de fuente obligatorio'),
  url: z.string().url('La URL de fuente debe ser válida'),
  fecha_descarga: IsoDateSchema,
  hash: Sha256Schema,
  cita_ubicacion: z.string().min(1, 'cita_ubicacion obligatoria (archivo + celda/página)'),
  confianza: ConfianzaSchema,
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

/**
 * Toda cifra numérica del atlas usa esta unión discriminada:
 * - Si existe dato: exige valor finito, unidad y procedencia completa.
 * - Si falta: debe marcarse explícitamente como `sin_datos` con `valor: null`.
 */
export const ValorMedidoSchema = z.discriminatedUnion('estado', [
  z.object({
    estado: z.literal('dato'),
    valor: z.number().finite('El valor numérico debe ser finito'),
    unidad: z.string().min(1, 'La unidad es obligatoria cuando estado = dato'),
    procedencia: ProvenanceSchema,
  }),
  z.object({
    estado: z.literal('sin_datos'),
    valor: z.null(),
    unidad: z.string().nullable(),
    procedencia: ProvenanceSchema.nullable(),
  }),
]);
export type ValorMedido = z.infer<typeof ValorMedidoSchema>;
