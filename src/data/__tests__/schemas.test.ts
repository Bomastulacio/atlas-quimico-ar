import { describe, expect, it } from 'vitest';
import {
  ComercioExteriorRegistroSchema,
  ProvenanceSchema,
  ValorMedidoSchema,
  validateDatasetIntegrity,
  type AtlasDataset,
} from '@/schemas';

const validProvenance = {
  anio: 2024,
  fuente_id: 'ejemplo-fuente-01',
  fuente: 'Fuente Oficial Demo',
  url: 'https://datos.gob.ar/dataset/demo',
  fecha_descarga: '2026-11-24',
  hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  cita_ubicacion: 'cuadro_1.csv fila 4, col C',
  confianza: 'alta' as const,
};

describe('Reglas de integridad y procedencia (Zod)', () => {
  it('acepta una procedencia completa y válida', () => {
    expect(ProvenanceSchema.safeParse(validProvenance).success).toBe(true);
  });

  it('rechaza cualquier procedencia sin hash SHA-256 válido o sin cita_ubicacion', () => {
    expect(ProvenanceSchema.safeParse({ ...validProvenance, hash: 'md5:1234' }).success).toBe(false);
    expect(ProvenanceSchema.safeParse({ ...validProvenance, cita_ubicacion: '' }).success).toBe(false);
    expect(ProvenanceSchema.safeParse({ ...validProvenance, url: 'no-es-url' }).success).toBe(false);
  });

  it('obliga a que estado="sin_datos" tenga valor=null (prohibido inventar ceros)', () => {
    const ok = ValorMedidoSchema.safeParse({
      estado: 'sin_datos',
      valor: null,
      unidad: 't',
      procedencia: validProvenance,
    });
    expect(ok.success).toBe(true);

    const bad = ValorMedidoSchema.safeParse({
      estado: 'sin_datos',
      valor: 0,
      unidad: 't',
      procedencia: validProvenance,
    });
    expect(bad.success).toBe(false);
  });

  it('rechaza saldo comercial inconsistente con exportación menos importación', () => {
    const inconsistent = ComercioExteriorRegistroSchema.safeParse({
      registro_id: 'comex-test-2024',
      producto_id: 'aluminio',
      anio: 2024,
      ncm_codigo: '7601',
      metrica: 'valor_usd',
      exportacion: { estado: 'dato', valor: 500, unidad: 'USD', procedencia: validProvenance },
      importacion: { estado: 'dato', valor: 200, unidad: 'USD', procedencia: validProvenance },
      saldo_comercial: { estado: 'dato', valor: 999, unidad: 'USD', procedencia: validProvenance },
      procedencia: validProvenance,
    });
    expect(inconsistent.success).toBe(false);
  });

  it('bloquea datasets de ejemplo cuando strictReal=true y detecta claves foráneas rotas', () => {
    const mockDataset: AtlasDataset = {
      manifest: {
        version_esquema: '1.0.0',
        generado_en: '2026-11-24T12:00:00.000Z',
        origen: 'fixtures_ejemplo',
        es_ejemplo: true,
        nota: 'Prueba',
        tablas: {},
      },
      fuentes: [],
      provincias: [],
      departamentos: [
        {
          departamento_id: '26007',
          provincia_id: '26',
          nombre: 'Biedma',
          tipo_zona: 'polo_industrial',
          tiene_datos_confiables: true,
          cobertura_datos: 'parcial',
          nota_cobertura: null,
        },
      ],
      productos: [],
      productos_zonas: [],
      procesos: [],
      pasos_proceso: [],
      conexiones_proceso: [],
      empresas: [],
      plantas: [],
      produccion: [],
      comercio_exterior: [],
    };

    const result = validateDatasetIntegrity(mockDataset, { strictReal: true });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('provincia_id inexistente'))).toBe(true);
    expect(result.errors.some((e) => e.includes('strictReal'))).toBe(true);
  });
});
