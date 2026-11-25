import type { Point3, Projection, Tone } from './iso-kit';

export interface TubeRingPiece {
  d: string;
  alpha: number;
}

export interface TubePiece {
  rings: TubeRingPiece[];
  ringTone: Tone;
  mid: Point3;
  body: string;
  shine: string;
  shade: string;
  edges: string;
  wide: boolean;
  points: Point3[];
  radii: number[];
  ends: [boolean, boolean];
  from: number;
  to: number;
}

export interface TubeOptions {
  maxLength?: number;
  spacing?: number;
  closed?: boolean;
  breaks?: number[];
  gaps?: Array<[number, number]>;
  caps?: boolean | [boolean, boolean];
  stripes?: 'auto' | boolean;
  rings?: {
    pitch?: number;
    twist?: number;
    cross?: boolean;
    fade?: [number, number] | null;
    phase?: number;
    steps?: number;
    tone?: Tone;
  } | null;
}

export function tubePieces(
  points3: Point3[],
  radius: number | ((t: number) => number),
  P: Projection,
  options?: TubeOptions
): TubePiece[];

export function crossingsOf(
  points: Point3[],
  centre: Point3,
  axis: Point3,
  radius: number
): number[];
