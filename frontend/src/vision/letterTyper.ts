/**
 * Free-practice typing (docs/05 §5.4): hold a letter for hold_ms and it is appended to the text.
 * The same letter is not repeated while it stays held; release the hand (or change letter) first,
 * so "LL" works. A different letter must persist longer than the grace period before it replaces
 * the one being timed, so a single noisy frame does not restart the clock. Pure: time is passed in.
 */

export type TyperCfg = { holdMs: number; threshold: number; graceMs: number };
export type TyperResult = { candidate: string | null; progress: number; text: string; appended: string | null };

export function createLetterTyper({ holdMs, threshold, graceMs }: TyperCfg) {
  let text = '';
  let candidate: string | null = null;
  let since = 0; // when the candidate started to be held
  let lastSeen = 0; // last time the candidate was seen
  let pending: { label: string; since: number } | null = null; // another letter that may replace it
  let blocked: string | null = null; // letter just typed: must be released before it can repeat

  const result = (progress: number, appended: string | null = null): TyperResult => ({ candidate, progress, text, appended });
  const drop = () => {
    candidate = null;
    pending = null;
    blocked = null;
  };

  return {
    text: () => text,
    append(letter: string) {
      text += letter;
      drop();
    },
    space() {
      text += ' ';
    },
    backspace() {
      text = text.slice(0, -1);
    },
    clear() {
      text = '';
      drop();
    },
    update({ label, confidence, nowMs }: { label: string | null; confidence: number; nowMs: number }): TyperResult {
      const seen = label !== null && confidence >= threshold ? label : null;

      if (seen === null) {
        if (candidate !== null && nowMs - lastSeen > graceMs) drop();
        return result(0);
      }
      if (candidate === null) {
        candidate = seen;
        since = lastSeen = nowMs;
        pending = null;
      } else if (seen === candidate) {
        lastSeen = nowMs;
        pending = null;
      } else {
        if (pending?.label !== seen) pending = { label: seen, since: nowMs };
        if (nowMs - pending.since > graceMs) {
          candidate = seen;
          since = pending.since;
          lastSeen = nowMs;
          pending = null;
          blocked = null; // a new letter: the previous one is no longer held
        }
        if (candidate !== seen) return result(Math.min(1, (lastSeen - since) / holdMs)); // glitch frame: no typing
      }
      if (seen === blocked) return result(0);
      const progress = Math.min(1, (nowMs - since) / holdMs);
      if (progress >= 1) {
        text += seen;
        blocked = seen;
        return result(1, seen);
      }
      return result(progress);
    },
  };
}

export type LetterTyper = ReturnType<typeof createLetterTyper>;
