import { describe, expect, it } from 'vitest';
import { createSpeller } from './spellWord';

describe('createSpeller', () => {
  it('walks through the letters in order and finishes', () => {
    const s = createSpeller('cab');
    expect(s.letters).toEqual(['C', 'A', 'B']);
    expect([s.current(), s.ready()]).toEqual(['C', true]);
    s.verified();
    expect(s.current()).toBe('A');
    s.verified();
    s.verified();
    expect([s.done(), s.current(), s.ready(), s.position()]).toEqual([true, null, false, 3]);
  });

  it('makes a repeated letter ("LL") wait for a release, and a change of sign counts as one', () => {
    const s = createSpeller('HELLO');
    s.verified();
    s.verified();
    s.verified(); // first L
    expect(s.current()).toBe('L');
    expect(s.ready()).toBe(false);
    s.observe('L'); // still holding the same sign
    expect(s.ready()).toBe(false);
    s.observe(null); // hand released
    expect(s.ready()).toBe(true);
    s.verified(); // second L
    expect([s.current(), s.ready()]).toEqual(['O', true]); // a different letter needs no release
  });

  it('also accepts a different sign (not only no hand) as the release', () => {
    const s = createSpeller('AA');
    s.verified();
    expect(s.ready()).toBe(false);
    s.observe('B');
    expect(s.ready()).toBe(true);
  });

  it('is empty-safe', () => {
    const s = createSpeller('');
    expect([s.done(), s.current(), s.ready()]).toEqual([true, null, false]);
  });
});
