/** Skeleton & fingertip trail drawing straight on a <canvas>: the frame loop never goes through React state. */

import type { TrailPoint } from '@/vision/dynamicGesture';
import type { Landmark } from '@/vision/types';

export const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

type Ctx = Pick<CanvasRenderingContext2D, 'clearRect' | 'beginPath' | 'moveTo' | 'lineTo' | 'stroke' | 'arc' | 'fill'> & {
  lineWidth: number;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  fillStyle: string | CanvasGradient | CanvasPattern;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  globalAlpha?: number;
};

export function drawSkeleton(
  ctx: Ctx,
  landmarks: readonly Landmark[] | null,
  { width, height, color, badColor, badJoints = [] }: { width: number; height: number; color: string; badColor: string; badJoints?: readonly number[] },
): void {
  ctx.clearRect(0, 0, width, height);
  if (!landmarks) return;
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(landmarks[a].x * width, landmarks[a].y * height);
    ctx.lineTo(landmarks[b].x * width, landmarks[b].y * height);
    ctx.stroke();
  }
  landmarks.forEach((p, i) => {
    ctx.fillStyle = badJoints.includes(i) ? badColor : color;
    ctx.beginPath();
    ctx.arc(p.x * width, p.y * height, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Draws a glowing tapered fingertip trail on top of the skeleton canvas for dynamic J/Z gestures. */
export function drawTrail(
  ctx: Ctx,
  points: readonly TrailPoint[],
  { width, height, color }: { width: number; height: number; color: string },
): void {
  if (points.length < 2) return;
  const prevAlpha = ctx.globalAlpha ?? 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;

  for (let i = 1; i < points.length; i += 1) {
    const ratio = i / (points.length - 1);
    ctx.globalAlpha = 0.2 + 0.8 * ratio;
    ctx.lineWidth = 4 + 8 * ratio;
    ctx.beginPath();
    ctx.moveTo(points[i - 1].x * width, points[i - 1].y * height);
    ctx.lineTo(points[i].x * width, points[i].y * height);
    ctx.stroke();
  }

  const tip = points[points.length - 1];
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(tip.x * width, tip.y * height, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = prevAlpha;
}

/** Reads a theme colour token so the canvas never hardcodes hex in component code. */
export function tokenColor(name: string, root: HTMLElement = document.documentElement): string {
  return getComputedStyle(root).getPropertyValue(`--${name}`).trim();
}
