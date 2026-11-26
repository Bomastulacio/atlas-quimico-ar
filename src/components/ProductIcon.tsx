import type { SVGProps } from 'react';

interface ProductIconProps extends SVGProps<SVGSVGElement> {
  iconId: string;
  size?: number;
}

/**
 * Íconos geométricos propios por producto industrial/químico.
 * Nunca se utilizan logos de marcas ni empresas.
 */
export function ProductIcon({ iconId, size = 18, className = '', ...props }: ProductIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'square' as const,
    strokeLinejoin: 'miter' as const,
    className,
    'aria-hidden': true,
    ...props,
  };

  switch (iconId) {
    // Aluminio: lingote trapezoidal + arco eléctrico Hall-Héroult
    case 'aluminio-lingote':
      return (
        <svg {...common}>
          <path d="M5 17L7.5 11H16.5L19 17H5Z" />
          <path d="M9.5 11V6.5M14.5 11V6.5" />
          <path d="M7.5 6.5H16.5" />
          <path d="M3.5 19.5H20.5" />
        </svg>
      );

    // Litio: cristal hexagonal / red de salmuera
    case 'litio-salmuera':
      return (
        <svg {...common}>
          <polygon points="12,3 19.5,7.5 19.5,16.5 12,21 4.5,16.5 4.5,7.5" />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
          <path d="M12 3V7.5M19.5 16.5L15.5 14.2M4.5 16.5L8.5 14.2" />
        </svg>
      );

    // Urea y fertilizantes: estructura molecular C(=O)(NH2)2 estilizada
    case 'urea-prill':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2.5" />
          <circle cx="12" cy="4.5" r="1.8" />
          <circle cx="5.5" cy="17.5" r="1.8" />
          <circle cx="18.5" cy="17.5" r="1.8" />
          <path d="M11.1 9.5V6.3M12.9 9.5V6.3" />
          <path d="M9.9 13.4L7 16.1M14.1 13.4L17 16.1" />
        </svg>
      );

    // Algodón: cápsula geométrica de 3 lóbulos y tallo
    case 'algodon-fibra':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" />
          <circle cx="8" cy="12.5" r="3" />
          <circle cx="16" cy="12.5" r="3" />
          <path d="M12 15.5V21" />
          <path d="M9 18L12 16L15 18" />
        </svg>
      );

    // Soja y derivados: vaina + granos alineados
    case 'soja-molienda':
      return (
        <svg {...common}>
          <path d="M18.5 5.5C15 5.5 7 9.5 5.5 18.5C14.5 17 18.5 9 18.5 5.5Z" />
          <circle cx="10.2" cy="14" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="13.8" cy="10.4" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );

    // Petroquímica: torre de fraccionamiento / craqueo
    case 'petroquimica-cracker':
      return (
        <svg {...common}>
          <path d="M9 20V6C9 4.5 10.2 3.5 12 3.5C13.8 3.5 15 4.5 15 6V20" />
          <path d="M6 20H18" />
          <path d="M9 9H15M9 13H15M9 17H15" />
          <path d="M15 8H18.5V15H15" />
        </svg>
      );

    // Biodiésel: gota combustible + enlace éster interno
    case 'biodiesel-ester':
      return (
        <svg {...common}>
          <path d="M12 3.5C12 3.5 6 10.5 6 14.8C6 18.2 8.7 20.5 12 20.5C15.3 20.5 18 18.2 18 14.8C18 10.5 12 3.5 12 3.5Z" />
          <path d="M9.5 15.2L12 12.2L14.5 15.2" />
          <path d="M12 12.2V17.5" />
        </svg>
      );

    // Metanol: molécula CH3-OH geométrica (carbono central + grupo hidroxilo)
    case 'metanol-sintesis':
      return (
        <svg {...common}>
          <circle cx="9.5" cy="12" r="3" />
          <circle cx="17.5" cy="12" r="2.2" />
          <path d="M12.5 12H15.3M9.5 9V5.5M9.5 15V18.5M6.5 12H3.8" />
        </svg>
      );

    // Polipropileno: cadena polimérica en zig-zag con grupo metilo lateral
    case 'polipropileno-pellet':
      return (
        <svg {...common}>
          <path d="M3.5 15.5L8 10.5L12.5 15.5L17 10.5L20.5 14" />
          <path d="M8 10.5V5.5M17 10.5V5.5" />
          <circle cx="8" cy="5.5" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="17" cy="5.5" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );

    // Bioetanol de maíz: mazorca geométrica + gota combustible
    case 'bioetanol-maiz':
      return (
        <svg {...common}>
          <rect x="8.5" y="4.5" width="7" height="12.5" rx="3.5" />
          <path d="M8.5 9H15.5M8.5 13H15.5M12 4.5V17" />
          <path d="M6 15.5C7 18.5 9.2 20 12 20C14.8 20 17 18.5 18 15.5" />
        </svg>
      );

    // Bioetanol y azúcar de caña: tallo segmentado con nudos + hojas
    case 'bioetanol-cana':
      return (
        <svg {...common}>
          <path d="M12 4V20" />
          <path d="M9.5 9H14.5M9.5 14.5H14.5" />
          <path d="M12 9L17.5 5.5M12 14.5L6.5 11" />
        </svg>
      );

    // Soda Solvay: cristal hexagonal + torres de carbonatación
    case 'soda-solvay':
      return (
        <svg {...common}>
          <polygon points="12 3.5 18.5 7.2 18.5 14.8 12 18.5 5.5 14.8 5.5 7.2" />
          <path d="M12 3.5V18.5M5.5 11H18.5" />
        </svg>
      );

    // Cal industrial: horno vertical PFRK + llama de calcinación
    case 'cal-industrial':
      return (
        <svg {...common}>
          <path d="M7.5 4.5H16.5L18 19.5H6L7.5 4.5Z" />
          <path d="M9 11.5H15M12 15.5V19.5" />
          <circle cx="12" cy="8.2" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );

    // Oro y plata doré: lingote trapezoidal + destello metálico
    case 'oro-plata':
      return (
        <svg {...common}>
          <polygon points="5.5 17.5 8 10.5 16 10.5 18.5 17.5" />
          <path d="M12 4V7.5M8.2 5.8L9.8 7.6M15.8 5.8L14.2 7.6" />
        </svg>
      );

    // Celulosa Kraft: fardo prensado con zunchos + hoja de pino
    case 'celulosa-kraft':
      return (
        <svg {...common}>
          <rect x="4.5" y="7" width="15" height="12" />
          <path d="M9.5 7V19M14.5 7V19M12 3.5L9.5 7H14.5L12 3.5Z" />
        </svg>
      );

    // GLP gas natural: esfera presurizada sobre patas + válvula superior
    case 'glp-gas-natural':
      return (
        <svg {...common}>
          <circle cx="12" cy="11.5" r="5.5" />
          <path d="M6.5 11.5H17.5M12 6V3.5M9.5 3.5H14.5" />
          <path d="M8.5 16L7 20.5M15.5 16L17 20.5M12 17V20.5" />
        </svg>
      );

    // Sal industrial NaCl: cristal cúbico isométrico
    case 'sal-industrial':
      return (
        <svg {...common}>
          <polygon points="12 3.5 19.5 7.8 19.5 16.2 12 20.5 4.5 16.2 4.5 7.8" />
          <path d="M4.5 7.8L12 12L19.5 7.8M12 12V20.5" />
        </svg>
      );

    // Cemento Portland: horno rotativo inclinado + torre ciclónica
    case 'cemento-clinker':
      return (
        <svg {...common}>
          <rect x="4.5" y="5" width="4.5" height="14" />
          <path d="M9 11L19.5 13.5V17L9 14.5" />
          <path d="M3.5 19H20.5" />
        </svg>
      );

    // Cítricos y aceite esencial D-limoneno: gajos geométricos + gota de aceite
    case 'citricos-limoneno':
      return (
        <svg {...common}>
          <circle cx="11.5" cy="12.5" r="6.5" />
          <path d="M11.5 6V19M5 12.5H18M7 8L16 17M16 8L7 17" />
          <path d="M16.5 4.5L19 7" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
  }
}
