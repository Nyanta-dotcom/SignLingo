/** Capture recorder for /collect: 3 s countdown, then keep `count` frames that contain a hand. Framework-free. */

import type { HandFrame } from './types';

export type RecorderState =
  | { phase: 'idle' }
  | { phase: 'countdown'; letter: string; remainingMs: number }
  | { phase: 'recording'; letter: string; collected: number; target: number }
  | { phase: 'done'; letter: string; frames: HandFrame[] };

export function createCaptureRecorder({ count = 40, countdownMs = 3000 }: { count?: number; countdownMs?: number } = {}) {
  let letter: string | null = null;
  let startedAt = 0;
  let frames: HandFrame[] = [];
  let done = false;

  const state = (nowMs: number): RecorderState => {
    if (!letter) return { phase: 'idle' };
    if (done) return { phase: 'done', letter, frames };
    const remainingMs = startedAt + countdownMs - nowMs;
    if (remainingMs > 0) return { phase: 'countdown', letter, remainingMs };
    return { phase: 'recording', letter, collected: frames.length, target: count };
  };

  return {
    start(next: string, nowMs: number) {
      letter = next;
      startedAt = nowMs;
      frames = [];
      done = false;
    },
    /** Feed every detected frame (or null when there is no hand). Frames during the countdown are dropped. */
    push(frame: HandFrame | null, nowMs: number): RecorderState {
      if (letter && !done && frame && nowMs >= startedAt + countdownMs) {
        frames.push(frame);
        if (frames.length >= count) done = true;
      }
      return state(nowMs);
    },
    cancel() {
      letter = null;
      frames = [];
      done = false;
    },
    state,
  };
}

export type CaptureRecorder = ReturnType<typeof createCaptureRecorder>;
