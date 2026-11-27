import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  RESINA_CALLOUT_META,
  RESINA_CYCLE_DEG,
  RESINA_OVERVIEW_CAMERA,
  RESINA_PHASES,
  buildResinaColofoniaMechanism,
} from './resina-colofonia/resinaColofoniaInkworksMechanism';

interface ResinaColofoniaProcessAnatomyProps {
  pasos: PasoProceso[];
  exportColofonia2024T: number | null;
}

export function ResinaColofoniaProcessAnatomy({
  pasos,
  exportColofonia2024T,
}: ResinaColofoniaProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Planta Resinera Gobernador Virasoro (Corrientes)"
      exportPrefix="resina-colofonia-corrientes"
      canvasAriaLabel="Simulación 3D interactiva de la destilación de oleorresina de pino a colofonia y trementina en Gobernador Virasoro, Corrientes"
      phases={RESINA_PHASES}
      overviewCamera={RESINA_OVERVIEW_CAMERA}
      calloutsMeta={RESINA_CALLOUT_META}
      buildMechanism={buildResinaColofoniaMechanism}
      pasos={pasos}
      cycleDeg={RESINA_CYCLE_DEG}
      kpis={[
        { label: 'Miera declarada', value: '13.000 t/año', accentClass: 'text-emerald-react' },
        { label: 'Destilación vapor', value: '175 °C · C20H30O2', accentClass: 'text-cobalt' },
        {
          label: 'Exp. colofonia (24)',
          value:
            exportColofonia2024T !== null
              ? `${Math.round(exportColofonia2024T).toLocaleString('es-AR')} t`
              : 's/d',
        },
      ]}
    />
  );
}
