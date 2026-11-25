import { z } from 'zod';

export const CasaCambioSchema = z.enum(['contadoconliqui', 'bolsa', 'oficial', 'usd_brl']);
export type CasaCambio = z.infer<typeof CasaCambioSchema>;
export type DolarSelector = 'contadoconliqui' | 'bolsa' | 'oficial';

export const TipoCambioRegistroSchema = z.object({
  casa: CasaCambioSchema,
  nombre: z.string().min(1),
  moneda_base: z.string().min(3),
  moneda_destino: z.string().min(3),
  compra: z.number().positive().nullable(),
  venta: z.number().positive(),
  fuente: z.string().min(1),
  fuente_url: z.string().url(),
  fecha_actualizacion: z.string().min(10),
});
export type TipoCambioRegistro = z.infer<typeof TipoCambioRegistroSchema>;

export const TipoCotizacionSchema = z.enum(['directa_local', 'matriz_global', 'no_cotiza']);
export type TipoCotizacion = z.infer<typeof TipoCotizacionSchema>;

export const MonedaOrigenSchema = z.enum(['ARS', 'USD', 'BRL']);
export type MonedaOrigen = z.infer<typeof MonedaOrigenSchema>;

export const EmpresaMercadoSchema = z.object({
  empresa_id: z.string().min(2),
  tipo_cotizacion: TipoCotizacionSchema,
  entidad_cotizante: z.string().min(1).nullable(),
  ticker: z.string().min(1).nullable(),
  ticker_feed: z.string().min(1).nullable(),
  bolsa: z.string().min(1).nullable(),
  moneda_origen: MonedaOrigenSchema.nullable(),
  acciones_circulacion: z.number().int().positive().nullable(),
  ultimo_precio: z.number().positive().nullable(),
  cierre_previo: z.number().positive().nullable(),
  variacion_dia_pct: z.number().finite().nullable(),
  market_cap_origen: z.number().positive().nullable(),
  nota_cotizacion: z.string().min(10),
  fuente_acciones: z.string().min(1).nullable(),
  fuente_precio: z.string().min(1).nullable(),
  mercado_actualizado_en: z.string().min(10).nullable(),
});
export type EmpresaMercado = z.infer<typeof EmpresaMercadoSchema>;

export const MercadoSnapshotSchema = z.object({
  generado_en: z.string().min(10),
  fuente_edge_url: z.string().url(),
  tipos_cambio: z.array(TipoCambioRegistroSchema).min(3),
  empresas: z.array(EmpresaMercadoSchema).min(1),
});
export type MercadoSnapshot = z.infer<typeof MercadoSnapshotSchema>;

export interface ValuacionCalculada {
  marketCapArs: number;
  marketCapUsd: number;
  precioArs: number;
  precioUsd: number;
  tasaAplicadaArsPorUsd: number;
}

/**
 * Convierte de manera determinista el Market Cap y precio por acción a ARS y USD
 * usando el tipo de cambio argentino elegido (CCL, MEP u Oficial) y USD/BRL si cotiza en B3.
 */
export function computeValuationArsUsd(
  mercado: EmpresaMercado,
  tiposCambio: TipoCambioRegistro[],
  dolarCasa: DolarSelector
): ValuacionCalculada | null {
  if (
    mercado.tipo_cotizacion === 'no_cotiza' ||
    !mercado.moneda_origen ||
    !mercado.ultimo_precio ||
    !mercado.market_cap_origen
  ) {
    return null;
  }

  const fxArs =
    tiposCambio.find((t) => t.casa === dolarCasa) ??
    tiposCambio.find((t) => t.casa === 'contadoconliqui');
  if (!fxArs || fxArs.venta <= 0) return null;

  const arsPerUsd = fxArs.venta;

  if (mercado.moneda_origen === 'ARS') {
    return {
      marketCapArs: mercado.market_cap_origen,
      marketCapUsd: mercado.market_cap_origen / arsPerUsd,
      precioArs: mercado.ultimo_precio,
      precioUsd: mercado.ultimo_precio / arsPerUsd,
      tasaAplicadaArsPorUsd: arsPerUsd,
    };
  }

  if (mercado.moneda_origen === 'USD') {
    return {
      marketCapUsd: mercado.market_cap_origen,
      marketCapArs: mercado.market_cap_origen * arsPerUsd,
      precioUsd: mercado.ultimo_precio,
      precioArs: mercado.ultimo_precio * arsPerUsd,
      tasaAplicadaArsPorUsd: arsPerUsd,
    };
  }

  // Cotización en BRL (ej. B3 Brasil: UNIP6.SA) -> pasar primero a USD vía BRL=X y luego a ARS
  const fxBrl = tiposCambio.find((t) => t.casa === 'usd_brl');
  if (!fxBrl || fxBrl.venta <= 0) return null;
  const brlPerUsd = fxBrl.venta;
  const marketCapUsd = mercado.market_cap_origen / brlPerUsd;
  const precioUsd = mercado.ultimo_precio / brlPerUsd;

  return {
    marketCapUsd,
    marketCapArs: marketCapUsd * arsPerUsd,
    precioUsd,
    precioArs: precioUsd * arsPerUsd,
    tasaAplicadaArsPorUsd: arsPerUsd,
  };
}

/**
 * Formatea cifras grandes de capitalización bursátil en notación argentina clara (M / mil M / billones).
 */
export function formatMarketCap(valor: number, moneda: 'USD' | 'ARS'): string {
  const prefix = moneda === 'USD' ? 'USD ' : 'ARS ';
  if (valor >= 1_000_000_000_000) {
    return `${prefix}${(valor / 1_000_000_000_000).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} B`;
  }
  if (valor >= 1_000_000_000) {
    return `${prefix}${(valor / 1_000_000_000).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} mil M`;
  }
  return `${prefix}${(valor / 1_000_000).toLocaleString('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} M`;
}
