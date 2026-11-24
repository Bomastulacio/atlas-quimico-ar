import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AtlasDatasetSchema, validateDatasetIntegrity, type AtlasDataset } from '@/schemas';

const GOLDEN_PATH = path.join(process.cwd(), 'data', 'golden', 'aluminio.golden.json');

function loadGolden(): AtlasDataset {
  const raw = fs.readFileSync(GOLDEN_PATH, 'utf-8');
  return AtlasDatasetSchema.parse(JSON.parse(raw));
}

/**
 * Parser estequiométrico determinista (soporta coeficientes, subíndices y paréntesis como Al(OH)3).
 */
function parseFormulaAtoms(formula: string): Record<string, number> {
  const stack: Array<Record<string, number>> = [{}];
  let i = 0;

  while (i < formula.length) {
    const ch = formula[i];
    if (ch === '(') {
      stack.push({});
      i += 1;
    } else if (ch === ')') {
      const group = stack.pop();
      if (!group) throw new Error(`Paréntesis desbalanceado en "${formula}"`);
      i += 1;
      let numStr = '';
      while (i < formula.length && /\d/.test(formula[i])) {
        numStr += formula[i];
        i += 1;
      }
      const mult = numStr ? Number.parseInt(numStr, 10) : 1;
      const top = stack[stack.length - 1];
      for (const [el, cnt] of Object.entries(group)) {
        top[el] = (top[el] ?? 0) + cnt * mult;
      }
    } else if (/[A-Z]/.test(ch)) {
      let el = ch;
      i += 1;
      while (i < formula.length && /[a-z]/.test(formula[i])) {
        el += formula[i];
        i += 1;
      }
      let numStr = '';
      while (i < formula.length && /\d/.test(formula[i])) {
        numStr += formula[i];
        i += 1;
      }
      const count = numStr ? Number.parseInt(numStr, 10) : 1;
      const top = stack[stack.length - 1];
      top[el] = (top[el] ?? 0) + count;
    } else {
      i += 1;
    }
  }

  return stack[0];
}

function sumSideAtoms(side: string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const termRaw of side.split('+')) {
    const term = termRaw.trim();
    const match = /^(\d+)?\s*(.+)$/.exec(term);
    if (!match) continue;
    const coeff = match[1] ? Number.parseInt(match[1], 10) : 1;
    const atoms = parseFormulaAtoms(match[2].trim());
    for (const [el, cnt] of Object.entries(atoms)) {
      totals[el] = (totals[el] ?? 0) + cnt * coeff;
    }
  }
  return totals;
}

describe('Set de Oro de Aluminio (data/golden/aluminio.golden.json)', () => {
  it('aprueba esquema Zod e integridad estricta (strictReal=true) sin ninguna fuente de ejemplo', () => {
    const golden = loadGolden();
    expect(golden.manifest.es_ejemplo).toBe(false);
    expect(golden.fuentes.length).toBeGreaterThanOrEqual(8);
    expect(golden.fuentes.every((f) => f.tipo !== 'ejemplo')).toBe(true);

    const integrity = validateDatasetIntegrity(golden, { strictReal: true });
    expect(integrity.errors).toEqual([]);
    expect(integrity.ok).toBe(true);
  });

  it('conserva exactamente los átomos por elemento en todas las reacciones químicas balanceadas', () => {
    const golden = loadGolden();
    const reacciones = golden.pasos_proceso
      .map((p) => p.reaccion_balanceada)
      .filter((r): r is string => Boolean(r));

    expect(reacciones.length).toBeGreaterThanOrEqual(2);

    for (const rxn of reacciones) {
      const parts = rxn.split('->');
      expect(parts).toHaveLength(2);
      const lhs = sumSideAtoms(parts[0]);
      const rhs = sumSideAtoms(parts[1]);
      expect(lhs).toEqual(rhs);
    }
  });

  it('cumple controles de cordura estequiométricos y energéticos (Sección 6.2)', () => {
    const golden = loadGolden();

    // Masas molares IUPAC (g/mol)
    const M_AL = 26.98154;
    const M_O = 15.999;
    const M_C = 12.011;
    const M_AL2O3 = 2 * M_AL + 3 * M_O;

    const minAluminaPerAl = (2 * M_AL2O3) / (4 * M_AL); // ~1.8894 t/t
    const minCarbonPerAl = (3 * M_C) / (4 * M_AL); // ~0.3339 t/t

    const electrolisis = golden.pasos_proceso.find(
      (p) => p.paso_id === 'al-p4-electrolisis-hall-heroult'
    );
    expect(electrolisis).toBeDefined();

    const aluminaReactivo = electrolisis!.reactivos.find((r) => r.especie.includes('Al2O3'));
    const carbonReactivo = electrolisis!.reactivos.find((r) => r.especie.startsWith('C '));

    expect(aluminaReactivo?.cantidad).toBeGreaterThan(minAluminaPerAl);
    expect(aluminaReactivo?.cantidad).toBeGreaterThanOrEqual(1.9);
    expect(aluminaReactivo?.cantidad).toBeLessThanOrEqual(2.0);

    expect(carbonReactivo?.cantidad).toBeGreaterThan(minCarbonPerAl);
    expect(carbonReactivo?.cantidad).toBeGreaterThanOrEqual(0.4);
    expect(carbonReactivo?.cantidad).toBeLessThanOrEqual(0.5);

    // Energía eléctrica en cubas dentro del rango industrial Hall-Héroult (13-15 MWh/t Al)
    expect(electrolisis!.energia.estado).toBe('dato');
    if (electrolisis!.energia.estado === 'dato') {
      expect(electrolisis!.energia.valor).toBeGreaterThanOrEqual(13.0);
      expect(electrolisis!.energia.valor).toBeLessThanOrEqual(15.0);
    }
  });

  it('mantiene un grafo de proceso conectado sin pasos huérfanos', () => {
    const golden = loadGolden();
    const touchedSteps = new Set<string>();
    for (const c of golden.conexiones_proceso) {
      touchedSteps.add(c.origen_paso_id);
      touchedSteps.add(c.destino_paso_id);
    }
    for (const paso of golden.pasos_proceso) {
      expect(touchedSteps.has(paso.paso_id)).toBe(true);
    }
  });

  it('verifica plausibilidad geográfica (Puerto Madryn, Chubut) y comercial (alúmina HS 2818.20)', () => {
    const golden = loadGolden();
    const planta = golden.plantas[0];
    expect(planta.provincia_id).toBe('26');
    expect(planta.departamento_id).toBe('26007');
    expect(planta.lat).toBeLessThan(-42);
    expect(planta.lat).toBeGreaterThan(-43.5);
    expect(planta.lon).toBeLessThan(-64.5);
    expect(planta.lon).toBeGreaterThan(-65.8);

    // Cruce comercial vs producción física (alúmina importada 2024 / producción FY 2024-25)
    const alumina2024 = golden.comercio_exterior.find(
      (r) => r.ncm_codigo === '2818.20' && r.metrica === 'volumen_t' && r.anio === 2024
    );
    const prod2025 = golden.produccion.find((r) => r.anio === 2025);

    expect(alumina2024?.importacion.estado).toBe('dato');
    expect(prod2025?.medicion.estado).toBe('dato');
    if (alumina2024?.importacion.estado === 'dato' && prod2025?.medicion.estado === 'dato') {
      const ratioReal = alumina2024.importacion.valor / prod2025.medicion.valor;
      expect(ratioReal).toBeGreaterThanOrEqual(1.9);
      expect(ratioReal).toBeLessThanOrEqual(2.0);
    }
  });
});
