/** Global lightweight UI interaction sound delegation for buttons, links, tabs, and controls. */

import type { SoundName } from './sound';

export type UiSoundKind = Extract<SoundName, 'click' | 'tab'>;

const TAB_SELECTOR = 'a[href], [role="tab"], [role="radio"], input[type="radio"], input[type="checkbox"], select';
const BUTTON_SELECTOR = 'button, [role="button"]';
const DEDUPE_MS = 40;

function isDisabled(el: Element): boolean {
  if (el.getAttribute('aria-disabled') === 'true') return true;
  if ('disabled' in el && Boolean((el as HTMLButtonElement).disabled)) return true;
  return false;
}

/** Classifies a clicked DOM target into a tactile button `'click'`, lighter `'tab'`, or `null` (silent). */
export function classifyInteractiveTarget(target: EventTarget | null): UiSoundKind | null {
  if (!(target instanceof Element)) return null;
  const tabEl = target.closest(TAB_SELECTOR);
  if (tabEl) return isDisabled(tabEl) ? null : 'tab';
  const btnEl = target.closest(BUTTON_SELECTOR);
  if (btnEl) return isDisabled(btnEl) ? null : 'click';
  return null;
}

/** Attaches a single passive click listener on `doc` that plays tactile sounds without double-firing labels. */
export function attachUiSound(play: (name: UiSoundKind) => void, doc: Document = document): () => void {
  let lastAt = -Infinity;
  const onClick = (e: MouseEvent) => {
    const kind = classifyInteractiveTarget(e.target);
    if (!kind) return;
    const now = performance.now();
    if (now - lastAt < DEDUPE_MS) return;
    lastAt = now;
    play(kind);
  };
  doc.addEventListener('click', onClick, true);
  return () => doc.removeEventListener('click', onClick, true);
}
