import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  SODA_SOLVAY_CALLOUT_META,
  SODA_SOLVAY_CYCLE_DEG,
  SODA_SOLVAY_OVERVIEW_CAMERA,
  SODA_SOLVAY_PHASES,
  buildSodaSolvayMechanism,
} from './soda-solvay/sodaSolvayInkworksMechanism';

interface SodaSolvayProcessAnatomyProps {
  pasos: PasoProceso[];
  importUsd2024M: number | null;
}

export function SodaSolvayProcessAnatomy({
  pasos,
  importUsd2024M,
}: SodaSolvayProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Planta ALPAT Solvay (San Antonio Oeste, Río Negro)"
      exportPrefix="soda-solvay-rio-negro"
      canvasAriaLabel="Simulación 3D interactiva del proceso Solvay de carbonato de sodio en San Antonio Oeste, Río Negro"
      phases={SODA_SOLVAY_PHASES}
      overviewCamera={SODA_SOLVAY_OVERVIEW_CAMERA}
      calloutsMeta={SODA_SOLVAY_CALLOUT_META}
      buildMechanism={buildSodaSolvayMechanism}
      pasos={pasos}
      cycleDeg={SODA_SOLVAY_CYCLE_DEG}
      kpis={[
        { label: 'Carga NaCl / CaCO3', value: '1,50 / 1,25 t/t', accentClass: 'text-cobalt' },
        { label: 'Reciclo NH3', value: '>99% cerrado', accentClass: 'text-emerald-react' },
        {
          label: 'Imp. HS 2836.20 (24)',
          value:
            importUsd2024M !== null
              ? `USD ${importUsd2024M.toLocaleString('es-AR', { maximumFractionDigits: 1 })} M`
              : 's/d',
        },
      ]}
    />
  );
}
