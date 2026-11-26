import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  CITRICOS_CALLOUT_META,
  CITRICOS_CYCLE_DEG,
  CITRICOS_OVERVIEW_CAMERA,
  CITRICOS_PHASES,
  buildCitricosLimonenoMechanism,
} from './citricos-limoneno/citricosLimonenoInkworksMechanism';

interface CitricosLimonenoProcessAnatomyProps {
  pasos: PasoProceso[];
  exportJugo2024T: number | null;
}

export function CitricosLimonenoProcessAnatomy({
  pasos,
  exportJugo2024T,
}: CitricosLimonenoProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Polo Industrial Citrícola de Concordia (Entre Ríos)"
      exportPrefix="citricos-limoneno-entre-rios"
      canvasAriaLabel="Simulación 3D interactiva de la extracción en frío de D-limoneno, evaporación TASTE de jugo concentrado y secado de cáscara en Concordia, Entre Ríos"
      phases={CITRICOS_PHASES}
      overviewCamera={CITRICOS_OVERVIEW_CAMERA}
      calloutsMeta={CITRICOS_CALLOUT_META}
      buildMechanism={buildCitricosLimonenoMechanism}
      pasos={pasos}
      cycleDeg={CITRICOS_CYCLE_DEG}
      kpis={[
        { label: 'D-limoneno C10H16', value: '>90% en aceite', accentClass: 'text-emerald-react' },
        { label: 'Concentrado TASTE', value: '65 °Brix (-18 °C)', accentClass: 'text-cobalt' },
        {
          label: 'Exp. jugo 2009.11 (24)',
          value:
            exportJugo2024T !== null
              ? `${Math.round(exportJugo2024T).toLocaleString('es-AR')} t`
              : 's/d',
        },
      ]}
    />
  );
}
