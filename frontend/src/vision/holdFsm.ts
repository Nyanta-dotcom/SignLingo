/** Hold-to-Verify state machine (docs/02 §5.2, FT-LRN-03). Pure: time is passed in, no DOM. */

import type { HoldCfg, HoldState } from './types';

export interface HoldVerifier {
  reset(target: string, cfg: HoldCfg): void;
  update(input: { label: string | null; confidence: number; nowMs: number }): { state: HoldState; progress: number };
}

export function createHoldVerifier(): HoldVerifier {
  let state: HoldState = 'idle';
  let target = '';
  let cfg: HoldCfg;
  let startedAt: number | null = null; // first frame of this attempt (for the time limit)
  let holdStart: number | null = null; // start of the current continuous hold
  let lastGood = 0;

  const out = (progress: number) => ({ state, progress });

  return {
    reset(newTarget, newCfg) {
      state = 'searching';
      target = newTarget;
      cfg = newCfg;
      startedAt = holdStart = null;
    },
    update({ label, confidence, nowMs }) {
      if (state === 'idle') return out(0);
      if (state === 'verified') return out(1);
      if (state === 'timed_out') return out(0);
      startedAt ??= nowMs;

      if (label === target && confidence >= cfg.threshold) {
        holdStart ??= nowMs;
        lastGood = nowMs;
      } else if (holdStart !== null && nowMs - lastGood > cfg.graceMs) {
        holdStart = null;
      }

      if (holdStart !== null) {
        const held = nowMs - holdStart;
        if (held >= cfg.holdMs) {
          state = 'verified';
          return out(1);
        }
        state = 'holding';
        return out(held / cfg.holdMs);
      }
      state = 'searching';
      if (nowMs - startedAt >= cfg.timeLimitMs) {
        state = 'timed_out';
        return out(0);
      }
      return out(0);
    },
  };
}
