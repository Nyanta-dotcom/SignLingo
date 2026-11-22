/**
 * Rule-based 2D trajectory recognizer for dynamic ASL letters J and Z.
 * Pure TypeScript (no React, no DOM): combines rotation-invariant handshape gating
 * (pinky extended for J, index extended for Z) with palm-scale-normalized fingertip trajectories.
 * Works identically for mirrored/unmirrored cameras and left/right hands.
 */

import type { HandFrame, Landmark } from './types';

export type DynamicLetter = 'J' | 'Z';
export type TrailPoint = { x: number; y: number };

export type DynamicUpdate = {
  target: DynamicLetter;
  poseMatch: boolean;
  progress: number;
  verified: boolean;
  trail: TrailPoint[];
};

export type PassiveDynamicUpdate = {
  detected: DynamicLetter | null;
  candidate: DynamicLetter | null;
  progress: number;
  trail: TrailPoint[];
};

const WINDOW_MS = 2200;
const POSE_GRACE_MS = 380;
const MAX_POINTS = 64;
const COOLDOWN_MS = 1200;

export function isDynamicLetter(letter: string | null | undefined): letter is DynamicLetter {
  return letter === 'J' || letter === 'Z';
}

const dist2 = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function palmScale(lm: readonly Landmark[]): number {
  if (lm.length < 21) return 0.1;
  return Math.max(0.03, dist2(lm[0], lm[9]));
}

function fingerExtended(lm: readonly Landmark[], mcp: number, pip: number, tip: number, palm: number): boolean {
  const tipWrist = dist2(lm[tip], lm[0]);
  const pipWrist = dist2(lm[pip], lm[0]);
  const tipMcp = dist2(lm[tip], lm[mcp]);
  return tipWrist > pipWrist * 1.1 && tipMcp > palm * 0.45;
}

function fingerFolded(lm: readonly Landmark[], mcp: number, pip: number, tip: number, palm: number): boolean {
  const tipWrist = dist2(lm[tip], lm[0]);
  const pipWrist = dist2(lm[pip], lm[0]);
  const tipMcp = dist2(lm[tip], lm[mcp]);
  return tipWrist < pipWrist * 1.2 || tipMcp < palm * 0.62;
}

/** Rotation-invariant J starting pose: pinky extended, index/middle/ring folded. */
export function isJPose(lm: readonly Landmark[]): boolean {
  if (lm.length < 21) return false;
  const p = palmScale(lm);
  return (
    fingerExtended(lm, 17, 18, 20, p) &&
    fingerFolded(lm, 5, 6, 8, p) &&
    fingerFolded(lm, 9, 10, 12, p) &&
    fingerFolded(lm, 13, 14, 16, p)
  );
}

/** Rotation-invariant Z starting pose: index extended, middle/ring/pinky folded. */
export function isZPose(lm: readonly Landmark[]): boolean {
  if (lm.length < 21) return false;
  const p = palmScale(lm);
  return (
    fingerExtended(lm, 5, 6, 8, p) &&
    fingerFolded(lm, 9, 10, 12, p) &&
    fingerFolded(lm, 13, 14, 16, p) &&
    fingerFolded(lm, 17, 18, 20, p)
  );
}

type TimedPoint = { x: number; y: number; palm: number; t: number };

function downsample(pts: readonly TimedPoint[], maxN: number): readonly TimedPoint[] {
  if (pts.length <= maxN) return pts;
  const out: TimedPoint[] = [];
  const step = (pts.length - 1) / (maxN - 1);
  for (let i = 0; i < maxN; i += 1) out.push(pts[Math.round(i * step)]);
  return out;
}

function medianPalm(pts: readonly TimedPoint[]): number {
  const sorted = pts.map((p) => p.palm).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] || 0.1;
}

