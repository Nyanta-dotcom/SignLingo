import { useRef, useState } from 'react';
import type { Item } from '@/content/types';
import { createSpeller, type Speller } from '@/game/spellWord';

/** One speller per `spell_word` item (a fresh one for each item); `refresh` re-renders after it changed. */
export function useSpeller(item: Item): { speller: Speller | null; refresh: () => void } {
  const [, setTick] = useState(0);
  const current = useRef<{ order: number; speller: Speller } | null>(null);
  if (item.type === 'spell_word' && item.word) {
    if (current.current?.order !== item.order) current.current = { order: item.order, speller: createSpeller(item.word) };
  } else {
    current.current = null;
  }
  return { speller: current.current?.speller ?? null, refresh: () => setTick((n) => n + 1) };
}
