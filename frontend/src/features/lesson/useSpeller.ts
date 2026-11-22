import { useRef, useState } from 'react';
import type { Item } from '@/content/types';
import { createSpeller, type Speller } from '@/game/spellWord';

/** One speller per `spell_word` item (reset whenever the item or retry count changes). */
export function useSpeller(item: Item, resetKey = 0): { speller: Speller | null; refresh: () => void } {
  const [, setTick] = useState(0);
  const current = useRef<{ key: string; speller: Speller } | null>(null);
  if (item.type === 'spell_word' && item.word) {
    const key = `${item.order}:${resetKey}`;
    if (current.current?.key !== key) current.current = { key, speller: createSpeller(item.word) };
  } else {
    current.current = null;
  }
  return { speller: current.current?.speller ?? null, refresh: () => setTick((n) => n + 1) };
}
