import { describe, expect, it } from 'vitest';
import { createLetterTyper } from './letterTyper';

const CFG = { holdMs: 1000, threshold: 0.6, graceMs: 150 };
const see = (label: string | null, nowMs: number, confidence = 0.9) => ({ label, confidence, nowMs });

describe('LetterTyper (free practice: hold a sign to type it)', () => {
  it('types a letter after it is held for hold_ms and shows progress on the way', () => {
    const t = createLetterTyper(CFG);
    expect(t.update(see('H', 0))).toMatchObject({ candidate: 'H', progress: 0, text: '' });
    expect(t.update(see('H', 500)).progress).toBeCloseTo(0.5);
    const r = t.update(see('H', 1000));
    expect(r).toMatchObject({ text: 'H', appended: 'H' });
  });

  it('does not type a letter shown for less than hold_ms', () => {
    const t = createLetterTyper(CFG);
    t.update(see('H', 0));
    t.update(see('H', 600));
    expect(t.update(see('E', 700)).text).toBe('');
  });

  it('restarts the timer when the label changes', () => {
    const t = createLetterTyper(CFG);
    t.update(see('H', 0));
    t.update(see('H', 900));
    t.update(see('E', 1000));
    expect(t.update(see('E', 1900)).text).toBe('');
    expect(t.update(see('E', 2000)).text).toBe('E');
  });

  it('forgives a one-frame glitch within the grace period', () => {
    const t = createLetterTyper(CFG);
    t.update(see('H', 0));
    t.update(see('E', 400));
    t.update(see('H', 500));
    expect(t.update(see('H', 1000)).text).toBe('H');
  });

  it('ignores low-confidence labels', () => {
    const t = createLetterTyper(CFG);
    t.update(see('H', 0, 0.3));
    expect(t.update(see('H', 1200, 0.3))).toMatchObject({ text: '', candidate: null });
  });

  it('needs the hand to be released before the same letter is typed again (LL)', () => {
    const t = createLetterTyper(CFG);
    t.update(see('L', 0));
    expect(t.update(see('L', 1000)).text).toBe('L');
    expect(t.update(see('L', 3000)).text).toBe('L'); // still holding: no repeat
    t.update(see(null, 3100, 0)); // hand removed
    t.update(see(null, 3400, 0));
    t.update(see('L', 3500));
    expect(t.update(see('L', 4500)).text).toBe('LL');
  });

  it('a different letter can follow immediately', () => {
    const t = createLetterTyper(CFG);
    t.update(see('H', 0));
    t.update(see('H', 1000));
    t.update(see('I', 1100));
    expect(t.update(see('I', 2100)).text).toBe('HI');
  });

  it('space, backspace and clear edit the text', () => {
    const t = createLetterTyper(CFG);
    t.update(see('H', 0));
    t.update(see('H', 1000));
    t.space();
    expect(t.text()).toBe('H ');
    t.backspace();
    t.backspace();
    expect(t.text()).toBe('');
    t.backspace();
    expect(t.text()).toBe('');
    t.update(see('E', 2000));
    t.update(see('E', 3000));
    t.clear();
    expect(t.text()).toBe('');
  });
});
