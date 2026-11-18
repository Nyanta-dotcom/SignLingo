/**
 * Key-value adapter over localStorage (docs/03 §3.1). The only place that touches browser storage.
 * Never throws: when storage is missing, blocked or full it keeps values in memory and sets
 * `available` to false so the UI can say "progress will not be saved".
 */

export const PREFIX = 'signlingo:v1:';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

export type KV = {
  readonly available: boolean;
  get<T>(key: string, fallback: T): T;
  set(key: string, value: unknown): boolean;
  remove(key: string): void;
  keys(): string[];
};

function defaultStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function probe(storage: StorageLike | null): StorageLike | null {
  if (!storage) return null;
  try {
    storage.setItem(`${PREFIX}__probe`, '1');
    storage.removeItem(`${PREFIX}__probe`);
    return storage;
  } catch {
    return null;
  }
}

export function createKV(storage: StorageLike | null = defaultStorage()): KV {
  let backing = probe(storage);
  const memory = new Map<string, unknown>();

  return {
    get available() {
      return backing !== null;
    },
    get<T>(key: string, fallback: T): T {
      if (memory.has(key)) return memory.get(key) as T;
      if (!backing) return fallback;
      try {
        const raw = backing.getItem(PREFIX + key);
        return raw === null ? fallback : (JSON.parse(raw) as T);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      if (backing) {
        try {
          backing.setItem(PREFIX + key, JSON.stringify(value));
          memory.delete(key);
          return true;
        } catch {
          backing = null; // blocked or full: keep working in memory
        }
      }
      memory.set(key, value);
      return false;
    },
    remove(key) {
      memory.delete(key);
      try {
        backing?.removeItem(PREFIX + key);
      } catch {
        /* ignore */
      }
    },
    keys() {
      const out = new Set(memory.keys());
      if (backing) {
        try {
          for (let i = 0; i < backing.length; i++) {
            const k = backing.key(i);
            if (k?.startsWith(PREFIX) && k !== `${PREFIX}__probe`) out.add(k.slice(PREFIX.length));
          }
        } catch {
          /* ignore */
        }
      }
      return [...out].sort();
    },
  };
}
