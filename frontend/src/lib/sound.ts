/** Short synthesised sounds (no audio files): correct, wrong, lesson finished. Off when the learner turns sound off. */

export type SoundName = 'correct' | 'wrong' | 'finish';
type Tone = { freq: number; at: number; dur: number };

const PATTERNS: Record<SoundName, Tone[]> = {
  correct: [{ freq: 880, at: 0, dur: 0.12 }, { freq: 1320, at: 0.1, dur: 0.18 }],
  wrong: [{ freq: 220, at: 0, dur: 0.22 }, { freq: 165, at: 0.18, dur: 0.28 }],
  finish: [{ freq: 523, at: 0, dur: 0.15 }, { freq: 659, at: 0.15, dur: 0.15 }, { freq: 784, at: 0.3, dur: 0.15 }, { freq: 1047, at: 0.45, dur: 0.35 }],
};

type Ctx = Pick<AudioContext, 'currentTime' | 'destination' | 'createOscillator' | 'createGain'> & { resume?: () => Promise<void> };

/** `enabled` is read at every play, so flipping the setting takes effect at once. Never throws. */
export function createSound({ enabled, makeContext }: { enabled: () => boolean; makeContext?: () => Ctx | null }) {
  let ctx: Ctx | null = null;
  const make = makeContext ?? (() => (typeof AudioContext === 'undefined' ? null : (new AudioContext() as Ctx)));
  return {
    play(name: SoundName): void {
      if (!enabled()) return;
      try {
        ctx ??= make();
        if (!ctx) return;
        void ctx.resume?.();
        const start = ctx.currentTime;
        for (const t of PATTERNS[name]) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = t.freq;
          gain.gain.setValueAtTime(0.15, start + t.at);
          gain.gain.exponentialRampToValueAtTime(0.001, start + t.at + t.dur);
          osc.connect(gain).connect(ctx.destination);
          osc.start(start + t.at);
          osc.stop(start + t.at + t.dur);
        }
      } catch {
        /* audio is a nicety: a blocked or missing AudioContext must never break a lesson */
      }
    },
  };
}
