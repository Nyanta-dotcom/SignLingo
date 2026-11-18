import { describe, expect, it } from 'vitest';
import { createKV, PREFIX } from './kv';

class FakeStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'> {
  data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

const throwing = () => {
  throw new DOMException('blocked', 'SecurityError');
};

describe('createKV', () => {
  it('round-trips JSON under the signlingo:v1: prefix', () => {
    const s = new FakeStorage();
    const kv = createKV(s as unknown as Storage);
    expect(kv.available).toBe(true);
    expect(kv.set('settings', { theme: 'dark' })).toBe(true);
    expect(s.data.has(`${PREFIX}settings`)).toBe(true);
    expect(kv.get('settings', null)).toEqual({ theme: 'dark' });
    expect(kv.get('missing', 7)).toBe(7);
  });

  it('falls back to memory and reports available=false when storage is blocked (AC-ACC-02)', () => {
    const blocked = { getItem: throwing, setItem: throwing, removeItem: throwing, key: throwing, length: 0 };
    const kv = createKV(blocked as unknown as Storage);
    expect(kv.available).toBe(false);
    expect(() => kv.set('stats', { total_xp: 1 })).not.toThrow();
    expect(kv.get('stats', null)).toEqual({ total_xp: 1 });
  });

  it('works without any storage object', () => {
    const kv = createKV(null);
    expect(kv.available).toBe(false);
    kv.set('a', 1);
    expect(kv.get('a', 0)).toBe(1);
  });

  it('returns the fallback for corrupted JSON instead of throwing', () => {
    const s = new FakeStorage();
    s.setItem(`${PREFIX}profile`, '{not json');
    expect(createKV(s as unknown as Storage).get('profile', 'fallback')).toBe('fallback');
  });

  it('keeps the value in memory and flips available when a write fails later (quota)', () => {
    const s = new FakeStorage();
    const kv = createKV(s as unknown as Storage);
    s.setItem = throwing;
    expect(kv.set('daily', { x: 1 })).toBe(false);
    expect(kv.available).toBe(false);
    expect(kv.get('daily', null)).toEqual({ x: 1 });
  });

  it('removes keys and lists only its own keys', () => {
    const s = new FakeStorage();
    s.setItem('other:key', '1');
    const kv = createKV(s as unknown as Storage);
    kv.set('a', 1);
    kv.set('b', 2);
    kv.remove('a');
    expect(kv.keys()).toEqual(['b']);
    expect(kv.get('a', null)).toBeNull();
  });
});
