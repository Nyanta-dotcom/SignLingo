/**
 * lm-v1 (docs/02 §4.3, must stay identical to ml/src/signlingo_ml/landmarks/normalize.py):
 * translate the wrist to the origin, divide every x and y by max(|x|,|y|), flatten x0,y0,x1,y1...
 * z is ignored and there is NO mirroring. Returns null when all points coincide with the wrist.
 */

import type { HandFrame } from './types';

const EPS = 1e-12;

export function normalizeLandmarks(frame: HandFrame): Float32Array | null {
  const pts = frame.landmarks;
  if (pts.length !== 21) throw new Error(`expected 21 landmarks, got ${pts.length}`);
  const wx = pts[0].x;
  const wy = pts[0].y;
  let scale = 0;
  for (const p of pts) scale = Math.max(scale, Math.abs(p.x - wx), Math.abs(p.y - wy));
  if (!(scale > EPS)) return null;
  const out = new Float32Array(42);
  pts.forEach((p, i) => {
    out[2 * i] = (p.x - wx) / scale;
    out[2 * i + 1] = (p.y - wy) / scale;
  });
  return out;
}
