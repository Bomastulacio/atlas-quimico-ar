import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  SAL_CALLOUT_META,
  SAL_CYCLE_DEG,
  SAL_OVERVIEW_CAMERA,
  SAL_PHASES,
  buildSalIndustrialMechanism,
} from './sal-industrial/salIndustrialInkworksMechanism';

interface SalIndustrialProcessAnatomyProps {
  pasos: PasoProceso[];
  exportVol2024T: number | null;
}

export function SalIndustrialProcessAnatomy({
  pasos,
  exportVol2024T,
}: SalIndustrialProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Salinas Grandes de Hidalgo (Depto. Atreucó, La Pampa)"
      exportPrefix="sal-industrial-la-pampa"
      canvasAriaLabel="Simulación 3D interactiva de la cosecha evaporítica, lavado contracorriente y refinación de sal industrial NaCl en La Pampa"
      phases={SAL_PHASES}
      overviewCamera={SAL_OVERVIEW_CAMERA}
      calloutsMeta={SAL_CALLOUT_META}
      buildMechanism={buildSalIndustrialMechanism}
      pasos={pasos}
      cycleDeg={SAL_CYCLE_DEG}
      kpis={[
        { label: 'Pureza NaCl seca', value: '>99,3% base seca', accentClass: 'text-cobalt' },
        { label: 'Humedad final', value: '<0,15% H2O', accentClass: 'text-emerald-react' },
        {
          label: 'Exp. HS 2501 (24)',
          value:
            exportVol2024T !== null
              ? `${Math.round(exportVol2024T).toLocaleString('es-AR')} t`
              : 's/d',
        },
      ]}
    />
  );
}
