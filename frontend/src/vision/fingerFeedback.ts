/**
 * Which finger joints differ from the letter's template (docs/02 §5.3, FT-LRN-04).
 * Angles are the 15 joint flexion angles in degrees (180 = straight), thumb first, in the same
 * order as ml/src/signlingo_ml/landmarks/templates.py (`_FLEX`). A joint is reported when
 * |angle - mean| > max(K_SIGMA * std, MIN_DEG), most deviant first.
 */

import { vi } from '@/i18n/vi';
import type { ClassTemplate, FingerHint, FingerName, Landmark } from './types';

const K_SIGMA = 2;
const MIN_DEG = 20;
const FINGERS: FingerName[] = ['thumb', 'index', 'middle', 'ring', 'pinky'];
const JOINTS = ['mcp', 'pip', 'dip'];
export const FINGER_JOINTS = FINGERS.flatMap((f) => (f === 'thumb' ? ['cmc', 'mcp', 'ip'] : JOINTS).map((j) => `${f}_${j}`));

// (a, b, c): the angle at landmark b between a and c. Same triples as Python `_FLEX`.
const TRIPLES: Array<[number, number, number]> = FINGERS.flatMap((_, f) => {
  const base = f === 0 ? 1 : 5 + 4 * (f - 1);
  return [
    [0, base, base + 1],
    [base, base + 1, base + 2],
    [base + 1, base + 2, base + 3],
  ] as Array<[number, number, number]>;
});

export function fingerAngles(p: Landmark[]): number[] {
  return TRIPLES.map(([a, b, c]) => {
    const ux = p[a].x - p[b].x, uy = p[a].y - p[b].y;
    const vx = p[c].x - p[b].x, vy = p[c].y - p[b].y;
    const cos = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy) + 1e-12);
    return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  });
}

export function fingerFeedback(frame: { landmarks: Landmark[] }, template: ClassTemplate): FingerHint[] {
  if (template.finger_angles.length !== 15 || template.finger_angles_std.length !== 15) {
    throw new Error('a template needs 15 angles and 15 standard deviations');
  }
  const angles = fingerAngles(frame.landmarks);
  const out: FingerHint[] = [];
  angles.forEach((angle, i) => {
    const delta = angle - template.finger_angles[i];
    if (Math.abs(delta) <= Math.max(K_SIGMA * template.finger_angles_std[i], MIN_DEG)) return;
    const finger = FINGERS[Math.floor(i / 3)];
    out.push({
      finger,
      joint: FINGER_JOINTS[i],
      deltaDeg: delta,
      hint: (delta > 0 ? vi.fingers.bendMore : vi.fingers.straightenMore)(vi.fingers.names[finger]),
    });
  });
  return out.sort((a, b) => Math.abs(b.deltaDeg) - Math.abs(a.deltaDeg));
}
