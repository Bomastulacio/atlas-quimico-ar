import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  GLP_CALLOUT_META,
  GLP_CYCLE_DEG,
  GLP_OVERVIEW_CAMERA,
  GLP_PHASES,
  buildGlpGasNaturalMechanism,
} from './glp-gas-natural/glpGasNaturalInkworksMechanism';

interface GlpGasNaturalProcessAnatomyProps {
  pasos: PasoProceso[];
  exportPropano2024T: number | null;
}

export function GlpGasNaturalProcessAnatomy({
  pasos,
  exportPropano2024T,
}: GlpGasNaturalProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Planta Río Cullen / Cañadón Alfa (Río Grande, Tierra del Fuego)"
      exportPrefix="glp-cuenca-austral-tdf"
      canvasAriaLabel="Simulación 3D interactiva del acondicionamiento criogénico de gas natural y fraccionamiento de GLP en Tierra del Fuego"
      phases={GLP_PHASES}
      overviewCamera={GLP_OVERVIEW_CAMERA}
      calloutsMeta={GLP_CALLOUT_META}
      buildMechanism={buildGlpGasNaturalMechanism}
      pasos={pasos}
      cycleDeg={GLP_CYCLE_DEG}
      kpis={[
        { label: 'Turbo-expansión', value: '-95 °C · 30 bar', accentClass: 'text-cobalt' },
        { label: 'Deshidratación', value: '<0,1 ppmv H2O', accentClass: 'text-emerald-react' },
        {
          label: 'Exp. C3 país (24)',
          value:
            exportPropano2024T !== null
              ? `${Math.round(exportPropano2024T).toLocaleString('es-AR')} t`
              : 's/d',
        },
      ]}
    />
  );
}
