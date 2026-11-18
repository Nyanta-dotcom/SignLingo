/**
 * Fingerspelling progress (AC-LRN-05): the letters of a word must be verified in order. A letter
 * that repeats ("LL" in HELLO) needs the hand released or changed to another sign in between,
 * otherwise one long hold would count twice. Pure: no DOM, no timers.
 */

export function createSpeller(word: string) {
  const letters = [...word.toUpperCase()];
  let position = 0;
  let mustRelease: string | null = null;

  return {
    letters,
    position: () => position,
    done: () => position >= letters.length,
    /** The letter to aim at now, or null when the word is complete. */
    current: () => (position < letters.length ? letters[position] : null),
    /** True when the current letter may be aimed at (a repeated letter first needs a release). */
    ready: () => position < letters.length && mustRelease === null,
    /** The current letter was verified. */
    verified(): void {
      const just = letters[position];
      position += 1;
      mustRelease = position < letters.length && letters[position] === just ? just : null;
    },
    /** What the model sees now (null = no hand). Releasing or changing sign clears a pending release. */
    observe(label: string | null): void {
      if (mustRelease !== null && (label === null || label !== mustRelease)) mustRelease = null;
    },
  };
}

export type Speller = ReturnType<typeof createSpeller>;
