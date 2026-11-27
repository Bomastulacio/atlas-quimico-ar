import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  TANINO_CALLOUT_META,
  TANINO_CYCLE_DEG,
  TANINO_OVERVIEW_CAMERA,
  TANINO_PHASES,
  buildTaninoQuebrachoMechanism,
} from './tanino-quebracho/taninoQuebrachoInkworksMechanism';

interface TaninoQuebrachoProcessAnatomyProps {
  pasos: PasoProceso[];
  exportQuebracho2024T: number | null;
}

export function TaninoQuebrachoProcessAnatomy({
  pasos,
  exportQuebracho2024T,
}: TaninoQuebrachoProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Planta de Extracto de Quebracho Formosa (Unitán)"
      exportPrefix="tanino-quebracho-formosa"
      canvasAriaLabel="Simulación 3D interactiva de la extracción sólido-líquido, evaporación al vacío y secado spray de extracto de quebracho en Formosa"
      phases={TANINO_PHASES}
      overviewCamera={TANINO_OVERVIEW_CAMERA}
      calloutsMeta={TANINO_CALLOUT_META}
      buildMechanism={buildTaninoQuebrachoMechanism}
      pasos={pasos}
      cycleDeg={TANINO_CYCLE_DEG}
      kpis={[
        { label: 'Difusión presurizada', value: '110 °C · 2 bar', accentClass: 'text-cobalt' },
        { label: 'Secado spray', value: '170 °C (<7% H2O)', accentClass: 'text-emerald-react' },
        {
          label: 'Exp. HS 3201.10 (24)',
          value:
            exportQuebracho2024T !== null
              ? `${Math.round(exportQuebracho2024T).toLocaleString('es-AR')} t`
              : 's/d',
        },
      ]}
    />
  );
}
