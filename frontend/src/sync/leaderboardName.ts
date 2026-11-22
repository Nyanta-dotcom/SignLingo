/** The name shown on the leaderboard: 2 to 24 characters, no control characters, spaces tidied. */

export const NAME_MIN = 2;
export const NAME_MAX = 24;

/** The cleaned name, or null when it cannot be used. */
export function cleanDisplayName(raw: string): string | null {
  const name = raw.replace(/\s+/g, ' ').trim();
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(name)) return null;
  const length = [...name].length;
  return length >= NAME_MIN && length <= NAME_MAX ? name : null;
}
