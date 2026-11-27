import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  FARMA_CALLOUT_META,
  FARMA_CYCLE_DEG,
  FARMA_OVERVIEW_CAMERA,
  FARMA_PHASES,
  buildFarmoquimicaIfaMechanism,
} from './farmoquimica-ifa/farmoquimicaIfaInkworksMechanism';

interface FarmoquimicaIfaProcessAnatomyProps {
  pasos: PasoProceso[];
  exportFarma2024UsdM: number | null;
}

export function FarmoquimicaIfaProcessAnatomy({
  pasos,
  exportFarma2024UsdM,
}: FarmoquimicaIfaProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Planta Química de APIs Mataderos (Comuna 9, CABA)"
      exportPrefix="farmoquimica-ifa-caba"
      canvasAriaLabel="Simulación 3D interactiva de la síntesis orgánica fina GMP, recuperación de solventes, cristalización y secado al vacío de principios activos en CABA"
      phases={FARMA_PHASES}
      overviewCamera={FARMA_OVERVIEW_CAMERA}
      calloutsMeta={FARMA_CALLOUT_META}
      buildMechanism={buildFarmoquimicaIfaMechanism}
      pasos={pasos}
      cycleDeg={FARMA_CYCLE_DEG}
      kpis={[
        { label: 'Estándar síntesis', value: 'GMP · ANMAT / FDA', accentClass: 'text-cobalt' },
        { label: 'Pureza principio activo', value: '>= 99,5% (HPLC)', accentClass: 'text-emerald-react' },
        {
          label: 'Exp. HS 3004.90 (24)',
          value:
            exportFarma2024UsdM !== null
              ? `USD ${exportFarma2024UsdM.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`
              : 's/d',
        },
      ]}
    />
  );
}
