import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import curriculum from './curriculum.json';
import { CurriculumError, loadCurriculum } from './loader';

const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'public/models/landmark-mlp-ens5-1.0.0.manifest.json'), 'utf-8'));
const LABELS: string[] = manifest.labels;
const copy = () => structuredClone(curriculum) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe('curriculum.json', () => {
  it('is valid and every sign matches the class order of the published model (model_class_index)', () => {
    const c = loadCurriculum(curriculum, LABELS);
    expect(c.signs).toHaveLength(LABELS.length);
    c.signs.forEach((s) => expect(LABELS[s.model_class_index]).toBe(s.gloss));
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
  it('an item that uses an unknown sign', () => bad((c) => { c.units[0].lessons[0].items[0].sign_code = 'LETTER_J'; }, /unknown sign LETTER_J/));
  it('a lesson that requires a later or missing lesson', () => {
    bad((c) => { c.units[0].lessons[0].requires = ['U1L2']; }, /does not come before/);
    bad((c) => { c.units[0].lessons[1].requires = ['NOPE']; }, /requires NOPE/);
  });
  it('a duplicated lesson code', () => bad((c) => { c.units[0].lessons[1].code = 'U1L1'; c.units[0].lessons[1].requires = []; }, /duplicate lesson/));
  it('a word with letters the model cannot read (J, Z)', () => bad((c) => {
    c.units[0].lessons[0].items.push({ order: 99, type: 'spell_word', word: 'JAZ' });
  }, /cannot read: JZ/));
  it('accepts a word made only of supported letters', () => {
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
  const signs = loadCurriculum(curriculum, LABELS).signs;
  const file = (src: string) => resolve(process.cwd(), 'public', src.replace(/^\//, ''));

  it('gives every letter a picture, with its author and license', () => {
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
});

