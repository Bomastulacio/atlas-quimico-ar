import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  CEMENTO_CALLOUT_META,
  CEMENTO_CYCLE_DEG,
  CEMENTO_OVERVIEW_CAMERA,
  CEMENTO_PHASES,
  buildCementoClinkerMechanism,
} from './cemento-clinker/cementoClinkerInkworksMechanism';

interface CementoClinkerProcessAnatomyProps {
  pasos: PasoProceso[];
}

export function CementoClinkerProcessAnatomy({ pasos }: CementoClinkerProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Planta Cementera Integrada La Calera (Depto. Belgrano, San Luis)"
      exportPrefix="cemento-clinker-san-luis"
      canvasAriaLabel="Simulación 3D interactiva de la clinkerización vía seca con precalcinador y molienda de cemento Portland en La Calera, San Luis"
      phases={CEMENTO_PHASES}
      overviewCamera={CEMENTO_OVERVIEW_CAMERA}
      calloutsMeta={CEMENTO_CALLOUT_META}
      buildMechanism={buildCementoClinkerMechanism}
      pasos={pasos}
      cycleDeg={CEMENTO_CYCLE_DEG}
      kpis={[
        { label: 'Zona de clinkerización', value: '1.450 °C', accentClass: 'text-signal-red' },
        { label: 'CO2 proceso (IPCC)', value: '0,52 t/t clínker', accentClass: 'text-cobalt' },
        { label: 'Relación crudo/clínker', value: '1,56 t/t', accentClass: 'text-emerald-react' },
      ]}
    />
  );
}
