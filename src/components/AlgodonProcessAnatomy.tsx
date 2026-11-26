import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  ALGODON_CALLOUT_META,
  ALGODON_CYCLE_DEG,
  ALGODON_OVERVIEW_CAMERA,
  ALGODON_PHASES,
  buildAlgodonMechanism,
} from './algodon/algodonInkworksMechanism';

interface AlgodonProcessAnatomyProps {
  pasos: PasoProceso[];
  produccionChacoT: number | null;
  exportacionFibraT: number | null;
}

export function AlgodonProcessAnatomy({
  pasos,
  produccionChacoT,
  exportacionFibraT,
}: AlgodonProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Desmotadora y refinación textil (Chaco)"
      exportPrefix="algodon-chaco"
      canvasAriaLabel="Simulación 3D interactiva del desmote y refinación de fibra de algodón en Chaco"
      phases={ALGODON_PHASES}
      overviewCamera={ALGODON_OVERVIEW_CAMERA}
      calloutsMeta={ALGODON_CALLOUT_META}
      buildMechanism={buildAlgodonMechanism}
      pasos={pasos}
      cycleDeg={ALGODON_CYCLE_DEG}
      kpis={[
        {
          label: 'Chaco (2024/25)',
          value:
            produccionChacoT !== null
              ? `${Math.round(produccionChacoT / 1000).toLocaleString('es-AR')} kt`
              : 's/d',
        },
        {
          label: 'Rendimiento fibra',
          value: '1,0 t / 3,0 t',
          accentClass: 'text-ochre-metal',
        },
        {
          label: 'Exp. fibra (2024)',
          value:
            exportacionFibraT !== null
              ? `${Math.round(exportacionFibraT / 1000).toLocaleString('es-AR')} kt`
              : 's/d',
          accentClass: 'text-emerald-react',
        },
      ]}
    />
  );
}
