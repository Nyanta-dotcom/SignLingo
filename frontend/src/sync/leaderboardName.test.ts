import { describe, expect, it } from 'vitest';
import { cleanDisplayName } from './leaderboardName';

describe('cleanDisplayName', () => {
  it('keeps a normal name and tidies spaces', () => {
    expect(cleanDisplayName('  Minh   Anh ')).toBe('Minh Anh');
    expect(cleanDisplayName('Nguyễn Văn Á')).toBe('Nguyễn Văn Á');
  });
  it('rejects names that are too short, too long or empty', () => {
    expect(cleanDisplayName('A')).toBeNull();
    expect(cleanDisplayName('   ')).toBeNull();
    expect(cleanDisplayName('a'.repeat(25))).toBeNull();
    expect(cleanDisplayName('a'.repeat(24))).toBe('a'.repeat(24));
  });
  it('rejects control characters', () => {
    expect(cleanDisplayName('An\u0007n')).toBeNull();
  });
});
