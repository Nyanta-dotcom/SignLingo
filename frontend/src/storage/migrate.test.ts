import { describe, expect, it } from 'vitest';
import { CURRENT_VERSION, migrate } from './migrate';

describe('migrate', () => {
  it('treats data without schema_version as version 1', () => {
    const out = migrate({ app_version: '0.1.0' });
    expect(out.schema_version).toBe(CURRENT_VERSION);
    expect(out.app_version).toBe('0.1.0');
  });

  it('keeps current data unchanged', () => {
    const data = { schema_version: CURRENT_VERSION, x: 1 };
    expect(migrate(data)).toEqual(data);
  });

  it('applies each step in order up to the target', () => {
    const steps = {
      1: (d: Record<string, unknown>) => ({ ...d, a: 1 }),
      2: (d: Record<string, unknown>) => ({ ...d, b: (d.a as number) + 1 }),
    };
    expect(migrate({ schema_version: 1 }, steps, 3)).toEqual({ schema_version: 3, a: 1, b: 2 });
  });

  it('refuses data from a newer version than the app knows', () => {
    expect(() => migrate({ schema_version: CURRENT_VERSION + 1 })).toThrow(/newer/);
  });

  it('refuses a missing step instead of skipping it', () => {
    expect(() => migrate({ schema_version: 1 }, {}, 2)).toThrow(/migration/);
  });
});
