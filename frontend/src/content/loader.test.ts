import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import curriculum from './curriculum.json';
import { CurriculumError, loadCurriculum } from './loader';

const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'public/models/landmark-mlp-ens5-1.0.0.manifest.json'), 'utf-8'));
const LABELS: string[] = manifest.labels;
const copy = () => structuredClone(curriculum) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe('curriculum.json', () => {
  it('is valid, matches the 24 static classes of the published model, and includes dynamic J, Z and numbers 1–10', () => {
    const c = loadCurriculum(curriculum, LABELS);
    const staticLetters = c.signs.filter((s) => s.kind === 'static' && s.model_task === 'static_letters');
    const dynamicLetters = c.signs.filter((s) => s.kind === 'dynamic' && s.model_task === 'dynamic_letters');
    const numbers = c.signs.filter((s) => s.model_task === 'numbers');
    expect(staticLetters).toHaveLength(LABELS.length);
    staticLetters.forEach((s) => expect(LABELS[s.model_class_index]).toBe(s.gloss));
    expect(dynamicLetters.map((s) => s.gloss).sort()).toEqual(['J', 'Z']);
    expect(numbers.map((s) => s.gloss)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  });

  it('lets a learner reach every lesson: each one requires only earlier lessons', () => {
    const c = loadCurriculum(curriculum, LABELS);
    const codes = c.units.flatMap((u) => u.lessons.map((l) => l.code));
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('loadCurriculum rejects inconsistent content', () => {
  const bad = (mutate: (c: Record<string, any>) => void, message: RegExp) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const c = copy();
    mutate(c);
    expect(() => loadCurriculum(c, LABELS)).toThrow(CurriculumError);
    expect(() => loadCurriculum(c, LABELS)).toThrow(message);
  };

  it('a file that breaks the schema', () => bad((c) => { delete c.units; }, /schema/));
  it('a sign whose class index is not the model\'s class for that letter', () => bad((c) => { c.signs[0].model_class_index = 5; }, /says class 5/));
  it('a duplicated sign', () => bad((c) => { c.signs.push({ ...c.signs[0] }); }, /duplicate sign/));
  it('an item that uses an unknown sign', () => bad((c) => { c.units[0].lessons[0].items[0].sign_code = 'LETTER_UNKNOWN'; }, /unknown sign LETTER_UNKNOWN/));
  it('a lesson that requires a later or missing lesson', () => {
    bad((c) => { c.units[0].lessons[0].requires = ['U1L2']; }, /does not come before/);
    bad((c) => { c.units[0].lessons[1].requires = ['NOPE']; }, /requires NOPE/);
  });
  it('a duplicated lesson code', () => bad((c) => { c.units[0].lessons[1].code = 'U1L1'; c.units[0].lessons[1].requires = []; }, /duplicate lesson/));
  it('a word with letters the static model cannot read (J, Z)', () => bad((c) => {
    c.units[0].lessons[0].items.push({ order: 99, type: 'spell_word', word: 'JAZ' });
  }, /cannot read: JZ/));
  it('accepts a word made only of supported static letters', () => {
    const c = copy();
    c.units[0].lessons[0].items.push({ order: 99, type: 'spell_word', word: 'cab' });
    expect(() => loadCurriculum(c, LABELS)).not.toThrow();
  });

  const withMedia = (src: string) => (c: Record<string, any>) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    c.signs[0].media = [{ type: 'image', src, license: 'Public domain', attribution: 'someone' }];
  };
  it('accepts a picture that is a file of this app', () => {
    const c = copy();
    withMedia('/media/letters/A.svg')(c);
    expect(() => loadCurriculum(c, LABELS)).not.toThrow();
  });
  it('rejects pictures from other sites or outside /media/ (the app loads nothing external)', () => {
    for (const src of ['https://example.com/a.svg', '//cdn.example.com/a.svg', '/other/a.svg', '/media/../secret.svg', 'media/a.svg']) {
      bad(withMedia(src), /must be a file under \/media\//);
    }
  });
  it('rejects a picture without its license and author (the schema requires both)', () => {
    bad((c) => { c.signs[0].media = [{ type: 'image', src: '/media/a.svg' }]; }, /schema/);
  });
});

describe('pictures of the hands (curriculum media)', () => {
  const signs = loadCurriculum(curriculum, LABELS).signs.filter((s) => s.code.startsWith('LETTER_'));
  const file = (src: string) => resolve(process.cwd(), 'public', src.replace(/^\//, ''));

  it('gives every letter (A–Z) a picture, with its author and license', () => {
    expect(signs).toHaveLength(26);
    for (const s of signs) {
      const image = s.media?.find((m) => m.type === 'image');
      expect(image, s.code).toBeDefined();
      expect(image?.license, s.code).toBe('Public domain');
      expect(image?.attribution, s.code).toMatch(/wpclipart\.com/);
    }
  });

  it('points only at files that exist in the app, one distinct file per letter', () => {
    const srcs = signs.map((s) => s.media?.[0].src ?? '');
    expect(new Set(srcs).size).toBe(signs.length);
    for (const src of srcs) expect(existsSync(file(src)), src).toBe(true);
  });

  it('ships plain vector drawings: no script, no event handlers, no outside links', () => {
    for (const s of signs) {
      const text = readFileSync(file(s.media?.[0].src ?? ''), 'utf-8');
      expect(text.trimStart().startsWith('<?xml') || text.trimStart().startsWith('<svg'), s.code).toBe(true);
      expect(text, s.code).not.toMatch(/<script|\son\w+\s*=|javascript:|<foreignObject|<image\b/i);
      expect(text.replace(/xmlns(:\w+)?="[^"]*"/g, ''), s.code).not.toMatch(/(?:href|src)\s*=\s*"https?:/i);
    }
  });

  it('credits the source in the attribution file next to the pictures', () => {
    const text = readFileSync(resolve(process.cwd(), 'public/media/letters/ATTRIBUTION.md'), 'utf-8');
    expect(text).toMatch(/wpclipart\.com/);
    expect(text).toMatch(/Public domain/);
  });

  it('gives every number (0–10) an existing, safe local SVG file', () => {
    const numbers = loadCurriculum(curriculum, LABELS).signs.filter((s) => s.code.startsWith('NUMBER_'));
    expect(numbers).toHaveLength(11);
    for (const s of numbers) {
      const src = s.media?.find((m) => m.type === 'image')?.src ?? '';
      expect(src, s.code).toBe(`/media/numbers/asl_number_${s.gloss}.svg`);
      expect(existsSync(file(src)), src).toBe(true);
      const text = readFileSync(file(src), 'utf-8');
      expect(text.trimStart().startsWith('<?xml') || text.trimStart().startsWith('<svg'), s.code).toBe(true);
      expect(text, s.code).not.toMatch(/<script|\son\w+\s*=|javascript:|<foreignObject|<image\b/i);
    }
  });
});
