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
  'soda-solvay': {
    title: 'Circuito 3D en movimiento en Río Negro (San Antonio Oeste)',
    description:
      'Lámina interactiva en 3D del proceso Solvay: purificación de salmuera y horno vertical de caliza, absorción de amoníaco, torres de carbonatación de NaHCO3, calcinador rotativo y recuperación cerrada de NH3.',
    hint: 'Orbitá en 3D, cambiá de etapa o grabá un clip WebM a 60 fps',
  },
  'cal-industrial': {
    title: 'Circuito 3D en movimiento en San Juan (Los Berros, Sarmiento)',
    description:
      'Lámina interactiva en 3D del polo calero industrial: trituración y zarandeo de caliza, horno vertical regenerativo PFRK de doble cuba a 1.050 °C, filtro de mangas, hidratador continuo y silos de despacho.',
    hint: 'Orbitá en 3D, cambiá de etapa o grabá un clip WebM a 60 fps',
  },
  'oro-plata': {
    title: 'Circuito 3D en movimiento en Santa Cruz (Macizo del Deseado)',
    description:
      'Lámina interactiva en 3D de la hidrometalurgia aurífera: molienda SAG/bolas, lixiviación cianurada aireada, precipitación Merrill-Crowe con zinc, fundición a lingotes doré y detoxificación INCO.',
    hint: 'Orbitá en 3D, cambiá de etapa o grabá un clip WebM a 60 fps',
  },
  'celulosa-kraft': {
    title: 'Circuito 3D en movimiento en Misiones (Puerto Esperanza)',
    description:
      'Lámina interactiva en 3D de la planta Kraft de fibra larga: descortezado y chipeado de pino, digestor continuo con licor blanco a 168 °C, blanqueo ECF, túnel secador y ciclo cerrado de caldera recuperadora y caustificación.',
    hint: 'Orbitá en 3D, cambiá de etapa o grabá un clip WebM a 60 fps',
  },
  'glp-gas-natural': {
    title: 'Circuito 3D en movimiento en Tierra del Fuego (Cuenca Austral)',
    description:
      'Lámina interactiva en 3D de la planta criogénica de gas y GLP en Río Grande: slug catcher a 75 bar, tamices moleculares 4A, turbo-expansión a -95 °C, tren de columnas C2/C3/C4 y esferas presurizadas.',
    hint: 'Orbitá en 3D, cambiá de etapa o grabá un clip WebM a 60 fps',
  },
  'sal-industrial': {
    title: 'Circuito 3D en movimiento en La Pampa (Salinas Grandes de Hidalgo)',
    description:
      'Lámina interactiva en 3D de la refinación de cloruro de sodio: cosecha evaporítica en salina, molienda húmeda, lavado contracorriente en salmuera saturada, centrifugación pusher, secado en lecho fluido y silos.',
    hint: 'Orbitá en 3D, cambiá de etapa o grabá un clip WebM a 60 fps',
  },
  'cemento-clinker': {
    title: 'Circuito 3D en movimiento en San Luis (La Calera, Depto. Belgrano)',
    description:
      'Lámina interactiva en 3D de la planta cementera vía seca: molino vertical de crudo, torre de 5 ciclones precalcinadora a 900 °C, horno rotativo a 1.450 °C, enfriador de parrilla con aire terciario y molienda con yeso.',
    hint: 'Orbitá en 3D, cambiá de etapa o grabá un clip WebM a 60 fps',
  },
  'citricos-limoneno': {
    title: 'Circuito 3D en movimiento en Entre Ríos (Concordia y Federación)',
    description:
      'Lámina interactiva en 3D del complejo citrícola entrerriano: extracción integral en frío, centrifugación y winterización de aceite esencial D-limoneno, evaporación multiefecto TASTE a 65 °Brix y secado de cáscara.',
    hint: 'Orbitá en 3D, cambiá de etapa o grabá un clip WebM a 60 fps',
  },
  'resina-colofonia': {
    title: 'Circuito 3D en movimiento en Corrientes (Gobernador Virasoro)',
    description:
      'Lámina interactiva en 3D del proceso forestoquímico: fusión de miera de Pinus elliottii, filtración prensa y lavado, decantación continua, destilación por arrastre de vapor a 175 °C y recuperación de trementina y colofonia.',
    hint: 'Orbitá en 3D, cambiá de etapa o grabá un clip WebM a 60 fps',
  },
  'tanino-quebracho': {
    title: 'Circuito 3D en movimiento en Formosa (Unitán Planta Formosa)',
    description:
      'Lámina interactiva en 3D de la extracción de polifenoles de quebracho colorado: chipeado de duramen, batería de autoclaves difusores a 110 °C, caldera de biomasa, evaporación al vacío, sulfitación y torre spray.',
    hint: 'Orbitá en 3D, cambiá de etapa o grabá un clip WebM a 60 fps',
  },
  'aceite-oliva': {
    title: 'Circuito 3D en movimiento en La Rioja (Chilecito y Aimogasta)',
    description:
      'Lámina interactiva en 3D de la almazara continua de dos fases: deshojado y molienda, malaxado en frío por debajo de 27 °C, decanter horizontal ecológico, centrífuga vertical y bodega inox bajo manta de N2.',
    hint: 'Orbitá en 3D, cambiá de etapa o grabá un clip WebM a 60 fps',
  },
  'farmoquimica-ifa': {
    title: 'Circuito 3D en movimiento en CABA (Comuna 9, Mataderos)',
    description:
      'Lámina interactiva en 3D de síntesis orgánica fina GMP: reactor batch vitrificado inertizado, clarificación y columna recuperadora de solventes en ciclo cerrado, cristalización, centrífuga Nutsche y secador al vacío ISO 8.',
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
  '2836.20': 'Carbonato de disodio / Soda Solvay (HS 2836.20)',
  '2522.10': 'Cal viva industrial CaO (HS 2522.10)',
  '7108.12': 'Oro en bruto / barras doré (HS 7108.12)',
  '7106.91': 'Plata en bruto (HS 7106.91)',
  '4703.21': 'Pasta química Kraft de coníferas blanqueada (HS 4703.21)',
  '2711.12': 'Propano licuado GLP (HS 2711.12)',
  '2711.13': 'Butanos licuados GLP (HS 2711.13)',
  '2501.00': 'Sal industrial y cloruro de sodio puro (HS 2501.00)',
  '2523.29': 'Cemento Portland gris / común (HS 2523.29)',
  '2523.10': 'Clínker de cemento hidráulico (HS 2523.10)',
  '2009.11': 'Jugo de naranja congelado / concentrado (HS 2009.11)',
  '3301.12': 'Aceite esencial de naranja / D-limoneno (HS 3301.12)',
  '3806.10': 'Colofonia y ácidos resínicos de pino (HS 3806.10)',
  '3805.10': 'Esencias de trementina / aguarrás vegetal (HS 3805.10)',
  '3201.10': 'Extracto de quebracho / tanino vegetal (HS 3201.10)',
  '1509.20': 'Aceite de oliva virgen extra (HS 1509.20)',
  '1509.10': 'Aceite de oliva virgen (HS 1509.10)',
  '1509.90': 'Otros aceites de oliva refinados/mezcla (HS 1509.90)',
  '3004.90': 'Especialidades medicinales dosificadas (HS 3004.90)',
  '2933.99': 'Compuestos heterocíclicos nitrogenados / IFAs (HS 2933.99)',
};