/** Evaluates a pinky-tip trajectory for a J hook (downward stem + sideways curve + upward scoop). */
export function evaluateJ(pts: readonly TimedPoint[]): { verified: boolean; progress: number } {
  if (pts.length < 5) return { verified: false, progress: 0.1 };
  const sample = downsample(pts, 32);
  const palm = medianPalm(sample);
  const last = sample.length - 1;
  const end = sample[last];
  let bestProgress = 0.12;

  for (let start = 0; start <= last - 3; start += 1) {
    const a = sample[start];
    // Find lowest point (largest y) between start and end.
    let botIdx = start;
    for (let k = start + 1; k <= last; k += 1) {
      if (sample[k].y > sample[botIdx].y) botIdx = k;
    }
    const b = sample[botIdx];
    const drop = (b.y - a.y) / palm;
    if (drop < 0.12) continue;

    const stemDx = Math.abs(b.x - a.x) / palm;
    const dropRatio = clamp01(drop / 0.42);
    bestProgress = Math.max(bestProgress, 0.12 + 0.42 * dropRatio);

    if (botIdx >= last) continue;
    const hookFromBotX = Math.abs(end.x - b.x) / palm;
    const totalDx = Math.abs(end.x - a.x) / palm;
    const hookUp = (b.y - end.y) / palm;

    const hookProgress = (clamp01(hookFromBotX / 0.18) + clamp01(hookUp / 0.12)) / 2;
    bestProgress = Math.max(bestProgress, 0.54 + 0.4 * hookProgress);

    const stemMostlyDown = drop >= stemDx * 0.55;
    if (drop >= 0.42 && totalDx >= 0.3 && hookFromBotX >= 0.18 && hookUp >= 0.12 && stemMostlyDown) {
      return { verified: true, progress: 1 };
    }
  }
  return { verified: false, progress: Math.min(0.95, bestProgress) };
}

/** Evaluates an index-tip trajectory for a Z zigzag (horizontal -> diagonal down-back -> horizontal). */
export function evaluateZ(pts: readonly TimedPoint[]): { verified: boolean; progress: number } {
  if (pts.length < 6) return { verified: false, progress: 0.1 };
  const sample = downsample(pts, 26);
  const palm = medianPalm(sample);
  const last = sample.length - 1;
  const d = sample[last];
  let bestProgress = 0.1;

  for (let i = 0; i <= last - 3; i += 1) {
    const a = sample[i];
    for (let j = i + 1; j <= last - 2; j += 1) {
      const b = sample[j];
      const dx1 = (b.x - a.x) / palm;
      const dy1 = (b.y - a.y) / palm;
      const absDx1 = Math.abs(dx1);
      if (absDx1 < 0.2 || Math.abs(dy1) > absDx1 * 0.7) continue;

      const s = Math.sign(dx1);
      bestProgress = Math.max(bestProgress, 0.1 + 0.25 * clamp01(absDx1 / 0.4));
      if (absDx1 < 0.36) continue;

      for (let k = j + 1; k <= last - 1; k += 1) {
        const c = sample[k];
        const dx2 = (c.x - b.x) / palm;
        const dy2 = (c.y - b.y) / palm;
        const revX = -dx2 * s;
        if (dy2 < 0.18 || revX < 0.15) continue;

        const diagRatio = (clamp01(dy2 / 0.38) + clamp01(revX / 0.32)) / 2;
        bestProgress = Math.max(bestProgress, 0.35 + 0.33 * diagRatio);
        if (dy2 < 0.36 || revX < 0.3) continue;

        const dx3 = (d.x - c.x) / palm;
        const dy3 = (d.y - c.y) / palm;
        const fwdX = dx3 * s;
        if (fwdX <= 0) continue;

        const s3Ratio = clamp01(fwdX / 0.4);
        bestProgress = Math.max(bestProgress, 0.68 + 0.27 * s3Ratio);

        if (absDx1 >= 0.4 && dy2 >= 0.38 && revX >= 0.32 && fwdX >= 0.4 && Math.abs(dy3) <= fwdX * 0.7) {
          return { verified: true, progress: 1 };
        }
      }
    }
  }
  return { verified: false, progress: Math.min(0.95, bestProgress) };
}

function tipOf(lm: readonly Landmark[], letter: DynamicLetter): Landmark {
  return letter === 'J' ? lm[20] : lm[8];
}

function poseMatches(lm: readonly Landmark[], letter: DynamicLetter): boolean {
  return letter === 'J' ? isJPose(lm) : isZPose(lm);
}

function prune(pts: TimedPoint[], nowMs: number) {
  while (pts.length > 0 && nowMs - pts[0].t > WINDOW_MS) pts.shift();
  while (pts.length > MAX_POINTS) pts.shift();
}

