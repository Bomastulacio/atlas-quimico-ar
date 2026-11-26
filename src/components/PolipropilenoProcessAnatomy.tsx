import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  POLIPROPILENO_CALLOUT_META,
  POLIPROPILENO_CYCLE_DEG,
  POLIPROPILENO_OVERVIEW_CAMERA,
  POLIPROPILENO_PHASES,
  buildPolipropilenoMechanism,
} from './polipropileno/polipropilenoInkworksMechanism';

interface PolipropilenoProcessAnatomyProps {
  pasos: PasoProceso[];
  exportVol2024T: number | null;
}

export function PolipropilenoProcessAnatomy({
  pasos,
  exportVol2024T,
}: PolipropilenoProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Polo Luján de Cuyo (FCC y Polipropileno, Mendoza)"
      exportPrefix="polipropileno-mendoza"
      canvasAriaLabel="Simulación 3D interactiva del polo de refinación y polipropileno en Luján de Cuyo, Mendoza"
      phases={POLIPROPILENO_PHASES}
      overviewCamera={POLIPROPILENO_OVERVIEW_CAMERA}
      calloutsMeta={POLIPROPILENO_CALLOUT_META}
      buildMechanism={buildPolipropilenoMechanism}
      pasos={pasos}
      cycleDeg={POLIPROPILENO_CYCLE_DEG}
      kpis={[
        { label: 'Pureza C3H6', value: '>99,5% polím.', accentClass: 'text-cobalt' },
        { label: 'Reactor Z-N', value: '75 °C · 32 bar', accentClass: 'text-emerald-react' },
        {
          label: 'Exp. PP (2024)',
          value:
            exportVol2024T !== null
              ? `${Math.round(exportVol2024T / 1000).toLocaleString('es-AR')} kt`
              : 's/d',
        },
      ]}
    />
  );
}
