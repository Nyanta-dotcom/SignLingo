import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createSupabaseAuth } from './supabase';

/** A tiny stand-in for the Supabase query builder: records the calls and answers from `rows`. */
function fakeClient(existing: Array<{ user_id: string }>) {
  const calls: Array<{ op: string; values?: unknown }> = [];
  const builder = (op: string, values?: unknown) => {
    calls.push({ op, values });
    const result = { data: op === 'update' ? existing : null, error: null };
    const chain: Record<string, unknown> = {
      eq: () => chain, select: () => chain, then: (f: (r: typeof result) => unknown) => Promise.resolve(result).then(f),
    };
    return chain;
  };
  const client = { from: () => ({ update: (v: unknown) => builder('update', v), insert: (v: unknown) => builder('insert', v), upsert: vi.fn() }) };
  return { calls, client: client as unknown as SupabaseClient };
}

describe('leaderboard join', () => {
  it('updates an existing entry without touching user_id and does not insert', async () => {
    const { calls, client } = fakeClient([{ user_id: 'u1' }]);
    await createSupabaseAuth(client).leaderboardFor('u1').join('Lan');
    expect(calls.map((c) => c.op)).toEqual(['update']);
    expect(calls[0].values).toEqual({ display_name: 'Lan', show_on_leaderboard: true });
  });

  it('inserts a first entry when there is nothing to update', async () => {
    const { calls, client } = fakeClient([]);
    await createSupabaseAuth(client).leaderboardFor('u1').join('Lan');
    expect(calls.map((c) => c.op)).toEqual(['update', 'insert']);
    expect(calls[1].values).toEqual({ user_id: 'u1', display_name: 'Lan', show_on_leaderboard: true });
  });
});
