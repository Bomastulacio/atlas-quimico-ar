import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  BIOETANOL_CANA_CALLOUT_META,
  BIOETANOL_CANA_CYCLE_DEG,
  BIOETANOL_CANA_OVERVIEW_CAMERA,
  BIOETANOL_CANA_PHASES,
  buildBioetanolCanaMechanism,
} from './bioetanol-cana/bioetanolCanaInkworksMechanism';

interface BioetanolCanaProcessAnatomyProps {
  pasos: PasoProceso[];
  bioetanolCanaM3: number | null;
  azucarExp2024T: number | null;
}

export function BioetanolCanaProcessAnatomy({
  pasos,
  bioetanolCanaM3,
  azucarExp2024T,
}: BioetanolCanaProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Complejo Sucroalcoholero (Cruz Alta, Tucumán)"
      exportPrefix="bioetanol-cana-tucuman"
      canvasAriaLabel="Simulación 3D interactiva del complejo sucroalcoholero de caña de azúcar y bioetanol en Tucumán"
      phases={BIOETANOL_CANA_PHASES}
      overviewCamera={BIOETANOL_CANA_OVERVIEW_CAMERA}
      calloutsMeta={BIOETANOL_CANA_CALLOUT_META}
      buildMechanism={buildBioetanolCanaMechanism}
      pasos={pasos}
      cycleDeg={BIOETANOL_CANA_CYCLE_DEG}
      kpis={[
        {
          label: 'Bioetanol caña (2020)',
          value:
            bioetanolCanaM3 !== null
              ? `${Math.round(bioetanolCanaM3 / 1000).toLocaleString('es-AR')} km3`
              : 's/d',
          accentClass: 'text-emerald-react',
        },
        { label: 'Bagazo cogeneración', value: '4,1 t/t et.', accentClass: 'text-ochre-metal' },
        {
          label: 'Exp. azúcar (2024)',
          value:
            azucarExp2024T !== null
              ? `${Math.round(azucarExp2024T / 1000).toLocaleString('es-AR')} kt`
              : 's/d',
          accentClass: 'text-cobalt',
        },
      ]}
    />
  );
}
