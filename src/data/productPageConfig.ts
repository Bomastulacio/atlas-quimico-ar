import type { Producto } from '@/schemas';
import type { FichaProducto } from './index';

export interface ProductKpiCard {
  label: string;
  value: string;
  sublabel: string;
  valueClass?: string;
}

export interface ProductAnatomyHeader {
  title: string;
  description: string;
  hint: string;
}

export interface ProductPageDerivedView {
  seoTitle: string;
  seoDescription: string;
  badgeBgClass: string;
  formulaTextClass: string;
  jurisdiccionLine: string;
  kpis: ProductKpiCard[];
  anatomy?: ProductAnatomyHeader;
  diagramTitle: string;
  diagramDescription: string;
  diagramBadge?: { label: string; strong: string };
  procesoMetaById?: Record<string, { etiqueta: string; ubicacion: string }>;
  ncmLabels: Record<string, string>;
  sinDatosProduccionExplicacion?: string;
}

const CATEGORY_STYLE: Record<
  Producto['categoria'],
  { bg: string; text: string }
> = {
  metalurgia: { bg: 'bg-cobalt', text: 'text-cobalt' },
  fertilizantes: { bg: 'bg-cobalt', text: 'text-cobalt' },
  mineria_quimica: { bg: 'bg-emerald-react', text: 'text-emerald-react' },
  bioenergia: { bg: 'bg-emerald-react', text: 'text-emerald-react' },
  agroindustria: { bg: 'bg-ochre-metal', text: 'text-ochre-metal' },
  petroquimica: { bg: 'bg-signal-red', text: 'text-signal-red' },
};

const ANATOMY_BY_PRODUCT: Record<string, ProductAnatomyHeader> = {
  aluminio: {
    title: 'Circuito 3D en movimiento en Aluar (Puerto Madryn)',
    description:
      'Lámina técnica interactiva en 3D desde el Golfo Nuevo y el Muelle Almirante Storni hasta la fundición: muestra cómo viaja la alúmina por succión neumática a los silos, el monorriel de ánodos, el interior de la cuba Hall-Héroult, el reciclo GTC y el crisol de sifonado hacia colada.',
    hint: 'Orbitá en 3D, arrastrá el ciclo 0° a 360° o grabá un clip WebM a 60 fps',
  },
  algodon: {
    title: 'Circuito 3D en movimiento en Chaco (Las Breñas y polo algodonero)',
    description:
      'Lámina técnica interactiva en 3D desde los módulos de algodón en bruto hasta la hilatura textil: muestra la succión neumática y secado, el banco de sierras desmotadoras que separa fibra (1,0 t) y semilla (1,7 t), la prensa hidráulica HVI y el blanqueo libre de cloro con H2O2.',
    hint: 'Orbitá en 3D, cambiá de paso o grabá un clip WebM a 60 fps',
  },
  metanol: {
    title: 'Circuito 3D en movimiento en Neuquén (Plaza Huincul)',
    description:
      'Lámina interactiva en 3D del proceso gas-químico: desulfuración ZnO, horno reformador SMR a 850 °C, compresión de syngas a 65 bar, reactor catalítico Cu/ZnO con reciclo cerrado y destilación grado AA.',
    hint: 'Orbitá en 3D, cambiá de etapa o grabá un clip WebM a 60 fps',
  },
  polipropileno: {
    title: 'Circuito 3D en movimiento en Mendoza (Luján de Cuyo)',
    description:
      'Lámina interactiva en 3D desde el craqueo catalítico fluido FCC de refinería y el splitter C3 hasta la polimerización fase gas Ziegler-Natta, reciclo de monómero y extrusión de pellets de polipropileno.',
    hint: 'Orbitá en 3D, cambiá de etapa o grabá un clip WebM a 60 fps',
  },
  'bioetanol-maiz': {
    title: 'Circuito 3D en movimiento en Córdoba (Río Cuarto y Villa María)',
    description:
      'Lámina interactiva en 3D de una biorrefinería de molienda seca: silos y molino de martillos, hidrólisis enzimática a 95 °C, fermentación cerrada con captura de CO2, tamices moleculares 3A y centrifugado de burlanda proteica DDGS.',
    hint: 'Orbitá en 3D, cambiá de etapa o grabá un clip WebM a 60 fps',
  },
  'bioetanol-cana': {
    title: 'Circuito 3D en movimiento en Tucumán (Depto. Cruz Alta)',
    description:
      'Lámina interactiva en 3D del complejo sucroalcoholero: tandem de trapiches, clarificación y tacho de azúcar flexible, fermentación rápida con reciclo de levaduras, destilería 3A y caldera de cogeneración a bagazo.',
    hint: 'Orbitá en 3D, cambiá de etapa o grabá un clip WebM a 60 fps',
  },
};

