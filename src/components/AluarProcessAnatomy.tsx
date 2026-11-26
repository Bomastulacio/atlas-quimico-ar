import type { PasoProceso } from '@/schemas';
import { ProcessAnatomy3DPlayer } from './ProcessAnatomy3DPlayer';
import {
  ALUAR_CYCLE_DEG,
  ALUAR_OVERVIEW_CAMERA,
  ALUAR_PHASES,
  buildAluarMechanism,
} from './aluar/aluarInkworksMechanism';

interface AluarProcessAnatomyProps {
  pasos: PasoProceso[];
  produccionLiquidaT: number | null;
  aluminaImportadaT: number | null;
  energiaElectrolisisMwhT: number | null;
}

const ALUAR_CALLOUT_META = [
  {
    n: 1,
    name: 'Buque granelero en Golfo Nuevo',
    description: 'Trae alúmina calcinada (Al2O3) importada de Australia y Brasil hasta el Muelle Storni.',
    phaseIndex: 0,
  },
  {
    n: 2,
    name: 'Grúa succionadora y conducto cerrado',
    description: 'Aspira la alúmina desde las bodegas y la transporta por cinta hermética sobre pilotes.',
    phaseIndex: 0,
  },
  {
    n: 3,
    name: 'Silos cónicos de alúmina',
    description: 'Almacenan el polvo seco de Al2O3 y alimentan por cañería neumática a la sala de cubas.',
    phaseIndex: 0,
  },
  {
    n: 4,
    name: 'Horno de cocción de ánodos',
    description: 'Hornea bloques prensados de coque de petróleo y brea a 1.150 °C durante días.',
    phaseIndex: 1,
  },
  {
    n: 5,
    name: 'Monorriel de ánodos envarillados',
    description: 'Traslada cada ánodo con su varilla conductora de aluminio-cobre hacia las cubas.',
    phaseIndex: 1,
  },
  {
    n: 6,
    name: 'Barras DC y pistones rompe-costra',
    description: 'Inyectan corriente continua y perforan la costra superior para dosificar Al2O3 al baño.',
    phaseIndex: 2,
  },
  {
    n: 7,
    name: 'Baño de criolita (960 °C) y aluminio líquido',
    description: 'La alúmina se disuelve en criolita fundida y el aluminio puro se deposita en el fondo.',
    phaseIndex: 2,
  },
  {
    n: 8,
    name: 'Ducto de gases y ciclones GTC',
    description: 'Aspiran CO2 y fluoruros (HF) de la cuba y retienen más del 99% en filtros secos.',
    phaseIndex: 3,
  },
  {
    n: 9,
    name: 'Retorno de alúmina fluorada',
    description: 'Devuelve el polvo enriquecido con flúor desde GTC directo a la tolva de la cuba.',
    phaseIndex: 3,
  },
  {
    n: 10,
    name: 'Crisol de sifonado al vacío',
    description: 'Succiona aluminio líquido del fondo de la cuba y lo traslada sobre vía hasta fundición.',
    phaseIndex: 4,
  },
  {
    n: 11,
    name: 'Horno de mantenimiento y canal de colada',
    description: 'Ajusta la aleación a 720 °C y dosifica el metal fundido hacia los moldes refrigerados.',
    phaseIndex: 4,
  },
  {
    n: 12,
    name: 'Lingotes T, barrotes y alambrón',
    description: 'Formatos sólidos terminados listos para industria local o exportación desde el mismo puerto.',
    phaseIndex: 4,
  },
] as const;

export function AluarProcessAnatomy({
  pasos,
  produccionLiquidaT,
  aluminaImportadaT,
  energiaElectrolisisMwhT,
}: AluarProcessAnatomyProps) {
  return (
    <ProcessAnatomy3DPlayer
      plantTitle="Planta Aluar (Puerto Madryn, Chubut)"
      exportPrefix="aluar-puerto-madryn"
      canvasAriaLabel="Simulación 3D interactiva del circuito electrolítico Hall-Héroult en Aluar Puerto Madryn"
      phases={ALUAR_PHASES}
      overviewCamera={ALUAR_OVERVIEW_CAMERA}
      calloutsMeta={ALUAR_CALLOUT_META}
      buildMechanism={buildAluarMechanism}
      pasos={pasos}
      cycleDeg={ALUAR_CYCLE_DEG}
      kpis={[
        {
          label: 'Alúmina (2024)',
          value:
            aluminaImportadaT !== null
              ? `${Math.round(aluminaImportadaT / 1000).toLocaleString('es-AR')} kt`
              : 'Sin datos',
        },
        {
          label: 'Energía cubas',
          value:
            energiaElectrolisisMwhT !== null
              ? `${energiaElectrolisisMwhT.toLocaleString('es-AR', { minimumFractionDigits: 2 })} MWh/t`
              : 'Sin datos',
          accentClass: 'text-cobalt',
        },
        {
          label: 'Aluminio (FY25)',
          value:
            produccionLiquidaT !== null
              ? `${Math.round(produccionLiquidaT / 1000).toLocaleString('es-AR')} kt`
              : 'Sin datos',
        },
      ]}
    />
  );
}
