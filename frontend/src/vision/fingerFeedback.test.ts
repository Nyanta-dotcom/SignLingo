import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeLandmarks } from './normalizer';
import { FINGER_JOINTS, fingerAngles, fingerFeedback } from './fingerFeedback';
import type { ClassTemplate, HandFrame, Landmark } from './types';

/** A hand with every finger straight: wrist at the origin, each finger a vertical line. */
function straightHand(): Landmark[] {
  const pts: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  const bases = [1, 5, 9, 13, 17];
  bases.forEach((b, f) => {
    for (let j = 0; j < 4; j++) pts[b + j] = { x: 0.1 * f, y: -(0.2 + 0.1 * j), z: 0 };
  });
  return pts;
}
const frame = (landmarks: Landmark[]): HandFrame => ({ landmarks, handedness: 'Right', score: 1, timestampMs: 0 });

describe('fingerAngles', () => {
  it('has 15 angles, thumb first, named finger_joint', () => {
    expect(FINGER_JOINTS).toHaveLength(15);
    expect(FINGER_JOINTS[0]).toBe('thumb_cmc');
    expect(FINGER_JOINTS[14]).toBe('pinky_dip');
  });

  it('a straight finger measures 180 degrees and a right angle 90', () => {
    const a = fingerAngles(straightHand());
    expect(a[4]).toBeCloseTo(180, 0); // index pip
    const bent = straightHand();
    bent[8] = { x: 0.2, y: bent[7].y, z: 0 }; // index tip sticks out sideways from the dip joint
    expect(fingerAngles(bent)[5]).toBeCloseTo(90, 1);
  });
});

describe('fingerFeedback', () => {
  const template = (angle: number, std = 5): ClassTemplate => ({
    finger_angles: Array(15).fill(angle),
    finger_angles_std: Array(15).fill(std),
  });

  it('reports nothing when the hand matches the template', () => {
    const hand = straightHand();
    const own: ClassTemplate = { finger_angles: fingerAngles(hand), finger_angles_std: Array(15).fill(5) };
    expect(fingerFeedback(frame(hand), own)).toEqual([]);
  });

  it('flags a finger that deviates by more than max(2 sigma, 20 degrees), most deviant first', () => {
    const bent = straightHand();
    bent[8] = { x: 0.2, y: bent[7].y, z: 0 }; // index dip -> 90 degrees (90 below the template)
    const r = fingerFeedback(frame(bent), template(180));
    expect(r[0]).toMatchObject({ finger: 'index', joint: 'index_dip' });
    expect(r[0].deltaDeg).toBeCloseTo(-90, 1);
    expect(r[0].hint).toMatch(/trỏ/i);
    expect(r.every((x) => Math.abs(x.deltaDeg) > 20)).toBe(true);
  });

  it('a wide template spread widens the tolerance (2 sigma beats the 20 degree floor)', () => {
    const bent = straightHand();
    bent[8] = { x: 0.2, y: bent[7].y, z: 0 };
    expect(fingerFeedback(frame(bent), template(180, 60))).toEqual([]); // 2 sigma = 120 > 90
  });

  it('tells the learner to bend when too straight and to straighten when too bent', () => {
    const tooStraight = fingerFeedback(frame(straightHand()), template(90));
    expect(tooStraight.length).toBeGreaterThan(0);
    expect(tooStraight[0].deltaDeg).toBeGreaterThan(0);
    expect(tooStraight[0].hint).toMatch(/gập/i);
    const bent = straightHand();
    bent[8] = { x: 0.2, y: bent[7].y, z: 0 };
    expect(fingerFeedback(frame(bent), template(180))[0].hint).toMatch(/duỗi/i);
  });

  it('rejects a template that is not 15 angles', () => {
    expect(() => fingerFeedback(frame(straightHand()), { finger_angles: [1], finger_angles_std: [1] })).toThrow(/15/);
  });
});

describe('fingerAngles agrees with the Python implementation', () => {
  // Reference values computed by ml/src/signlingo_ml/landmarks/templates.py::finger_angles_deg on the
  // first three non-degenerate fixture cases (angles do not depend on scale or translation).
  const PYTHON = [
    [154.44, 174.0939, 179.9996, 88.7811, 153.435, 172.1847, 66.8014, 151.0736, 177.6627, 11.3099, 168.6901, 179.9998, 52.125, 179.9996, 161.5651],
    [143.9581, 107.3005, 150.7086, 165.2007, 173.1881, 178.8912, 179.9998, 176.1859, 176.1859, 170.7682, 20.6589, 172.9987, 130.6216, 46.8965, 159.3701],
    [151.641, 124.3188, 152.5924, 152.3189, 175.8151, 170.7539, 176.0548, 176.8202, 172.875, 174.0939, 23.9625, 164.1676, 144.8513, 39.0939, 162.8973],
  ];
  it('matches within 0.01 degree', () => {
    const fx = JSON.parse(readFileSync(resolve(process.cwd(), '../shared/contracts/fixtures/landmarks_lm-v1.json'), 'utf8')) as {
      cases: Array<{ input: HandFrame; expected: number[] | null }>;
    };
    fx.cases.filter((c) => c.expected !== null).slice(0, 3).forEach((c, k) => {
      const norm = normalizeLandmarks(c.input)!;
      const lm: Landmark[] = Array.from({ length: 21 }, (_, i) => ({ x: norm[2 * i], y: norm[2 * i + 1], z: 0 }));
      fingerAngles(lm).forEach((a, i) => expect(Math.abs(a - PYTHON[k][i])).toBeLessThan(0.01));
    });
  });
});
