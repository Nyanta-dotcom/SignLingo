import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain ESM build script without types
import { generate } from '../../scripts/gen-validators.mjs';

const file = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8').replace(/\r\n/g, '\n');

describe('ahead-of-time validators', () => {
  it('are up to date with shared/contracts schemas (run pnpm gen-validators if this fails)', () => {
    expect(file('src/storage/validators.gen.js')).toBe(generate());
  });

  it('count string length with the Ajv helper (a CommonJS import that must resolve to the function)', async () => {
    const { validateBackup } = await import('./validators.gen.js');
    expect(() => validateBackup({ schema_version: 1, exported_at: 'x', app_version: '', data: {} })).not.toThrow();
  });

  it('need no eval at run time, which the Content-Security-Policy forbids', () => {
    expect(file('src/storage/validators.gen.js')).not.toMatch(/new Function|eval\(|require\(/);
    expect(file('src/storage/validate.ts')).not.toMatch(/from 'ajv/);
  });
});
