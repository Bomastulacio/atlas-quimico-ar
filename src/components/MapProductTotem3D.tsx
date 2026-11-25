import type { Producto } from '@/schemas';

interface MapProductTotem3DProps {
  productoId: string;
  categoria: Producto['categoria'];
  isSelected?: boolean;
}

/**
 * Mini-monumento isométrico 3D (estilo Anatomy en 4 tonos) que representa
 * visualmente qué se produce en un departamento o planta al hacer zoom.
 * Escala diseñada en píxeles de pantalla (~44x44 px centrado en 0,0).
 */
export function MapProductTotem3D({
  productoId,
  categoria,
  isSelected = false,
}: MapProductTotem3DProps) {
  const ringStroke = isSelected ? '#0A42E0' : '#111214';

  return (
    <g aria-hidden="true">
      {/* Sombra proyectada y plataforma base isométrica (rombo 3D) */}
      <ellipse cx="0" cy="5" rx="19" ry="9.5" fill="#111214" fillOpacity="0.22" />
      {/* Caras laterales del plinto */}
      <polygon
        points="-18,1 0,10 0,14 -18,5"
        fill="#B8B6AD"
        stroke={ringStroke}
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <polygon
        points="18,1 0,10 0,14 18,5"
        fill="#9E9C93"
        stroke={ringStroke}
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* Cara superior del plinto */}
      <polygon
        points="0,-8 18,1 0,10 -18,1"
        fill="#F4F3EE"
        stroke={ringStroke}
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* 1. ALGODÓN (Chaco): Desmotadora industrial + 2 fardos blancos prensados */}
      {(productoId === 'algodon' || (categoria === 'agroindustria' && productoId !== 'soja')) && (
        <g>
          {/* Nave desmotadora con techo diente de sierra ocre */}
          <polygon
            points="-12,-1 -2,4 -2,-7 -12,-12"
            fill="#E5E4DE"
            stroke="#111214"
            strokeWidth="0.85"
            strokeLinejoin="round"
          />
          <polygon
            points="-2,4 8,-1 8,-12 -2,-7"
            fill="#C9C7BF"
            stroke="#111214"
            strokeWidth="0.85"
            strokeLinejoin="round"
          />
          <polygon
            points="-12,-12 -2,-7 8,-12 -2,-17"
            fill="#C86A11"
            stroke="#111214"
            strokeWidth="0.85"
            strokeLinejoin="round"
          />
          {/* Fardos blancos de fibra de algodón con flejes */}
          <g transform="translate(5, 3)">
            <polygon points="-5,-2 0,0.5 0,-5 -5,-7.5" fill="#FFFFFF" stroke="#111214" strokeWidth="0.75" />
            <polygon points="0,0.5 5,-2 5,-7.5 0,-5" fill="#E3E1D8" stroke="#111214" strokeWidth="0.75" />
            <polygon points="-5,-7.5 0,-5 5,-7.5 0,-10" fill="#FFFFFF" stroke="#111214" strokeWidth="0.75" />
            <line x1="-2.5" y1="-6.2" x2="-2.5" y2="-0.8" stroke="#C86A11" strokeWidth="0.7" />
            <line x1="2.5" y1="-6.2" x2="2.5" y2="-0.8" stroke="#C86A11" strokeWidth="0.7" />
          </g>
        </g>
      )}

      {/* 2. SOJA Y BIODIÉSEL (Up-River Santa Fe): Batería de silos portuarios + reactor */}
      {(productoId === 'soja' || productoId === 'biodiesel' || categoria === 'bioenergia') && (
        <g>
          {/* Silo trasero */}
          <path
            d="M-11,-12 L-11,-1 A5,2.5 0 0,0 -1,-1 L-1,-12 Z"
            fill="#D4D8DF"
            stroke="#111214"
            strokeWidth="0.8"
          />
          <ellipse cx="-6" cy="-12" rx="5" ry="2.5" fill="#FFFFFF" stroke="#111214" strokeWidth="0.8" />
          {/* Silo central */}
          <path
            d="M-3,-15 L-3,1 A5.2,2.6 0 0,0 7.4,1 L7.4,-15 Z"
            fill="#E2E6EC"
            stroke="#111214"
            strokeWidth="0.85"
          />
          <ellipse cx="2.2" cy="-15" rx="5.2" ry="2.6" fill="#FFFFFF" stroke="#111214" strokeWidth="0.85" />
          {/* Torre de transesterificación / extracción (verde si biodiésel, ocre si soja) */}
          <path
            d="M7,-19 L7,0 A3.5,1.8 0 0,0 14,0 L14,-19 Z"
            fill={productoId === 'biodiesel' ? '#0B7A53' : '#C86A11'}
            stroke="#111214"
            strokeWidth="0.85"
          />
          <ellipse
            cx="10.5"
            cy="-19"
            rx="3.5"
            ry="1.8"
            fill={productoId === 'biodiesel' ? '#6CC4A1' : '#F2B46D'}
            stroke="#111214"
            strokeWidth="0.85"
          />
        </g>
      )}

      {/* 3. LITIO (Puna: Susques, Antofagasta, Los Andes): Piletas turquesa + planta carbonato */}
      {(productoId === 'litio' || categoria === 'mineria_quimica') && (
        <g>
          {/* Piletas escalonadas de evaporación solar en salar */}
          <polygon
            points="-13,0 -3,5 5,1 -5,-4"
            fill="#4CC3B7"
            stroke="#111214"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          <polygon
            points="-7,-3 1,1 8,-2.5 0,-6.5"
            fill="#83DFD5"
            stroke="#111214"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Reactor de carbonatación verde mineral */}
          <path
            d="M3,-16 L3,-1 A4.2,2.1 0 0,0 11.4,-1 L11.4,-16 Z"
            fill="#0B7A53"
            stroke="#111214"
            strokeWidth="0.85"
          />
          <ellipse cx="7.2" cy="-16" rx="4.2" ry="2.1" fill="#7AD4B2" stroke="#111214" strokeWidth="0.85" />
        </g>
      )}

      {/* 4. ALUMINIO (Puerto Madryn / Biedma): Nave de electrólisis + silo + chimenea GTC */}
      {(productoId === 'aluminio' || categoria === 'metalurgia') && (
        <g>
          {/* Nave Hall-Héroult con viga azul cobalto */}
          <polygon points="-13,0 -1,6 -1,-4 -13,-10" fill="#DCE2EC" stroke="#111214" strokeWidth="0.85" />
          <polygon points="-1,6 9,1 9,-9 -1,-4" fill="#B5C0D0" stroke="#111214" strokeWidth="0.85" />
          <polygon points="-13,-10 -1,-4 9,-9 -3,-15" fill="#0A42E0" stroke="#111214" strokeWidth="0.85" />
          {/* Silo de alúmina y chimenea */}
          <path d="M6,-17 L6,-1 A3.8,1.9 0 0,0 13.6,-1 L13.6,-17 Z" fill="#F5F6F8" stroke="#111214" strokeWidth="0.8" />
          <ellipse cx="9.8" cy="-17" rx="3.8" ry="1.9" fill="#FFFFFF" stroke="#111214" strokeWidth="0.8" />
          <rect x="-5" y="-21" width="3" height="12" fill="#9AA4B4" stroke="#111214" strokeWidth="0.75" />
        </g>
      )}

      {/* 5. UREA Y PETROQUÍMICA (Bahía Blanca): Torre de cracking/prilling + esfera de gas */}
      {(productoId === 'urea' ||
        productoId === 'petroquimica' ||
        categoria === 'fertilizantes' ||
        categoria === 'petroquimica') && (
        <g>
          {/* Torre alta de destilación / prilling */}
          <path
            d="M-9,-21 L-9,1 A4.2,2.1 0 0,0 -0.6,1 L-0.6,-21 Z"
            fill={productoId === 'petroquimica' ? '#D93025' : '#0A42E0'}
            stroke="#111214"
            strokeWidth="0.85"
          />
          <ellipse
            cx="-4.8"
            cy="-21"
            rx="4.2"
            ry="2.1"
            fill={productoId === 'petroquimica' ? '#F59891' : '#8EB0FA'}
            stroke="#111214"
            strokeWidth="0.85"
          />
          {/* Tanque esférico presurizado (NH3 / etileno) */}
          <circle
            cx="6.5"
            cy="-4.5"
            r="6"
            fill="#E8ECF2"
            stroke="#111214"
            strokeWidth="0.85"
          />
          <path d="M2,-7 A6,6 0 0,1 11,-7" fill="none" stroke="#FFFFFF" strokeWidth="1.2" />
          <line x1="3.5" y1="0.5" x2="3.5" y2="3.5" stroke="#111214" strokeWidth="0.85" />
          <line x1="9.5" y1="0.5" x2="9.5" y2="3.5" stroke="#111214" strokeWidth="0.85" />
        </g>
      )}
    </g>
  );
}