const PROCESO_META_BY_PRODUCT: Record<
  string,
  Record<string, { etiqueta: string; ubicacion: string }>
> = {
  litio: {
    'litio-salmuera-carbonatacion': {
      etiqueta: 'Evaporación solar + carbonatación (Olaroz)',
      ubicacion: 'Salar de Olaroz, Susques (Jujuy)',
    },
    'litio-dle-adsorcion': {
      etiqueta: 'Extracción Directa de Litio por adsorción (DLE)',
      ubicacion: 'Fénix (Catamarca) y Rincón (Salta)',
    },
  },
  petroquimica: {
    'petroquimica-steam-cracking-polietileno': {
      etiqueta: 'Steam Cracking de etano a Polietileno',
      ubicacion: 'Complejo Dow Bahía Blanca (LDPE / LLDPE / HDPE)',
    },
    'petroquimica-cloro-alcali-pvc': {
      etiqueta: 'Cloro-Álcali membrana a EDC / MVC / PVC',
      ubicacion: 'Complejo Unipar Indupa Bahía Blanca (NaOH + PVC)',
    },
  },
};

const NCM_LABELS: Record<string, string> = {
  '76': 'Capítulo 76 NCM (Aluminio y sus manufacturas)',
  '2818.20': 'Alúmina calcinada importada (HS 2818.20)',
  '2836.91': 'Carbonato de litio (HS 2836.91)',
  '3102.10': 'Urea incluso en disolución acuosa (HS 3102.10)',
  '3901.10': 'Polietileno baja densidad / lineal (HS 3901.10)',
  '3901.20': 'Polietileno alta densidad (HS 3901.20)',
  '3904.10': 'Policloruro de vinilo sin mezclar (HS 3904.10)',
  '2304.00': 'Harina y pellets de soja (HS 2304.00)',
  '1507.10': 'Aceite crudo de soja (HS 1507.10)',
  '1201.90': 'Poroto de soja (HS 1201.90)',
  '3826.00': 'Biodiésel FAME y sus mezclas (HS 3826.00)',
  '5201.00': 'Fibra de algodón sin cardar ni peinar (HS 5201.00)',
  '2905.11': 'Metanol / alcohol metílico (HS 2905.11)',
  '3902.10': 'Polipropileno en formas primarias (HS 3902.10)',
  '2207.10': 'Alcohol etílico sin desnaturalizar >=80% vol (HS 2207.10)',
  '1701.99': 'Azúcar de caña refinada (HS 1701.99)',
};

const SIN_DATOS_PRODUCCION_COPY: Record<string, string> = {
  petroquimica:
    'El dataset público histórico de petroquímica se interrumpió y el recurso CKAN equivalente presentó inconsistencias de origen descartadas en auditoría. Se informan flujos aduaneros verificados UN Comtrade.',
  metanol:
    'El Complejo Industrial Plaza Huincul (YPF) concentra la síntesis argentina de metanol desde gas natural neuquino para biodiésel y resinas locales. Al no publicarse series anuales abiertas auditadas de toneladas producidas, queda explícitamente declarado sin datos.',
  polipropileno:
    'No existen series públicas abiertas auditadas de toneladas anuales de polipropileno por planta en portales estadísticos nacionales. Se consignan únicamente los flujos verificados de comercio exterior aduanero (UN Comtrade HS 3902.10).',
};

