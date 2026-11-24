import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

export type DitherMode = 'halftone' | 'ascii' | 'braille';
export type ScenePreset = 'electrolisis' | 'salar' | 'petroquimica';

interface DitheredAsciiArtProps {
  initialScene?: ScenePreset;
  compact?: boolean;
}

// Matriz ordenada de Bayer 4x4 normalizada (0..1)
const BAYER_4X4 = [
  [0 / 16, 8 / 16, 2 / 16, 10 / 16],
  [12 / 16, 4 / 16, 14 / 16, 6 / 16],
  [3 / 16, 11 / 16, 1 / 16, 9 / 16],
  [15 / 16, 7 / 16, 13 / 16, 5 / 16],
];

const ASCII_RAMP = ' .,:;+*?%S#@';
const BRAILLE_RAMP = ' ⠁⠃⠇⠏⠟⠿⡿⣿';

const SPRING = {
  type: 'spring' as const,
  stiffness: 440,
  damping: 34,
};

interface SceneColor {
  skyA: [number, number, number];
  skyB: [number, number, number];
  highlight: [number, number, number];
  ground: [number, number, number];
  accentLabel: string;
  accentHex: string;
  formula: string;
  subtitle: string;
}

const SCENES: Record<ScenePreset, SceneColor> = {
  electrolisis: {
    skyA: [0, 56, 255],       // Azul cobalto intenso (ruptura de color)
    skyB: [10, 22, 118],      // Cobalto profundo
    highlight: [248, 226, 168], // Nube cálida / vapor anódico
    ground: [220, 134, 24],   // Ámbar fundición / horno
    accentLabel: 'CHUBUT · HALL-HÉROULT',
    accentHex: '#0038FF',
    formula: '2 Al₂O₃ + 3 C → 4 Al + 3 CO₂',
    subtitle: 'Trama dithered · Cielo patagónico + celdas a 960 °C',
  },
  salar: {
    skyA: [0, 56, 255],
    skyB: [0, 128, 210],
    highlight: [255, 255, 255],
    ground: [0, 168, 89],     // Salmuera mineral esmeralda
    accentLabel: 'NOA · PILETAS DE SALMUERA',
    accentHex: '#00A859',
    formula: '2 LiCl + Na₂CO₃ → Li₂CO₃ + 2 NaCl',
    subtitle: 'Trama dithered · Evaporación solar + precipitación',
  },
  petroquimica: {
    skyA: [12, 12, 16],
    skyB: [0, 44, 196],
    highlight: [245, 158, 11], // Llama / craqueo térmico
    ground: [255, 51, 31],     // Señal térmica roja
    accentLabel: 'BAHÍA BLANCA · CRAQUEO & UREA',
    accentHex: '#FF331F',
    formula: '2 NH₃ + CO₂ → CO(NH₂)₂ + H₂O',
    subtitle: 'Trama dithered · Torres de destilación y síntesis',
  },
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Campo procedural de escena industrial argentina (cielo con rayos diagonales,
 * cúmulos de nubes, horizonte industrial con torres/domos y relieve frontal)
 * pensado para lucir el dithering Bayer 4x4 y la ruptura de color sobre negro/blanco.
 */
function sampleScene(
  nx: number,
  ny: number,
  t: number,
  scene: ScenePreset,
  pointerX: number,
  pointerY: number
): { r: number; g: number; b: number; lum: number } {
  const cfg = SCENES[scene];

  // Distancia al puntero para generar una onda óptica sutil
  const dx = nx - pointerX;
  const dy = ny - pointerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const pointerBoost = Math.exp(-dist * 4.5) * 0.22;

  // Horizonte y silueta industrial (torres, silos, cúpula de planta)
  const horizon = 0.68;

  if (ny < horizon) {
    // Rayos diagonales en el cielo (evocando la lámina de referencia)
    const rayAngle = nx * 9.5 + ny * 6.5 - t * 0.12;
    const rays = Math.pow(Math.max(0, Math.sin(rayAngle) * 0.5 + 0.5), 3) * 0.35;

    // Nubes / columnas de vapor orgánicas
    const cloudWave =
      Math.sin(nx * 6.2 + t * 0.18) * Math.cos(ny * 7.5 - 0.5) +
      0.5 * Math.sin(nx * 14.0 - ny * 9.0 + t * 0.25) +
      0.3 * Math.cos(nx * 23.0 + ny * 15.0);
    const cloudMask = Math.max(
      0,
      Math.min(1, (cloudWave - 0.15) * 0.85 * Math.sin((ny / horizon) * Math.PI))
    );

    // Silueta arquitectónica / planta industrial sobre el horizonte
    const isChimney =
      (nx > 0.66 && nx < 0.69 && ny > 0.42) ||
      (nx > 0.72 && nx < 0.75 && ny > 0.48) ||
      (nx > 0.78 && nx < 0.88 && ny > 0.54);
    const isDome =
      Math.hypot((nx - 0.83) * 1.4, (ny - 0.54) * 2.2) < 0.11 && ny < 0.56;
    const isReactor = nx > 0.16 && nx < 0.28 && ny > 0.52 + Math.sin(nx * 40) * 0.015;

    if (isChimney || isDome || isReactor) {
      const shade = 0.25 + (nx - 0.5) * 0.35 + pointerBoost;
      return {
        r: lerp(22, cfg.highlight[0], Math.max(0, Math.min(1, shade))),
        g: lerp(18, cfg.highlight[1], Math.max(0, Math.min(1, shade))),
        b: lerp(14, cfg.highlight[2], Math.max(0, Math.min(1, shade))),
        lum: Math.max(0.12, Math.min(0.9, shade)),
      };
    }

    const grad = ny / horizon;
    const baseR = lerp(cfg.skyB[0], cfg.skyA[0], grad);
    const baseG = lerp(cfg.skyB[1], cfg.skyA[1], grad);
    const baseB = lerp(cfg.skyB[2], cfg.skyA[2], grad);

    const mix = Math.min(1, cloudMask * 0.92 + rays * 0.55 + pointerBoost);
    const r = lerp(baseR, cfg.highlight[0], mix);
    const g = lerp(baseG, cfg.highlight[1], mix);
    const b = lerp(baseB, cfg.highlight[2], mix);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return { r, g, b, lum };
  }

  // Terreno / plano industrial con surcos en perspectiva (agro, salar o nave industrial)
  const depth = (ny - horizon) / (1 - horizon);
  const rows = Math.sin(depth * 28 + Math.sin(nx * 10) * 1.2) * 0.5 + 0.5;
  const foregroundSlope = nx < 0.44 ? Math.max(0, (0.44 - nx) * 1.5) : 0;

  const shade = Math.min(1, 0.18 + rows * 0.42 * (1 - foregroundSlope * 0.5) + pointerBoost);
  const r = lerp(12, cfg.ground[0], shade);
  const g = lerp(12, cfg.ground[1], shade);
  const b = lerp(10, cfg.ground[2], shade);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return { r, g, b, lum };
}

export function DitheredAsciiArt({ initialScene = 'electrolisis', compact = false }: DitheredAsciiArtProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0.65, y: 0.35 });

  const [mode, setMode] = useState<DitherMode>('halftone');
  const [scene, setScene] = useState<ScenePreset>(initialScene);
  const [colorBreak, setColorBreak] = useState<boolean>(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frameId = 0;
    let time = 0;

    const renderFrame = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(320, Math.floor(rect.width));
      const height = Math.max(200, Math.floor(rect.height));

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#09090B';
      ctx.fillRect(0, 0, width, height);

      const cell = mode === 'halftone' ? 7 : mode === 'braille' ? 9 : 8;
      const cols = Math.ceil(width / cell);
      const rows = Math.ceil(height / cell);

      if (mode !== 'halftone') {
        ctx.font = `600 ${cell + 1}px "IBM Plex Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
      }

      for (let gy = 0; gy < rows; gy++) {
        const ny = gy / rows;
        for (let gx = 0; gx < cols; gx++) {
          const nx = gx / cols;
          const s = sampleScene(
            nx,
            ny,
            time,
            scene,
            pointerRef.current.x,
            pointerRef.current.y
          );
          const threshold = BAYER_4X4[gy & 3][gx & 3];

          if (mode === 'halftone') {
            const radius = Math.max(0, (s.lum + (threshold - 0.5) * 0.25) * (cell * 0.54));
            if (radius < 0.55) continue;

            if (colorBreak) {
              // Cuantización estilizada tipo imprenta / Devault shader
              const qR = s.r > threshold * 255 ? Math.min(255, Math.round(s.r * 1.15)) : Math.round(s.r * 0.45);
              const qG = s.g > threshold * 255 ? Math.min(255, Math.round(s.g * 1.15)) : Math.round(s.g * 0.45);
              const qB = s.b > threshold * 255 ? Math.min(255, Math.round(s.b * 1.15)) : Math.round(s.b * 0.45);
              ctx.fillStyle = `rgb(${qR},${qG},${qB})`;
            } else {
              const v = s.lum > threshold ? 245 : 70;
              ctx.fillStyle = `rgb(${v},${v},${v})`;
            }

            ctx.beginPath();
            ctx.arc(gx * cell + cell / 2, gy * cell + cell / 2, radius, 0, Math.PI * 2);
            ctx.fill();
          } else {
            const ramp = mode === 'braille' ? BRAILLE_RAMP : ASCII_RAMP;
            const ditheredLum = Math.max(0, Math.min(0.999, s.lum + (threshold - 0.5) * 0.22));
            const charIdx = Math.floor(ditheredLum * ramp.length);
            const ch = ramp[charIdx];
            if (ch === ' ') continue;

            if (colorBreak) {
              ctx.fillStyle = `rgb(${Math.round(s.r)},${Math.round(s.g)},${Math.round(s.b)})`;
            } else {
              const v = Math.round(90 + ditheredLum * 165);
              ctx.fillStyle = `rgb(${v},${v},${v})`;
            }
            ctx.fillText(ch, gx * cell + cell / 2, gy * cell + cell / 2);
          }
        }
      }

      if (!reducedMotion) {
        time += 0.035;
        frameId = window.requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [mode, scene, colorBreak]);

  const currentScene = SCENES[scene];

  return (
    <div className="group relative overflow-hidden border border-ink bg-ink text-white">
      {/* Barra técnica superior estilo details.so */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 bg-ink px-3.5 py-2 font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full transition-colors duration-300"
            style={{ backgroundColor: colorBreak ? currentScene.accentHex : '#FFFFFF' }}
          />
          <span className="tracking-wider text-white/90">{currentScene.accentLabel}</span>
        </div>

        {/* Selector de modo de trama (Bencho spring pill) */}
        <div className="flex items-center gap-1">
          {(['halftone', 'ascii', 'braille'] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`relative cursor-pointer px-2 py-0.5 uppercase transition-colors ${
                  active ? 'text-ink' : 'text-white/60 hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="dither-mode-pill"
                    transition={SPRING}
                    className="absolute inset-0 bg-white"
                  />
                )}
                <span className="relative z-10">{m}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setColorBreak((v) => !v)}
            className="ml-1.5 cursor-pointer border border-white/25 px-2 py-0.5 uppercase text-white/85 transition-colors hover:border-white hover:bg-white hover:text-ink"
            title="Alternar monocromo vs ruptura de color"
          >
            {colorBreak ? 'COLOR' : 'B/N'}
          </button>
        </div>
      </div>

      {/* Lienzo generativo interactivo */}
      <div
        className={`relative w-full overflow-hidden ${compact ? 'h-56 sm:h-64' : 'h-72 sm:h-88'}`}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          pointerRef.current = {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height,
          };
        }}
      >
        <canvas
          ref={canvasRef}
          aria-label={`Arte generativo dithered en modo ${mode}: ${currentScene.subtitle}`}
          className="block h-full w-full"
        />

        {/* Tarjeta flotante minimalista con fórmula química */}
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-2">
          <div className="border border-white/20 bg-ink/90 px-3 py-2 backdrop-blur-xs">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">
              {currentScene.subtitle}
            </p>
            <p className="mt-0.5 font-mono text-xs font-medium text-white sm:text-sm">
              {currentScene.formula}
            </p>
          </div>
        </div>
      </div>

      {/* Selector de escena industrial inferior */}
      <div className="grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 bg-ink font-mono text-[11px]">
        {(
          [
            { id: 'electrolisis', label: '01 · Aluminio' },
            { id: 'salar', label: '02 · Litio NOA' },
            { id: 'petroquimica', label: '03 · Bahía Blanca' },
          ] as const
        ).map((item) => {
          const isSelected = scene === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setScene(item.id)}
              className={`cursor-pointer px-3 py-2 text-left transition-colors ${
                isSelected
                  ? 'bg-white text-ink font-medium'
                  : 'text-white/65 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
