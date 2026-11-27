import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  GALVANIZADO_CALLOUT_META,
  GALVANIZADO_CYCLE_DEG,
  GALVANIZADO_OVERVIEW_CAMERA,
  GALVANIZADO_PHASES,
  buildGalvanizadoCalienteMechanism,
} from './galvanizado-caliente/galvanizadoCalienteInkworksMechanism';

interface GalvanizadoCalienteProcessAnatomyProps {
  pasos: PasoProceso[];
  importZinc2024UsdM: number | null;
}

export function GalvanizadoCalienteProcessAnatomy({
  pasos,
  importZinc2024UsdM,
}: GalvanizadoCalienteProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Planta Druetta Hnos. S.A. · General Rodríguez (Buenos Aires)"
      exportPrefix="galvanizado-caliente-druetta"
      canvasAriaLabel="Simulación 3D interactiva del proceso de galvanizado por inmersión en caliente en baño de zinc fundido a 450 °C en General Rodríguez, Buenos Aires"
      phases={GALVANIZADO_PHASES}
      overviewCamera={GALVANIZADO_OVERVIEW_CAMERA}
      calloutsMeta={GALVANIZADO_CALLOUT_META}
      buildMechanism={buildGalvanizadoCalienteMechanism}
      pasos={pasos}
      cycleDeg={GALVANIZADO_CYCLE_DEG}
      kpis={[
        { label: 'Cuba principal Zn', value: '13,0 x 1,8 x 3,0 m', accentClass: 'text-cobalt' },
        { label: 'Baño fundido', value: '450 °C · ISO 9001/14001', accentClass: 'text-emerald-react' },
        {
          label: 'Imp. AR Zn SHG (24)',
          value:
            importZinc2024UsdM !== null
              ? `USD ${importZinc2024UsdM.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`
              : 's/d',
        },
      ]}
    />
  );
}
