import { describe, expect, it } from 'vitest';
import { validateBackup, validateCurriculum } from './validate';

const goodBackup = () => ({
  schema_version: 1, exported_at: '2026-03-01T00:00:00Z', app_version: '0.1.0',
  data: {
    stats: { total_xp: 5, current_streak: 1, longest_streak: 1, last_goal_date: null, hearts: 5, hearts_updated_at: 'x' },
    settings: { theme: 'dark' },
  },
});

const goodCurriculum = () => ({
  schema_version: 1,
  signs: [{ code: 'LETTER_A', gloss: 'A', kind: 'static', model_task: 'letters', model_class_index: 0 }],
  units: [{
    code: 'U1', level: 1, title: 't', order: 1,
    lessons: [{
      code: 'L1', title: 't', order: 1, xp_reward: 10, requires: [],
      items: [
        { order: 1, type: 'learn_card', sign_code: 'LETTER_A' },
        { order: 2, type: 'spell_word', word: 'AB' },
      ],
    }],
  }],
});

describe('validateBackup', () => {
  it('accepts a valid backup', () => {
    expect(validateBackup(goodBackup())).toEqual({ ok: true });
  });
  it('rejects hearts out of range, unknown top-level keys and non-objects with readable errors', () => {
    const bad = goodBackup();
    bad.data.stats.hearts = 9;
    const r = validateBackup(bad);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.join(' ')).toMatch(/hearts/);
    expect(validateBackup({ ...goodBackup(), extra: 1 }).ok).toBe(false);
    expect(validateBackup('nope').ok).toBe(false);
  });
});

describe('validateCurriculum', () => {
  it('accepts a valid curriculum', () => {
    expect(validateCurriculum(goodCurriculum())).toEqual({ ok: true });
  });
  it('requires sign_code except for spell_word, and word for spell_word', () => {
    const c = goodCurriculum();
    delete (c.units[0].lessons[0].items[0] as { sign_code?: string }).sign_code;
    expect(validateCurriculum(c).ok).toBe(false);
    const d = goodCurriculum();
    delete (d.units[0].lessons[0].items[1] as { word?: string }).word;
    expect(validateCurriculum(d).ok).toBe(false);
  });
  it('requires license and attribution on media', () => {
    const c = goodCurriculum() as ReturnType<typeof goodCurriculum> & { signs: Array<Record<string, unknown>> };
    c.signs[0].media = [{ type: 'image', src: '/a.png', license: '', attribution: 'x' }];
    expect(validateCurriculum(c).ok).toBe(false);
  });
});
