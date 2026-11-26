import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  CAL_INDUSTRIAL_CALLOUT_META,
  CAL_INDUSTRIAL_CYCLE_DEG,
  CAL_INDUSTRIAL_OVERVIEW_CAMERA,
  CAL_INDUSTRIAL_PHASES,
  buildCalIndustrialMechanism,
} from './cal-industrial/calIndustrialInkworksMechanism';

interface CalIndustrialProcessAnatomyProps {
  pasos: PasoProceso[];
  exportVol2024T: number | null;
}

export function CalIndustrialProcessAnatomy({
  pasos,
  exportVol2024T,
}: CalIndustrialProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Polo Calero Los Berros (Hornos PFRK, San Juan)"
      exportPrefix="cal-industrial-san-juan"
      canvasAriaLabel="Simulación 3D interactiva de calcinación de caliza en hornos regenerativos PFRK en Los Berros, San Juan"
      phases={CAL_INDUSTRIAL_PHASES}
      overviewCamera={CAL_INDUSTRIAL_OVERVIEW_CAMERA}
      calloutsMeta={CAL_INDUSTRIAL_CALLOUT_META}
      buildMechanism={buildCalIndustrialMechanism}
      pasos={pasos}
      cycleDeg={CAL_INDUSTRIAL_CYCLE_DEG}
      kpis={[
        { label: 'Caliza por t CaO', value: '1,80 t/t', accentClass: 'text-ochre-metal' },
        { label: 'Factor IPCC CO2', value: '0,785 t/t', accentClass: 'text-signal-red' },
        {
          label: 'Exp. cal viva (2024)',
          value:
            exportVol2024T !== null
              ? `${Math.round(exportVol2024T / 1000).toLocaleString('es-AR')} kt`
              : 's/d',
          accentClass: 'text-emerald-react',
        },
      ]}
    />
  );
}
