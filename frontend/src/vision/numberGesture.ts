/**
 * Rule-based geometric 21-landmark recognizer for ASL numbers 1–10.
 * Pure TypeScript (no React, no DOM):
 * - 1–5: extended finger combinations (3 = thumb + index + middle).
 * - 6–9: thumb touching pinky (6), ring (7), middle (8), or index (9) while other 3 fingers stay extended.
 * - 10: dynamic thumb-up wrist shake over a sliding time window.
 */

import type { TrailPoint } from './dynamicGesture';
import type { HandFrame, Landmark } from './types';

export type NumberSign = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10';
export type StaticNumberSign = Exclude<NumberSign, '10'>;

export type NumberUpdate = {
  detected: NumberSign | null;
  progress: number;
  verified: boolean;
  trail: TrailPoint[];
};

const ALL_NUMBERS: ReadonlySet<string> = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
const SHAKE_WINDOW_MS = 1800;
const GRACE_MS = 220;

export function isNumberSign(value: string | null | undefined): value is NumberSign {
  return Boolean(value && ALL_NUMBERS.has(value));
}

const dist2 = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function palmScale(lm: readonly Landmark[]): number {
  return lm.length >= 21 ? Math.max(0.03, dist2(lm[0], lm[9])) : 0.1;
}

function fingerExtended(lm: readonly Landmark[], mcp: number, pip: number, tip: number, palm: number): boolean {
  return dist2(lm[tip], lm[0]) > dist2(lm[pip], lm[0]) * 1.08 && dist2(lm[tip], lm[mcp]) > palm * 0.45;
}

function fingerFolded(lm: readonly Landmark[], mcp: number, pip: number, tip: number, palm: number): boolean {
  return dist2(lm[tip], lm[0]) < dist2(lm[pip], lm[0]) * 1.2 || dist2(lm[tip], lm[mcp]) < palm * 0.62;
}

function thumbExtended(lm: readonly Landmark[], palm: number): boolean {
  return dist2(lm[4], lm[17]) > palm * 1.12 && dist2(lm[4], lm[5]) > palm * 0.52;
}

function thumbFolded(lm: readonly Landmark[], palm: number): boolean {
  return dist2(lm[4], lm[17]) < palm * 1.05 || dist2(lm[4], lm[9]) < palm * 0.72;
}

function thumbUpPose(lm: readonly Landmark[], palm: number): boolean {
  return (
    dist2(lm[4], lm[5]) > palm * 0.5 &&
    dist2(lm[4], lm[0]) > dist2(lm[3], lm[0]) * 1.04 &&
    fingerFolded(lm, 5, 6, 8, palm) &&
    fingerFolded(lm, 9, 10, 12, palm) &&
    fingerFolded(lm, 13, 14, 16, palm) &&
    fingerFolded(lm, 17, 18, 20, palm)
  );
}

/** Classifies static ASL numbers 1–9 from a single 21-point hand frame. */
export function classifyStaticNumber(lm: readonly Landmark[]): StaticNumberSign | null {
  if (lm.length < 21) return null;
  const p = palmScale(lm);

  const idxUp = fingerExtended(lm, 5, 6, 8, p);
  const midUp = fingerExtended(lm, 9, 10, 12, p);
  const ringUp = fingerExtended(lm, 13, 14, 16, p);
  const pnkUp = fingerExtended(lm, 17, 18, 20, p);

  const midFold = fingerFolded(lm, 9, 10, 12, p);
  const ringFold = fingerFolded(lm, 13, 14, 16, p);
  const pnkFold = fingerFolded(lm, 17, 18, 20, p);

  // Check thumb-touching numbers 6–9 first (distinctive pinch + 3 extended fingers)
  const touchIdx = dist2(lm[4], lm[8]) < p * 0.48;
  const touchMid = dist2(lm[4], lm[12]) < p * 0.48;
  const touchRing = dist2(lm[4], lm[16]) < p * 0.48;
  const touchPnk = dist2(lm[4], lm[20]) < p * 0.48;

  if (touchPnk && idxUp && midUp && ringUp) return '6';
  if (touchRing && idxUp && midUp && pnkUp) return '7';
  if (touchMid && idxUp && ringUp && pnkUp) return '8';
  if (touchIdx && midUp && ringUp && pnkUp) return '9';

  const thUp = thumbExtended(lm, p);
  const thFold = thumbFolded(lm, p);

  if (thUp && idxUp && midUp && ringUp && pnkUp) return '5';
  if (thFold && idxUp && midUp && ringUp && pnkUp) return '4';
  if (thUp && idxUp && midUp && ringFold && pnkFold) return '3';
  if (thFold && idxUp && midUp && ringFold && pnkFold) return '2';
  if (thFold && idxUp && midFold && ringFold && pnkFold) return '1';

  return null;
}

