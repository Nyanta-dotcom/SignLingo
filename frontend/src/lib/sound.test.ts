import { describe, expect, it, vi } from 'vitest';
import { createSound } from './sound';

function fakeContext() {
  const oscillators: Array<{ frequency: { value: number }; start: ReturnType<typeof vi.fn> }> = [];
  const node = () => ({ connect: (n: unknown) => n, gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } });
  const ctx = {
    currentTime: 0, destination: {}, resume: vi.fn(async () => {}),
    createGain: () => node(),
    createOscillator: () => {
      const o = { ...node(), type: '', frequency: { value: 0 }, start: vi.fn(), stop: vi.fn() };
      oscillators.push(o);
      return o;
    },
  };
  return { ctx: ctx as never, oscillators };
}

describe('createSound', () => {
  it('plays nothing while sound is off, and reads the setting at every play', () => {
    const { ctx, oscillators } = fakeContext();
    let on = false;
    const s = createSound({ enabled: () => on, makeContext: () => ctx });
    s.play('correct');
    expect(oscillators).toHaveLength(0);
    on = true;
    s.play('correct');
    expect(oscillators.length).toBeGreaterThan(0);
  });

  it('has a distinct sound for each event (different notes)', () => {
    const notes = (name: 'correct' | 'wrong' | 'finish') => {
      const { ctx, oscillators } = fakeContext();
      createSound({ enabled: () => true, makeContext: () => ctx }).play(name);
      return oscillators.map((o) => o.frequency.value);
    };
    expect(new Set([notes('correct').join(), notes('wrong').join(), notes('finish').join()]).size).toBe(3);
  });

  it('never throws when audio is missing or blocked', () => {
    expect(() => createSound({ enabled: () => true, makeContext: () => null }).play('wrong')).not.toThrow();
    expect(() => createSound({ enabled: () => true, makeContext: () => { throw new Error('blocked'); } }).play('finish')).not.toThrow();
  });
});
