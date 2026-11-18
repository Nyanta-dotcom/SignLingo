/** Loads and cross-checks the curriculum (docs/03 §2). The content comes from the team; this only validates it. */

import { validateCurriculum } from '@/storage/validate';
import type { Curriculum } from './types';

export class CurriculumError extends Error {
  readonly code = 'CURRICULUM_INVALID';
}

const fail = (msg: string): never => {
  throw new CurriculumError(msg);
};

/**
 * Throws CurriculumError unless the file matches the schema AND is consistent with the active model:
 * every static sign points at its class in `labels`, every item and `requires` entry exists, and a
 * lesson only requires lessons that come before it (so nothing is locked forever).
 */
export function loadCurriculum(raw: unknown, labels: readonly string[]): Curriculum {
  const check = validateCurriculum(raw);
  if (!check.ok) return fail(`curriculum does not match its schema: ${check.errors.join('; ')}`);
  const c = raw as Curriculum;

  const signs = new Map<string, Curriculum['signs'][number]>();
  for (const s of c.signs) {
    if (signs.has(s.code)) fail(`duplicate sign ${s.code}`);
    signs.set(s.code, s);
    if (s.kind === 'static') {
      const letter = s.code.replace(/^LETTER_/, '');
      if (labels[s.model_class_index] !== letter) {
        fail(`sign ${s.code} says class ${s.model_class_index} but the model has "${labels[s.model_class_index]}" there`);
      }
    }
  }

  const seen = new Set<string>();
  const ordered = [...c.units].sort((a, b) => a.order - b.order).flatMap((u) => [...u.lessons].sort((a, b) => a.order - b.order));
  for (const lesson of ordered) {
    if (seen.has(lesson.code)) fail(`duplicate lesson ${lesson.code}`);
    for (const r of lesson.requires) if (!seen.has(r)) fail(`lesson ${lesson.code} requires ${r}, which does not come before it`);
    for (const item of lesson.items) {
      if (item.type === 'spell_word') {
        const bad = [...(item.word ?? '')].filter((ch) => !labels.includes(ch.toUpperCase()));
        if (bad.length) fail(`word "${item.word}" in ${lesson.code} uses letters the model cannot read: ${bad.join('')}`);
      } else if (!item.sign_code || !signs.has(item.sign_code)) {
        fail(`item ${item.order} of ${lesson.code} uses unknown sign ${item.sign_code}`);
      }
    }
    seen.add(lesson.code);
  }
  return c;
}