type ShakeSample = { x: number; y: number; palm: number; t: number };

function evaluateTenShake(pts: readonly ShakeSample[]): { verified: boolean; progress: number } {
  if (pts.length < 5) return { verified: false, progress: 0.12 };
  const palm = pts[Math.floor(pts.length / 2)].palm || 0.1;
  let totalX = 0;
  let minX = pts[0].x;
  let maxX = pts[0].x;
  let reversals = 0;
  let lastDir = 0;

  for (let i = 1; i < pts.length; i += 1) {
    const dx = pts[i].x - pts[i - 1].x;
    totalX += Math.abs(dx);
    minX = Math.min(minX, pts[i].x);
    maxX = Math.max(maxX, pts[i].x);
    if (Math.abs(dx) > palm * 0.04) {
      const dir = Math.sign(dx);
      if (lastDir !== 0 && dir !== lastDir) reversals += 1;
      lastDir = dir;
    }
  }

  const span = (maxX - minX) / palm;
  const travel = totalX / palm;
  const prog = Math.max(0.15, (clamp01(span / 0.25) + clamp01(travel / 0.5) + clamp01(reversals / 2)) / 3);
  const verified = span >= 0.22 && travel >= 0.45 && reversals >= 2;
  return { verified, progress: verified ? 1 : Math.min(0.95, prog) };
}

/** Targeted verifier for ASL numbers 1–10 (static hold for 1–9, dynamic thumb shake for 10). */
export function createNumberVerifier() {
  let target: NumberSign = '1';
  let holdMs = 1000;
  let since: number | null = null;
  let lastMatchMs = -Infinity;
  let shakePts: ShakeSample[] = [];

  return {
    reset(next: NumberSign, cfg: { holdMs?: number } = {}) {
      target = next;
      holdMs = cfg.holdMs ?? 1000;
      since = null;
      lastMatchMs = -Infinity;
      shakePts = [];
    },
    update(frame: HandFrame | null, nowMs: number): NumberUpdate {
      if (!frame) {
        if (nowMs - lastMatchMs > GRACE_MS) {
          since = null;
          shakePts = [];
        }
        return { detected: null, progress: 0, verified: false, trail: [] };
      }

      if (target === '10') {
        const p = palmScale(frame.landmarks);
        if (!thumbUpPose(frame.landmarks, p)) {
          if (nowMs - lastMatchMs > GRACE_MS) shakePts = [];
          return { detected: classifyStaticNumber(frame.landmarks), progress: 0, verified: false, trail: [] };
        }
        lastMatchMs = nowMs;
        const tip = frame.landmarks[4];
        shakePts.push({ x: tip.x, y: tip.y, palm: p, t: nowMs });
        while (shakePts.length > 0 && nowMs - shakePts[0].t > SHAKE_WINDOW_MS) shakePts.shift();
        const res = evaluateTenShake(shakePts);
        return {
          detected: '10',
          progress: res.progress,
          verified: res.verified,
          trail: shakePts.map(({ x, y }) => ({ x, y })),
        };
      }

      const detected = classifyStaticNumber(frame.landmarks);
      if (detected === target) {
        since ??= nowMs;
        lastMatchMs = nowMs;
        const progress = clamp01((nowMs - since) / holdMs);
        return { detected, progress, verified: progress >= 1, trail: [] };
      }
      if (nowMs - lastMatchMs > GRACE_MS) since = null;
      return { detected, progress: since !== null ? clamp01((lastMatchMs - since) / holdMs) : 0, verified: false, trail: [] };
    },
  };
}