const SIN_DATOS_PRODUCCION_COPY: Record<string, string> = {
  petroquimica:
    'El dataset público histórico de petroquímica se interrumpió y el recurso CKAN equivalente presentó inconsistencias de origen descartadas en auditoría. Se informan flujos aduaneros verificados UN Comtrade.',
  metanol:
    'El Complejo Industrial Plaza Huincul (YPF) concentra la síntesis argentina de metanol desde gas natural neuquino para biodiésel y resinas locales. Al no publicarse series anuales abiertas auditadas de toneladas producidas, queda explícitamente declarado sin datos.',
  polipropileno:
    'No existen series públicas abiertas auditadas de toneladas anuales de polipropileno por planta en portales estadísticos nacionales. Se consignan únicamente los flujos verificados de comercio exterior aduanero (UN Comtrade HS 3902.10).',
  'soda-solvay':
    'USGS MCS 2025 no desagrega la producción anual individual de carbonato de sodio de Argentina ni existe serie abierta de toneladas de ALPAT. El campo permanece explícitamente sin datos y se muestran las importaciones netas verificadas (UN Comtrade HS 2836.20).',
  'cal-industrial':
    'USGS MCS 2025 no desagrega producción anual individual de cal viva para Argentina. Se presentan las exportaciones físicas verificadas (476 kt en 2024, UN Comtrade HS 2522.10) encabezadas por el polo calero de Los Berros (San Juan).',
  'celulosa-kraft':
    'No existe serie abierta anual descargable en CSV oficial por planta para pulpa Kraft blanqueada en Misiones. El campo de producción anual queda declarado sin datos y se consignan los flujos aduaneros HS 4703.21.',
  'glp-gas-natural':
    'No existe serie pública abierta auditada desagregada por planta de fraccionamiento en Tierra del Fuego. Se informan las exportaciones nacionales verificadas de propano y butano licuados (716 kt combinadas en 2024, UN Comtrade HS 2711.12 y 2711.13).',
  'sal-industrial':
    'USGS MCS 2025 Salt no desagrega la producción individual de Argentina en la tabla mundial ni existe serie provincial abierta de La Pampa. El campo queda declarado sin datos y se informan los flujos aduaneros oficiales HS 2501.00.',
  'cemento-clinker':
    'No existe serie pública abierta descargable desagregada por planta provincial para La Calera (San Luis). El campo de producción física permanece explícitamente sin datos mientras se consigna la trazabilidad del proceso vía seca (IPCC Cap. 2.2) y comercio exterior HS 2523.',
  'citricos-limoneno':
    'No existe balance industrial abierto descargable por planta para jugo concentrado y aceite esencial en Concordia. Se declaran sin datos las toneladas producidas por planta y se exhiben las exportaciones nacionales verificadas de jugo concentrado (HS 2009.11) y aceite esencial (HS 3301.12).',
  'resina-colofonia':
    'No existe serie anual pública abierta desagregada por provincia para colofonia y trementina en Corrientes. Se declara sin datos la serie anual física y se informan la capacidad declarada en Virasoro (13.000 t/año miera) y las exportaciones oficiales UN Comtrade HS 3806.10 y 3805.10.',
  'tanino-quebracho':
    'No existe serie anual oficial abierta desagregada para la planta de Formosa (Unitán publica una capacidad conjunta de ~40.000 t/año entre Formosa y Chaco). Se declara sin datos la producción individual y se consignan las exportaciones oficiales UN Comtrade HS 3201.10.',
  'aceite-oliva':
    'El CSV abierto de SAGyP Estimaciones Agrícolas no desagrega serie anual de aceite de oliva por provincia. El campo de producción anual queda declarado sin datos mientras se consignan las capacidades de almazaras riojanas y las exportaciones verificadas UN Comtrade HS 1509.20 y 1509.10.',
  'farmoquimica-ifa':
    'El informe oficial de INDEC Industria Farmacéutica releva facturación en pesos por ventas internas y exportaciones sin desagregar tonelaje físico de principios activos (IFAs). Se declara sin datos la serie física y se muestran los flujos aduaneros verificados UN Comtrade HS 3004.90 y 2933.99.',
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
