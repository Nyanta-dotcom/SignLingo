import { describe, expect, it } from 'vitest';
import { classifyStaticNumber, createNumberVerifier, isNumberSign } from './numberGesture';
import type { HandFrame, Landmark } from './types';

function makeNumberHand(opts: {
  cx?: number;
  cy?: number;
  thumb?: 'out' | 'folded' | 'zero' | 'touch_index' | 'touch_middle' | 'touch_ring' | 'touch_pinky';
  index?: boolean;
  middle?: boolean;
  ring?: boolean;
  pinky?: boolean;
  scale?: number;
}): Landmark[] {
  const { cx = 0.5, cy = 0.5, thumb = 'folded', index = false, middle = false, ring = false, pinky = false, scale = 0.14 } = opts;
  const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x: cx, y: cy, z: 0 }));
  lm[0] = { x: cx, y: cy + scale, z: 0 };
  lm[9] = { x: cx, y: cy, z: 0 };

  const place = (mcp: number, xOff: number, up: boolean) => {
    lm[mcp] = { x: cx + xOff * scale, y: cy, z: 0 };
    if (up) {
      lm[mcp + 1] = { x: cx + xOff * scale, y: cy - scale * 0.45, z: 0 };
      lm[mcp + 2] = { x: cx + xOff * scale, y: cy - scale * 0.78, z: 0 };
      lm[mcp + 3] = { x: cx + xOff * scale, y: cy - scale * 1.1, z: 0 };
    } else {
      lm[mcp + 1] = { x: cx + xOff * scale, y: cy + scale * 0.15, z: 0 };
      lm[mcp + 2] = { x: cx + xOff * scale, y: cy + scale * 0.35, z: 0 };
      lm[mcp + 3] = { x: cx + xOff * scale, y: cy + scale * 0.45, z: 0 };
    }
  };

  place(5, 0.35, index);
  place(9, 0.1, middle);
  place(13, -0.15, ring);
  place(17, -0.4, pinky);

  lm[1] = { x: cx + scale * 0.35, y: cy + scale * 0.65, z: 0 };
  lm[2] = { x: cx + scale * 0.55, y: cy + scale * 0.35, z: 0 };
  lm[3] = { x: cx + scale * 0.65, y: cy + scale * 0.15, z: 0 };

  if (thumb === 'out') {
    lm[4] = { x: cx + scale * 0.95, y: cy - scale * 0.1, z: 0 };
  } else if (thumb === 'zero') {
    // O-handshape: thumb tip meets index & middle fingertips
    lm[8] = { x: cx + scale * 0.25, y: cy + scale * 0.1, z: 0 };
    lm[12] = { x: cx + scale * 0.15, y: cy + scale * 0.12, z: 0 };
    lm[4] = { x: cx + scale * 0.22, y: cy + scale * 0.16, z: 0 };
  } else if (thumb === 'folded') {
    lm[3] = { x: cx + scale * 0.25, y: cy + scale * 0.25, z: 0 };
    lm[4] = { x: cx + scale * 0.05, y: cy + scale * 0.25, z: 0 };
  } else {
    const targetTip = thumb === 'touch_index' ? 8 : thumb === 'touch_middle' ? 12 : thumb === 'touch_ring' ? 16 : 20;
    lm[targetTip] = { x: cx + scale * 0.15, y: cy - scale * 0.15, z: 0 };
    lm[4] = { x: lm[targetTip].x + scale * 0.05, y: lm[targetTip].y + scale * 0.05, z: 0 };
  }
  return lm;
}

const frame = (lm: Landmark[], t: number): HandFrame => ({ landmarks: lm, handedness: 'Right', score: 0.99, timestampMs: t });

describe('numberGesture (0-10)', () => {
  it('recognises static numbers 0–9 accurately', () => {
    expect(isNumberSign('0')).toBe(true);
    expect(isNumberSign('10')).toBe(true);
    expect(isNumberSign('11')).toBe(false);

    expect(classifyStaticNumber(makeNumberHand({ thumb: 'zero' }))).toBe('0');
    expect(classifyStaticNumber(makeNumberHand({ index: true }))).toBe('1');
    expect(classifyStaticNumber(makeNumberHand({ index: true, middle: true }))).toBe('2');
    expect(classifyStaticNumber(makeNumberHand({ thumb: 'out', index: true, middle: true }))).toBe('3');
    expect(classifyStaticNumber(makeNumberHand({ index: true, middle: true, ring: true, pinky: true }))).toBe('4');
    expect(classifyStaticNumber(makeNumberHand({ thumb: 'out', index: true, middle: true, ring: true, pinky: true }))).toBe('5');
    expect(classifyStaticNumber(makeNumberHand({ thumb: 'touch_pinky', index: true, middle: true, ring: true }))).toBe('6');
    expect(classifyStaticNumber(makeNumberHand({ thumb: 'touch_ring', index: true, middle: true, pinky: true }))).toBe('7');
    expect(classifyStaticNumber(makeNumberHand({ thumb: 'touch_middle', index: true, ring: true, pinky: true }))).toBe('8');
    expect(classifyStaticNumber(makeNumberHand({ thumb: 'touch_index', middle: true, ring: true, pinky: true }))).toBe('9');
  });

  it('verifies static hold for numbers 0–9', () => {
    const v = createNumberVerifier();
    v.reset('0', { holdMs: 800 });
    const lm = makeNumberHand({ thumb: 'zero' });
    expect(v.update(frame(lm, 0), 0).verified).toBe(false);
    const mid = v.update(frame(lm, 400), 400);
    expect(mid.progress).toBeCloseTo(0.5);
    expect(mid.verified).toBe(false);
    expect(v.update(frame(lm, 800), 800).verified).toBe(true);
  });

  it('verifies dynamic number 10 on thumb-up shake and rejects static thumb-up', () => {
    const v = createNumberVerifier();
    v.reset('10');
    const xs = [0.5, 0.54, 0.58, 0.53, 0.47, 0.52, 0.57];
    let verified = false;
    xs.forEach((cx, i) => {
      const r = v.update(frame(makeNumberHand({ cx, thumb: 'out' }), i * 80), i * 80);
      if (r.verified) verified = true;
    });
    expect(verified).toBe(true);

    const staticV = createNumberVerifier();
    staticV.reset('10');
    for (let i = 0; i < 12; i += 1) {
      expect(staticV.update(frame(makeNumberHand({ cx: 0.5, thumb: 'out' }), i * 80), i * 80).verified).toBe(false);
    }
  });
});
