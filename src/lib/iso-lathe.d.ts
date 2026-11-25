import type { Flat, Plane, Point3, Projection, SolidPaths } from './iso-kit';

export interface Frame3 {
  o: Point3;
  a: Point3;
  u: Point3;
  v: Point3;
}

export type MeridianPoint = [number, number] | [number, number, number];

export interface LatheOptions {
  steps?: number;
  fill?: 'auto' | 'hull' | 'surface' | 'shades';
  hole?: [number, number] | null;
  bevel?: number;
  rims?: 'all' | 'first' | 'last' | 'ends' | 'none';
  smooth?: 'auto' | boolean | { rows?: number; slope?: (s: number) => number; radius?: (s: number) => number };
  waist?: number;
}

export function dot3(a: Point3, b: Point3): number;
export function add3(a: Point3, b: Point3): Point3;
export function sub3(a: Point3, b: Point3): Point3;
export function mul3(a: Point3, k: number): Point3;
export function len3(a: Point3): number;
export function unit3(a: Point3): Point3;
export function cross3(a: Point3, b: Point3): Point3;
export function lerp3(a: Point3, b: Point3, t: number): Point3;
export function viewOf(P: Projection): Point3;
export function lightOf(P: Projection): Point3;
export function scaleOf(P: Projection): number;
export function frameAlong(o: Point3, a: Point3): Frame3;
export function frameOf(o: Point3, a: Point3, u: Point3, v: Point3): Frame3;
export function pointOf(F: Frame3, s: number, r: number, angle: number): Point3;
export function hullOf(points: Flat[]): Flat[];
export function lathe(meridian: MeridianPoint[], F: Frame3, P: Projection, options?: LatheOptions): SolidPaths;
export function solidOf(profile: MeridianPoint[], F: Frame3, P: Projection, options?: LatheOptions): SolidPaths;
export function disc(s0: number, s1: number, r: number, F: Frame3, P: Projection, options?: LatheOptions): SolidPaths;
export function ringBand(s0: number, s1: number, rIn: number, rOut: number, F: Frame3, P: Projection, options?: LatheOptions): SolidPaths;
export function sphereOf(centre: Point3, r: number, P: Projection, options?: { steps?: number }): SolidPaths;
export function prismOf(F: Frame3, polygon: Plane[], s0: number, s1: number, P: Projection): SolidPaths;
export function stadium(r0: number, r1: number, offset: number, steps?: number): Plane[];
export function arcOf(
  F: Frame3,
  s: number,
  r: number,
  P: Projection,
  options?: { slope?: number; steps?: number; least?: number; inward?: boolean; from?: number; to?: number; trim?: number }
): string;
export function circleOf(F: Frame3, s: number, r: number, P: Projection, steps?: number): string;
export function ribsOf(
  F: Frame3,
  s0: number,
  s1: number,
  r: number,
  count: number,
  P: Projection,
  options?: { phase?: number; twist?: number; least?: number; r1?: number; seams?: boolean | 'first' | 'last' }
): string;
export function dotsOf(
  F: Frame3,
  s: number,
  r: number,
  count: number,
  P: Projection,
  options?: { phase?: number; slope?: number; least?: number; all?: boolean }
): Flat[];
export function fillet(
  points: Point3[],
  radius: number,
  perArc?: number,
  options?: { P?: Projection | null; tube?: number; margin?: number }
): Point3[];
export function resample(points: Point3[], spacing: number): Point3[];
export function pathLength(points: Point3[]): number;
export function cut(points: Point3[], from: number, to: number): Point3[];
export function pointAlong(points: Point3[], at: number): Point3;
export function tangentAlong(points: Point3[], at: number): Point3;
