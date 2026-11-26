import type { PfdSimboloEquipo } from '@/schemas';

interface PfdEquipmentSymbolProps {
  simbolo: PfdSimboloEquipo;
  selected: boolean;
  connected: boolean;
}

/**
 * Simbología vectorial normalizada ISO 10628 / ASME para diagramas PFD de ingeniería química.
 * Cada símbolo está centrado en (0, 0) para colocación exacta en coordenadas del plano técnico.
 */
export function PfdEquipmentSymbol({
  simbolo,
  selected,
  connected,
}: PfdEquipmentSymbolProps) {
  const stroke = selected ? '#0A42E0' : connected ? '#111214' : '#1F232A';
  const fill = selected ? '#EEF3FE' : '#F7F7F5';
  const detailStroke = selected ? '#0A42E0' : '#52555E';
  const sw = selected ? 2.1 : 1.5;

  switch (simbolo) {
    case 'furnace':
      // Horno radiante de pirólisis / reformador tubular con chimenea y serpentín
      return (
        <g>
          <path
            d="M -38 42 L -38 -18 L -22 -42 L 22 -42 L 38 -18 L 38 42 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
          <rect x={-10} y={-50} width={20} height={8} fill={fill} stroke={stroke} strokeWidth={1.3} />
          {/* Serpentín radiante */}
          <path
            d="M -46 0 L -24 0 L -24 -16 L -8 -16 L -8 18 L 8 18 L 8 -16 L 24 -16 L 24 0 L 46 0"
            fill="none"
            stroke={selected ? '#0A42E0' : '#C86A11'}
            strokeWidth={1.7}
          />
          {/* Quemadores en base */}
          <polygon points="-18,42 -13,30 -8,42" fill="none" stroke={detailStroke} strokeWidth={1.2} />
          <polygon points="8,42 13,30 18,42" fill="none" stroke={detailStroke} strokeWidth={1.2} />
        </g>
      );

    case 'heat_exchanger':
      // Intercambiador casco y tubos / TLE (símbolo clásico ISO círculo con serpentín M)
      return (
        <g>
          <circle cx={0} cy={0} r={34} fill={fill} stroke={stroke} strokeWidth={sw} />
          <path
            d="M -34 0 L -16 0 L -9 -14 L 0 14 L 9 -14 L 16 0 L 34 0"
            fill="none"
            stroke={stroke}
            strokeWidth={1.6}
          />
        </g>
      );

    case 'condenser':
      // Condensador / intercambiador de carbamato con haz tubular y descarga inferior
      return (
        <g>
          <circle cx={0} cy={0} r={34} fill={fill} stroke={stroke} strokeWidth={sw} />
          <path
            d="M -28 -8 L -14 -8 L -7 8 L 0 -8 L 7 8 L 14 -8 L 28 -8"
            fill="none"
            stroke={stroke}
            strokeWidth={1.5}
          />
          <line x1={-22} y1={14} x2={22} y2={14} stroke={detailStroke} strokeWidth={1.2} strokeDasharray="3 3" />
        </g>
      );

    case 'reactor':
      // Reactor catalítico vertical con cabezales torisféricos y lecho empaquetado rayado
      return (
        <g>
          <path
            d="M -32 -32 A 32 16 0 0 1 32 -32 L 32 32 A 32 16 0 0 1 -32 32 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
          {/* Lecho catalítico con reticulado en cruz */}
          <rect
            x={-26}
            y={-22}
            width={52}
            height={44}
            fill="none"
            stroke={detailStroke}
            strokeWidth={1.1}
          />
          <line x1={-26} y1={-22} x2={26} y2={22} stroke={detailStroke} strokeWidth={1} opacity={0.7} />
          <line x1={26} y1={-22} x2={-26} y2={22} stroke={detailStroke} strokeWidth={1} opacity={0.7} />
          <line x1={-26} y1={0} x2={26} y2={0} stroke={detailStroke} strokeWidth={1} opacity={0.55} />
        </g>
      );

    case 'column':
      // Torre / columna de destilación, absorción o stripping con platos horizontales
      return (
        <g>
          <path
            d="M -24 -44 A 24 13 0 0 1 24 -44 L 24 44 A 24 13 0 0 1 -24 44 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
          {[-28, -14, 0, 14, 28].map((py) => (
            <line
              key={py}
              x1={-18}
              y1={py}
              x2={18}
              y2={py}
              stroke={detailStroke}
              strokeWidth={1.1}
              strokeDasharray="6 3"
            />
          ))}
        </g>
      );

    case 'separator':
      // Separador líquido-vapor / evaporador flash vertical con demister superior
      return (
        <g>
          <path
            d="M -28 -34 A 28 14 0 0 1 28 -34 L 28 34 A 28 14 0 0 1 -28 34 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
          {/* Demister superior */}
          <rect
            x={-22}
            y={-24}
            width={44}
            height={8}
            fill="none"
            stroke={detailStroke}
            strokeWidth={1}
            strokeDasharray="2 2"
          />
          {/* Nivel de fase líquida */}
          <path
            d="M -26 14 Q -13 10 0 14 T 26 14"
            fill="none"
            stroke={selected ? '#0A42E0' : '#0B7A53'}
            strokeWidth={1.4}
          />
        </g>
      );

    case 'compressor':
      // Compresor centrífugo multietapa ISO (trapecio convergente hacia alta presión)
      return (
        <g>
          <polygon
            points="-38,-32 38,-18 38,18 -38,32"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
          <line x1={-14} y1={-27} x2={-14} y2={27} stroke={detailStroke} strokeWidth={1.1} />
          <line x1={12} y1={-22} x2={12} y2={22} stroke={detailStroke} strokeWidth={1.1} />
        </g>
      );

    case 'pump':
      // Bomba centrífuga de alta presión con descarga tangencial y base
      return (
        <g>
          <circle cx={0} cy={0} r={22} fill={fill} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={-22} x2={26} y2={-22} stroke={stroke} strokeWidth={sw} />
          <polygon points="-14,22 14,22 20,30 -20,30" fill={fill} stroke={stroke} strokeWidth={1.3} />
          <polygon points="-6,-10 12,0 -6,10" fill="none" stroke={detailStroke} strokeWidth={1.3} />
        </g>
      );

    case 'dryer_bed':
      // Secadores gemelos de tamiz molecular / adsorción
      return (
        <g>
          <path
            d="M -32 -28 A 14 8 0 0 1 -4 -28 L -4 28 A 14 8 0 0 1 -32 28 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
          <path
            d="M 4 -28 A 14 8 0 0 1 32 -28 L 32 28 A 14 8 0 0 1 4 28 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
          <line x1={-26} y1={-12} x2={-10} y2={-12} stroke={detailStroke} strokeWidth={1} strokeDasharray="2 2" />
          <line x1={-26} y1={12} x2={-10} y2={12} stroke={detailStroke} strokeWidth={1} strokeDasharray="2 2" />
          <line x1={10} y1={-12} x2={26} y2={-12} stroke={detailStroke} strokeWidth={1} strokeDasharray="2 2" />
          <line x1={10} y1={12} x2={26} y2={12} stroke={detailStroke} strokeWidth={1} strokeDasharray="2 2" />
        </g>
      );

    case 'granulator':
      // Granulador de lecho fluidizado con placa distribuidora y boquillas
      return (
        <g>
          <path
            d="M -44 -28 L 44 -28 L 44 16 L 26 36 L -26 36 L -44 16 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
          <line x1={-40} y1={14} x2={40} y2={14} stroke={detailStroke} strokeWidth={1.3} strokeDasharray="4 3" />
          {[-20, 0, 20].map((bx) => (
            <g key={bx}>
              <line x1={bx} y1={-28} x2={bx} y2={-10} stroke={detailStroke} strokeWidth={1.2} />
              <circle cx={bx} cy={2} r={2.2} fill={detailStroke} />
            </g>
          ))}
        </g>
      );

    case 'extruder':
      // Extrusora y peletizadora con tornillo sinfín interno
      return (
        <g>
          <rect x={-46} y={-20} width={76} height={40} fill={fill} stroke={stroke} strokeWidth={sw} />
          <polygon points="30,-20 48,-10 48,10 30,20" fill={fill} stroke={stroke} strokeWidth={sw} />
          <path
            d="M -38 0 L -28 -11 L -16 11 L -4 -11 L 8 11 L 20 -11 L 26 0"
            fill="none"
            stroke={detailStroke}
            strokeWidth={1.5}
          />
        </g>
      );

    case 'tank':
    default:
      return (
        <g>
          <path
            d="M -32 -26 Q 0 -40 32 -26 L 32 30 L -32 30 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
          <line x1={-32} y1={10} x2={32} y2={10} stroke={detailStroke} strokeWidth={1.1} strokeDasharray="4 3" />
        </g>
      );
  }
}
