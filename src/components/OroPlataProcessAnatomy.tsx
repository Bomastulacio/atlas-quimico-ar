import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  ORO_PLATA_CALLOUT_META,
  ORO_PLATA_CYCLE_DEG,
  ORO_PLATA_OVERVIEW_CAMERA,
  ORO_PLATA_PHASES,
  buildOroPlataMechanism,
} from './oro-plata/oroPlataInkworksMechanism';

interface OroPlataProcessAnatomyProps {
  pasos: PasoProceso[];
  prodPlata2024T: number | null;
  exportOro2024UsdM: number | null;
}

export function OroPlataProcessAnatomy({
  pasos,
  prodPlata2024T,
  exportOro2024UsdM,
}: OroPlataProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Macizo del Deseado (Lixiviación y Doré, Santa Cruz)"
      exportPrefix="oro-plata-santa-cruz"
      canvasAriaLabel="Simulación 3D interactiva del circuito de molienda, lixiviación cianurada, Merrill-Crowe, fundición doré y detoxificación INCO en Santa Cruz"
      phases={ORO_PLATA_PHASES}
      overviewCamera={ORO_PLATA_OVERVIEW_CAMERA}
      calloutsMeta={ORO_PLATA_CALLOUT_META}
      buildMechanism={buildOroPlataMechanism}
      pasos={pasos}
      cycleDeg={ORO_PLATA_CYCLE_DEG}
      kpis={[
        {
          label: 'Exp. oro HS 7108 (24)',
          value:
            exportOro2024UsdM !== null
              ? `USD ${Math.round(exportOro2024UsdM).toLocaleString('es-AR')} M`
              : 's/d',
          accentClass: 'text-ochre-metal',
        },
        {
          label: 'Plata país (USGS 24e)',
          value: prodPlata2024T !== null ? `${Math.round(prodPlata2024T)} t Ag` : 's/d',
          accentClass: 'text-cobalt',
        },
        { label: 'Detox relaves', value: 'INCO SO2/aire', accentClass: 'text-emerald-react' },
      ]}
    />
  );
}