/**
 * Targeted verifier used during lessons (`perform_dynamic` for J or Z).
 * Buffers the relevant fingertip while the pose holds and verifies once the stroke completes.
 */
export function createDynamicVerifier() {
  let target: DynamicLetter = 'J';
  let pts: TimedPoint[] = [];
  let lastPoseMs = -Infinity;

  return {
    reset(next: DynamicLetter) {
      target = next;
      pts = [];
      lastPoseMs = -Infinity;
    },
    update(frame: HandFrame | null, nowMs: number): DynamicUpdate {
      if (!frame) {
        if (nowMs - lastPoseMs > POSE_GRACE_MS) pts = [];
        return { target, poseMatch: false, progress: 0, verified: false, trail: pts.map(({ x, y }) => ({ x, y })) };
      }
      const match = poseMatches(frame.landmarks, target);
      if (!match) {
        if (nowMs - lastPoseMs > POSE_GRACE_MS) pts = [];
        return { target, poseMatch: false, progress: 0, verified: false, trail: pts.map(({ x, y }) => ({ x, y })) };
      }

      lastPoseMs = nowMs;
      const tip = tipOf(frame.landmarks, target);
      pts.push({ x: tip.x, y: tip.y, palm: palmScale(frame.landmarks), t: nowMs });
      prune(pts, nowMs);

      const evalRes = target === 'J' ? evaluateJ(pts) : evaluateZ(pts);
      return {
        target,
        poseMatch: true,
        progress: evalRes.progress,
        verified: evalRes.verified,
        trail: pts.map(({ x, y }) => ({ x, y })),
      };
    },
  };
}

/**
 * Passive detector for Free Practice: automatically spots J or Z strokes whenever the user
 * traces with a pinky-up (J) or index-up (Z) handshape, with cooldown to avoid double-typing.
 */
export function createPassiveDynamicDetector() {
  let active: DynamicLetter | null = null;
  let pts: TimedPoint[] = [];
  let lastPoseMs = -Infinity;
  let cooldownUntil = -Infinity;

  return {
    reset() {
      active = null;
      pts = [];
      lastPoseMs = -Infinity;
      cooldownUntil = -Infinity;
    },
    update(frame: HandFrame | null, nowMs: number): PassiveDynamicUpdate {
      if (!frame || nowMs < cooldownUntil) {
        if (!frame && nowMs - lastPoseMs > POSE_GRACE_MS) {
          active = null;
          pts = [];
        }
        return { detected: null, candidate: null, progress: 0, trail: [] };
      }

      const pose: DynamicLetter | null = isJPose(frame.landmarks) ? 'J' : isZPose(frame.landmarks) ? 'Z' : null;
      if (!pose) {
        if (nowMs - lastPoseMs > POSE_GRACE_MS) {
          active = null;
          pts = [];
        }
        return { detected: null, candidate: null, progress: 0, trail: [] };
      }

      if (active !== pose) {
        active = pose;
        pts = [];
      }
      lastPoseMs = nowMs;
      const tip = tipOf(frame.landmarks, pose);
      pts.push({ x: tip.x, y: tip.y, palm: palmScale(frame.landmarks), t: nowMs });
      prune(pts, nowMs);

      const evalRes = pose === 'J' ? evaluateJ(pts) : evaluateZ(pts);
      // Only show trail once the user has started clearly moving (avoids flickering trail while holding static I/D).
      const trail = evalRes.progress >= 0.25 ? pts.map(({ x, y }) => ({ x, y })) : [];
      if (evalRes.verified) {
        const hit = pose;
        const hitTrail = pts.map(({ x, y }) => ({ x, y }));
        active = null;
        pts = [];
        cooldownUntil = nowMs + COOLDOWN_MS;
        return { detected: hit, candidate: hit, progress: 1, trail: hitTrail };
      }
      return { detected: null, candidate: evalRes.progress >= 0.25 ? pose : null, progress: evalRes.progress, trail };
    },
  };
}

export type DynamicVerifier = ReturnType<typeof createDynamicVerifier>;
export type PassiveDynamicDetector = ReturnType<typeof createPassiveDynamicDetector>;
