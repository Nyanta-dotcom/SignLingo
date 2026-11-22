import { describe, expect, it, vi } from 'vitest';
import { createSound, type SoundName } from './sound';
import { classifyInteractiveTarget } from './uiSound';

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

  it('has a distinct sound for each event (lesson feedback and UI interactions)', () => {
    const notes = (name: SoundName) => {
      const { ctx, oscillators } = fakeContext();
      createSound({ enabled: () => true, makeContext: () => ctx }).play(name);
      return oscillators.map((o) => o.frequency.value);
    };
    const all: SoundName[] = ['correct', 'wrong', 'finish', 'click', 'tab'];
    expect(new Set(all.map((n) => notes(n).join())).size).toBe(all.length);
  });

  it('never throws when audio is missing or blocked', () => {
    expect(() => createSound({ enabled: () => true, makeContext: () => null }).play('wrong')).not.toThrow();
    expect(() => createSound({ enabled: () => true, makeContext: () => { throw new Error('blocked'); } }).play('finish')).not.toThrow();
  });
});

describe('classifyInteractiveTarget', () => {
  it('maps buttons to click, links/tabs/radios to tab, and ignores disabled or non-interactive elements', () => {
    const btn = document.createElement('button');
    const span = document.createElement('span');
    btn.appendChild(span);
    expect(classifyInteractiveTarget(span)).toBe('click');

    btn.disabled = true;
    expect(classifyInteractiveTarget(span)).toBeNull();

    const link = document.createElement('a');
    link.href = '/learn';
    expect(classifyInteractiveTarget(link)).toBe('tab');

    const tab = document.createElement('button');
    tab.setAttribute('role', 'tab');
    expect(classifyInteractiveTarget(tab)).toBe('tab');

    const plain = document.createElement('p');
    expect(classifyInteractiveTarget(plain)).toBeNull();
  });
});
