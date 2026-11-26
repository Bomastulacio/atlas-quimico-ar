import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  BIOETANOL_MAIZ_CALLOUT_META,
  BIOETANOL_MAIZ_CYCLE_DEG,
  BIOETANOL_MAIZ_OVERVIEW_CAMERA,
  BIOETANOL_MAIZ_PHASES,
  buildBioetanolMaizMechanism,
} from './bioetanol-maiz/bioetanolMaizInkworksMechanism';

interface BioetanolMaizProcessAnatomyProps {
  pasos: PasoProceso[];
  maizCordobaT: number | null;
  bioetanolPaisM3: number | null;
}

export function BioetanolMaizProcessAnatomy({
  pasos,
  maizCordobaT,
  bioetanolPaisM3,
}: BioetanolMaizProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Biorrefinería de Maíz (Río Cuarto / Villa María, Córdoba)"
      exportPrefix="bioetanol-maiz-cordoba"
      canvasAriaLabel="Simulación 3D interactiva de molienda seca de maíz a bioetanol y burlanda en Córdoba"
      phases={BIOETANOL_MAIZ_PHASES}
      overviewCamera={BIOETANOL_MAIZ_OVERVIEW_CAMERA}
      calloutsMeta={BIOETANOL_MAIZ_CALLOUT_META}
      buildMechanism={buildBioetanolMaizMechanism}
      pasos={pasos}
      cycleDeg={BIOETANOL_MAIZ_CYCLE_DEG}
      kpis={[
        {
          label: 'Maíz Córdoba (24/25)',
          value:
            maizCordobaT !== null
              ? `${(maizCordobaT / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} Mt`
              : 's/d',
          accentClass: 'text-ochre-metal',
        },
        {
          label: 'Bioetanol maíz (2020)',
          value:
            bioetanolPaisM3 !== null
              ? `${Math.round(bioetanolPaisM3 / 1000).toLocaleString('es-AR')} km3`
              : 's/d',
          accentClass: 'text-emerald-react',
        },
        { label: 'Coproducto DDGS', value: '0,97 t/t et.', accentClass: 'text-cobalt' },
      ]}
    />
  );
}
