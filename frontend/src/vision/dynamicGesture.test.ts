import { describe, expect, it } from 'vitest';
import {
  createDynamicVerifier,
  createPassiveDynamicDetector,
  isDynamicLetter,
  isJPose,
  isZPose,
} from './dynamicGesture';
import type { HandFrame, Landmark } from './types';

/** Builds a synthetic 21-point hand centered around `(cx, cy)` with configurable extended fingers. */
function makeHand(cx: number, cy: number, extended: { index?: boolean; middle?: boolean; ring?: boolean; pinky?: boolean }, scale = 0.14): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x: cx, y: cy, z: 0 }));
  // Wrist at bottom, middle MCP straight above at distance = scale
  lm[0] = { x: cx, y: cy + scale, z: 0 };
  lm[9] = { x: cx, y: cy, z: 0 };
  // Thumb folded
  lm[1] = { x: cx + scale * 0.3, y: cy + scale * 0.7, z: 0 };
  lm[2] = { x: cx + scale * 0.4, y: cy + scale * 0.4, z: 0 };
  lm[3] = { x: cx + scale * 0.2, y: cy + scale * 0.3, z: 0 };
  lm[4] = { x: cx + scale * 0.1, y: cy + scale * 0.35, z: 0 };

  const placeFinger = (mcp: number, xOff: number, up: boolean) => {
    lm[mcp] = { x: cx + xOff * scale, y: cy, z: 0 };
    if (up) {
      lm[mcp + 1] = { x: cx + xOff * scale, y: cy - scale * 0.45, z: 0 };
      lm[mcp + 2] = { x: cx + xOff * scale, y: cy - scale * 0.75, z: 0 };
      lm[mcp + 3] = { x: cx + xOff * scale, y: cy - scale * 1.05, z: 0 };
    } else {
      lm[mcp + 1] = { x: cx + xOff * scale, y: cy + scale * 0.12, z: 0 };
      lm[mcp + 2] = { x: cx + xOff * scale, y: cy + scale * 0.32, z: 0 };
      lm[mcp + 3] = { x: cx + xOff * scale, y: cy + scale * 0.42, z: 0 };
    }
  };

  placeFinger(5, 0.35, Boolean(extended.index));
  placeFinger(9, 0.1, Boolean(extended.middle));
  placeFinger(13, -0.15, Boolean(extended.ring));
  placeFinger(17, -0.4, Boolean(extended.pinky));
  return lm;
}

const frame = (lm: Landmark[], t: number): HandFrame => ({ landmarks: lm, handedness: 'Right', score: 0.98, timestampMs: t });

describe('dynamicGesture (J and Z)', () => {
  it('identifies dynamic letters and handshapes', () => {
    expect(isDynamicLetter('J')).toBe(true);
    expect(isDynamicLetter('Z')).toBe(true);
    expect(isDynamicLetter('A')).toBe(false);

    expect(isJPose(makeHand(0.5, 0.5, { pinky: true }))).toBe(true);
    expect(isJPose(makeHand(0.5, 0.5, { index: true }))).toBe(false);
    expect(isZPose(makeHand(0.5, 0.5, { index: true }))).toBe(true);
    expect(isZPose(makeHand(0.5, 0.5, { index: true, middle: true }))).toBe(false);
  });

  it('verifies a J hook stroke in either horizontal mirror direction and rejects static I', () => {
    for (const dir of [-1, 1] as const) {
      const v = createDynamicVerifier();
      v.reset('J');
      // Trace downward stem, then curve sideways and hook upward
      const path: Array<[number, number]> = [
        [0.5, 0.35],
        [0.5, 0.40],
        [0.5, 0.45],
        [0.5, 0.50],
        [0.5 + dir * 0.03, 0.53],
        [0.5 + dir * 0.06, 0.52],
        [0.5 + dir * 0.09, 0.49],
      ];
      let verified = false;
      path.forEach(([x, y], i) => {
        const r = v.update(frame(makeHand(x, y, { pinky: true }), i * 80), i * 80);
        expect(r.poseMatch).toBe(true);
        if (r.verified) verified = true;
      });
      expect(verified, `J dir=${dir}`).toBe(true);
    }

    // Holding static I without motion never verifies J
    const staticV = createDynamicVerifier();
    staticV.reset('J');
    for (let i = 0; i < 15; i += 1) {
      const r = staticV.update(frame(makeHand(0.5, 0.45, { pinky: true }), i * 60), i * 60);
      expect(r.verified).toBe(false);
    }
  });

  it('verifies a Z zigzag stroke in either horizontal mirror direction and rejects static D', () => {
    for (const dir of [1, -1] as const) {
      const v = createDynamicVerifier();
      v.reset('Z');
      // Horizontal -> diagonal down-back -> horizontal forward
      const path: Array<[number, number]> = [
        [0.45, 0.35],
        [0.45 + dir * 0.04, 0.35],
        [0.45 + dir * 0.08, 0.35],
        [0.45 + dir * 0.05, 0.40],
        [0.45 + dir * 0.01, 0.45],
        [0.45 - dir * 0.01, 0.48],
        [0.45 + dir * 0.04, 0.48],
        [0.45 + dir * 0.09, 0.48],
      ];
      let verified = false;
      path.forEach(([x, y], i) => {
        const r = v.update(frame(makeHand(x, y, { index: true }), i * 80), i * 80);
        expect(r.poseMatch).toBe(true);
        if (r.verified) verified = true;
      });
      expect(verified, `Z dir=${dir}`).toBe(true);
    }

    // Holding static D never verifies Z
    const staticV = createDynamicVerifier();
    staticV.reset('Z');
    for (let i = 0; i < 15; i += 1) {
      const r = staticV.update(frame(makeHand(0.5, 0.45, { index: true }), i * 60), i * 60);
      expect(r.verified).toBe(false);
    }
  });

  it('passive detector detects J and Z and respects cooldown so a stroke is not double-typed', () => {
    const det = createPassiveDynamicDetector();
    const zPath: Array<[number, number]> = [
      [0.42, 0.35], [0.47, 0.35], [0.51, 0.35],
      [0.47, 0.40], [0.42, 0.46],
      [0.47, 0.46], [0.52, 0.46],
    ];
    let hits = 0;
    zPath.forEach(([x, y], i) => {
      const r = det.update(frame(makeHand(x, y, { index: true }), i * 80), i * 80);
      if (r.detected === 'Z') hits += 1;
    });
    expect(hits).toBe(1);
    // Immediate follow-up frame during cooldown does not re-trigger
    const duringCooldown = det.update(frame(makeHand(0.55, 0.46, { index: true }), 700), 700);
    expect(duringCooldown.detected).toBeNull();
  });
});
