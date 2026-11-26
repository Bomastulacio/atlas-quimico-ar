import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  CELULOSA_KRAFT_CALLOUT_META,
  CELULOSA_KRAFT_CYCLE_DEG,
  CELULOSA_KRAFT_OVERVIEW_CAMERA,
  CELULOSA_KRAFT_PHASES,
  buildCelulosaKraftMechanism,
} from './celulosa-kraft/celulosaKraftInkworksMechanism';

interface CelulosaKraftProcessAnatomyProps {
  pasos: PasoProceso[];
  importVol2024T: number | null;
}

export function CelulosaKraftProcessAnatomy({
  pasos,
  importVol2024T,
}: CelulosaKraftProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Planta Celulosa Kraft (Puerto Esperanza, Misiones)"
      exportPrefix="celulosa-kraft-misiones"
      canvasAriaLabel="Simulación 3D interactiva del proceso Kraft al sulfato con blanqueo ECF y recuperación cerrada de licor blanco en Misiones"
      phases={CELULOSA_KRAFT_PHASES}
      overviewCamera={CELULOSA_KRAFT_OVERVIEW_CAMERA}
      calloutsMeta={CELULOSA_KRAFT_CALLOUT_META}
      buildMechanism={buildCelulosaKraftMechanism}
      pasos={pasos}
      cycleDeg={CELULOSA_KRAFT_CYCLE_DEG}
      kpis={[
        { label: 'Chips pino / ADt', value: '2,10 t seca', accentClass: 'text-ochre-metal' },
        { label: 'Reciclo licor blanco', value: '>96% cerrado', accentClass: 'text-emerald-react' },
        {
          label: 'Imp. HS 4703.21 (24)',
          value:
            importVol2024T !== null
              ? `${Math.round(importVol2024T).toLocaleString('es-AR')} t`
              : 's/d',
          accentClass: 'text-cobalt',
        },
      ]}
    />
  );
}