function fmtNum(v: number, decimals = 0): string {
  return v.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtCompactMass(valor: number, unidad: string): string {
  if ((unidad === 't' || unidad.startsWith('t ')) && valor >= 1_000_000) {
    return `${fmtNum(valor / 1_000_000, 2)} Mt`;
  }
  return `${fmtNum(Math.round(valor))} ${unidad}`;
}

export function buildProductPageView(ficha: FichaProducto): ProductPageDerivedView {
  const pid = ficha.producto.producto_id;
  const style = CATEGORY_STYLE[ficha.producto.categoria];
  const procPrincipal = ficha.procesos[0]!;

  // Línea jurisdiccional automática desde zonas y departamentos validados
  const byProv = new Map<string, { nombre: string; id: string; deptos: string[] }>();
  for (const z of ficha.zonas) {
    const entry = byProv.get(z.provincia_id) ?? {
      nombre: z.provincia.nombre,
      id: z.provincia_id,
      deptos: [],
    };
    if (z.departamento) {
      const tag = `${z.departamento.nombre} (${z.departamento.departamento_id})`;
      if (!entry.deptos.includes(tag)) entry.deptos.push(tag);
    }
    byProv.set(z.provincia_id, entry);
  }
  const jurisdiccionLine =
    Array.from(byProv.values())
      .map((p) =>
        p.deptos.length > 0
          ? `${p.nombre} (Georef ${p.id}) · ${p.deptos.join(', ')}`
          : `${p.nombre} (Georef ${p.id})`
      )
      .join(' · ') || 'Argentina';

  const provListShort = Array.from(byProv.values())
    .map((p) => p.nombre)
    .join(', ');

  // Derivación limpia de 4 KPIs desde datos reales validados
  const prodDato = ficha.produccion.filter((r) => r.medicion.estado === 'dato');
  const latestProd = prodDato[0];
  const comexUsd = ficha.comercioExterior
    .filter((r) => r.metrica === 'valor_usd')
    .sort((a, b) => b.anio - a.anio);
  const comexVol = ficha.comercioExterior
    .filter((r) => r.metrica === 'volumen_t')
    .sort((a, b) => b.anio - a.anio);

  const latestUsd = comexUsd[0];
  const latestVol = comexVol[0];
  const plantaCap = ficha.plantas.find((p) => p.capacidad.estado === 'dato');
  const energiaProc = procPrincipal.proceso.energia_especifica;

  const kpi1: ProductKpiCard =
    latestProd && latestProd.medicion.estado === 'dato'
      ? {
          label: `Producción registrada (${latestProd.anio})`,
          value: fmtCompactMass(latestProd.medicion.valor, latestProd.medicion.unidad),
          sublabel: `${latestProd.procedencia.fuente.slice(0, 48)}`,
          valueClass: 'text-ink',
        }
      : {
          label: 'Producción física anual',
          value: 'Sin datos',
          sublabel: 'Sin serie abierta auditada (nunca estimamos)',
          valueClass: 'text-ink-muted',
        };

  const kpi2: ProductKpiCard =
    latestVol && latestVol.exportacion.estado === 'dato'
      ? {
          label: `Exportación física ${latestVol.ncm_codigo ? `HS ${latestVol.ncm_codigo}` : ''} (${latestVol.anio})`,
          value: fmtCompactMass(latestVol.exportacion.valor, latestVol.exportacion.unidad),
          sublabel: latestVol.procedencia.fuente.slice(0, 48),
          valueClass: 'text-emerald-react',
        }
      : latestVol && latestVol.importacion.estado === 'dato'
        ? {
            label: `Importación física ${latestVol.ncm_codigo ? `HS ${latestVol.ncm_codigo}` : ''} (${latestVol.anio})`,
            value: fmtCompactMass(latestVol.importacion.valor, latestVol.importacion.unidad),
            sublabel: latestVol.procedencia.fuente.slice(0, 48),
            valueClass: 'text-ochre-metal',
          }
        : {
            label: 'Volumen aduanero físico',
            value: 'Sin datos',
            sublabel: 'Declarado en valor monetario USD',
            valueClass: 'text-ink-muted',
          };

  const kpi3: ProductKpiCard =
    latestUsd && latestUsd.saldo_comercial.estado === 'dato'
      ? {
          label: `Saldo comercial ${latestUsd.ncm_codigo ? `HS ${latestUsd.ncm_codigo}` : ''} (${latestUsd.anio})`,
          value: `${latestUsd.saldo_comercial.valor >= 0 ? '+' : ''}USD ${fmtNum(latestUsd.saldo_comercial.valor, 2)} M`,
          sublabel:
            latestUsd.exportacion.estado === 'dato' && latestUsd.importacion.estado === 'dato'
              ? `Exp. ${fmtNum(latestUsd.exportacion.valor, 2)} / Imp. ${fmtNum(latestUsd.importacion.valor, 2)} M`
              : 'Comercio exterior verificado',
          valueClass: latestUsd.saldo_comercial.valor >= 0 ? 'text-cobalt' : 'text-signal-red',
        }
      : {
          label: 'Saldo comercial externo',
          value: 'Sin datos',
          sublabel: 'UN Comtrade / INDEC',
          valueClass: 'text-ink-muted',
        };

  const kpi4: ProductKpiCard =
    energiaProc.estado === 'dato'
      ? {
          label: 'Energía específica de proceso',
          value: `${fmtNum(energiaProc.valor, 2)} ${energiaProc.unidad}`,
          sublabel: `${procPrincipal.proceso.procedencia.fuente.slice(0, 46)}`,
          valueClass: 'text-cobalt',
        }
      : plantaCap && plantaCap.capacidad.estado === 'dato'
        ? {
            label: 'Capacidad instalada relevada',
            value: `${fmtNum(plantaCap.capacidad.valor)} ${plantaCap.capacidad.unidad}`,
            sublabel: plantaCap.nombre,
            valueClass: 'text-ochre-metal',
          }
        : {
            label: 'Energía / capacidad nominal',
            value: `${ficha.plantas.length} ${ficha.plantas.length === 1 ? 'complejo' : 'complejos'}`,
            sublabel: `${ficha.procesos.length} ${ficha.procesos.length === 1 ? 'ruta validada' : 'rutas validadas'}`,
            valueClass: 'text-ink',
          };

  const diagramTitle =
    ficha.procesos.length > 1
      ? `Diagramas de ingeniería ISO 10628 (${ficha.procesos.length} rutas tecnológicas)`
      : `Diagrama de ingeniería ISO 10628 · ${procPrincipal.proceso.nombre}`;

  const diagramDescription = procPrincipal.proceso.descripcion;
  const diagramBadge = procPrincipal.proceso.reaccion_global
    ? { label: 'Reacción global', strong: procPrincipal.proceso.reaccion_global }
    : ficha.procesos.length > 1
      ? { label: 'Rutas activas en Argentina', strong: `${ficha.procesos.length} procesos` }
      : undefined;

  return {
    seoTitle: `${ficha.producto.nombre} (${provListShort || 'Argentina'}) | Atlas Químico Argentino`,
    seoDescription: `${ficha.producto.descripcion_corta} Diagrama PFD ISO 10628, plantas georreferenciadas y fuentes verificadas con SHA-256.`,
    badgeBgClass: style.bg,
    formulaTextClass: style.text,
    jurisdiccionLine,
    kpis: [kpi1, kpi2, kpi3, kpi4],
    anatomy: ANATOMY_BY_PRODUCT[pid],
    diagramTitle,
    diagramDescription,
    diagramBadge,
    procesoMetaById: PROCESO_META_BY_PRODUCT[pid],
    ncmLabels: NCM_LABELS,
    sinDatosProduccionExplicacion: SIN_DATOS_PRODUCCION_COPY[pid],
  };
}
