import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  OLIVA_CALLOUT_META,
  OLIVA_CYCLE_DEG,
  OLIVA_OVERVIEW_CAMERA,
  OLIVA_PHASES,
  buildAceiteOlivaMechanism,
} from './aceite-oliva/aceiteOlivaInkworksMechanism';

interface AceiteOlivaProcessAnatomyProps {
  pasos: PasoProceso[];
  exportOliva2024T: number | null;
}

export function AceiteOlivaProcessAnatomy({
  pasos,
  exportOliva2024T,
}: AceiteOlivaProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Complejo Olivícola Vichigasta y Aimogasta (La Rioja)"
      exportPrefix="aceite-oliva-la-rioja"
      canvasAriaLabel="Simulación 3D interactiva de la extracción continua en frío de dos fases de aceite de oliva virgen extra en La Rioja"
      phases={OLIVA_PHASES}
      overviewCamera={OLIVA_OVERVIEW_CAMERA}
      calloutsMeta={OLIVA_CALLOUT_META}
      buildMechanism={buildAceiteOlivaMechanism}
      pasos={pasos}
      cycleDeg={OLIVA_CYCLE_DEG}
      kpis={[
        { label: 'Extracción en frío', value: '<= 27 °C · 2 fases', accentClass: 'text-emerald-react' },
        { label: 'Calidad AOVE', value: 'Acidez <= 0,8%', accentClass: 'text-cobalt' },
        {
          label: 'Exp. HS 1509.20 (24)',
          value:
            exportOliva2024T !== null
              ? `${Math.round(exportOliva2024T).toLocaleString('es-AR')} t`
              : 's/d',
        },
      ]}
    />
  );
}
