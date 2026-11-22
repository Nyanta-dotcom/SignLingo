/** Short synthesised sounds (no audio files): joyful Duolingo-style chimes for correct, wrong, and lesson finished. */

export type SoundName = 'correct' | 'wrong' | 'finish';
type Tone = { freq: number; at: number; dur: number; type?: OscillatorType; vol?: number };

const PATTERNS: Record<SoundName, Tone[]> = {
  // Crisp rising two-note chime with a gentle octave shimmer
  correct: [
    { freq: 784, at: 0, dur: 0.12, type: 'triangle', vol: 0.16 },
    { freq: 1046.5, at: 0.09, dur: 0.24, type: 'triangle', vol: 0.18 },
    { freq: 1568, at: 0.09, dur: 0.22, type: 'sine', vol: 0.08 },
  ],
  // Soft, gentle descending double-boop
  wrong: [
    { freq: 330, at: 0, dur: 0.16, type: 'triangle', vol: 0.14 },
    { freq: 247, at: 0.14, dur: 0.26, type: 'triangle', vol: 0.14 },
  ],
  // Bouncy Duolingo-inspired victory fanfare (C5 -> E5 -> G5 -> B5 -> sparkling C major chord)
  finish: [
    { freq: 523.25, at: 0, dur: 0.13, type: 'triangle', vol: 0.16 },
    { freq: 659.25, at: 0.11, dur: 0.13, type: 'triangle', vol: 0.16 },
    { freq: 783.99, at: 0.22, dur: 0.13, type: 'triangle', vol: 0.17 },
    { freq: 987.77, at: 0.33, dur: 0.12, type: 'triangle', vol: 0.17 },
    // Climax chord: C6 + G5 + E5 + bright C7 sparkle
    { freq: 1046.5, at: 0.44, dur: 0.55, type: 'triangle', vol: 0.2 },
    { freq: 783.99, at: 0.44, dur: 0.52, type: 'sine', vol: 0.12 },
    { freq: 659.25, at: 0.44, dur: 0.5, type: 'sine', vol: 0.1 },
    { freq: 2093, at: 0.48, dur: 0.38, type: 'sine', vol: 0.06 },
  ],
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
          osc.type = t.type ?? 'triangle';
          osc.frequency.value = t.freq;
          gain.gain.setValueAtTime(t.vol ?? 0.15, start + t.at);
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
