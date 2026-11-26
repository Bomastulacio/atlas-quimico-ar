import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  METANOL_CALLOUT_META,
  METANOL_CYCLE_DEG,
  METANOL_OVERVIEW_CAMERA,
  METANOL_PHASES,
  buildMetanolMechanism,
} from './metanol/metanolInkworksMechanism';

interface MetanolProcessAnatomyProps {
  pasos: PasoProceso[];
  exportVol2023T: number | null;
}

export function MetanolProcessAnatomy({ pasos, exportVol2023T }: MetanolProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Complejo Industrial Plaza Huincul (Metanol, Neuquén)"
      exportPrefix="metanol-neuquen"
      canvasAriaLabel="Simulación 3D interactiva del proceso de síntesis de metanol en Plaza Huincul, Neuquén"
      phases={METANOL_PHASES}
      overviewCamera={METANOL_OVERVIEW_CAMERA}
      calloutsMeta={METANOL_CALLOUT_META}
      buildMechanism={buildMetanolMechanism}
      pasos={pasos}
      cycleDeg={METANOL_CYCLE_DEG}
      kpis={[
        { label: 'Carga gas natural', value: '0,56 t/t CH3OH', accentClass: 'text-cobalt' },
        { label: 'Factor IPCC SMR', value: '0,67 t CO2/t', accentClass: 'text-signal-red' },
        {
          label: 'Exp. HS 2905.11 (2023)',
          value: exportVol2023T !== null ? `${Math.round(exportVol2023T).toLocaleString('es-AR')} t` : 's/d',
          accentClass: 'text-emerald-react',
        },
      ]}
    />
  );
}
