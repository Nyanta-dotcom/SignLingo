import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadActiveManifest, loadExperimentIndex, loadModelIndex, StaticDataError } from './staticData';

const pub = (p: string) => JSON.parse(readFileSync(resolve(process.cwd(), 'public', p), 'utf8'));
const serve = (files: Record<string, unknown>) =>
  vi.stubGlobal('fetch', vi.fn(async (url: string) =>
    url in files ? { ok: true, status: 200, json: async () => files[url] } : { ok: false, status: 404, json: async () => ({}) }));

afterEach(() => vi.unstubAllGlobals());

const real = () => ({
  '/models/index.json': pub('models/index.json'),
  '/models/landmark-mlp-ens5-1.0.0.manifest.json': pub('models/landmark-mlp-ens5-1.0.0.manifest.json'),
  '/data/experiments/index.json': pub('data/experiments/index.json'),
});

describe('static data loader', () => {
  it('loads and validates the files that ml/ really published', async () => {
    serve(real());
    expect((await loadModelIndex()).active.static_letters).toBe('landmark-mlp-ens5-1.0.0');
    const m = await loadActiveManifest('static_letters');
    expect(m.model_id).toBe('landmark-mlp-ens5');
    expect(m.recommended.threshold).toBeGreaterThan(0);
    expect((await loadExperimentIndex()).runs.length).toBeGreaterThan(10);
  });

  it('only fetches same-origin paths', async () => {
    serve(real());
    await loadActiveManifest('static_letters');
    for (const call of (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls) {
      expect(String(call[0])).toMatch(/^\/(models|data)\//);
    }
  });

  it('reports a missing file with its path', async () => {
    serve({});
    await expect(loadModelIndex()).rejects.toMatchObject({ name: 'StaticDataError', code: 'HTTP_ERROR' });
    await expect(loadModelIndex()).rejects.toThrow('/models/index.json');
  });

  it('rejects a file that does not match its schema', async () => {
    serve({ '/models/index.json': { schema_version: 1 } });
    await expect(loadModelIndex()).rejects.toBeInstanceOf(StaticDataError);
    await expect(loadModelIndex()).rejects.toMatchObject({ code: 'SCHEMA_INVALID' });
  });

  it('fails clearly when no model is active for the task', async () => {
    serve({ ...real(), '/models/index.json': { schema_version: 1, active: {}, available: [] } });
    await expect(loadActiveManifest('static_letters')).rejects.toMatchObject({ code: 'NO_ACTIVE_MODEL' });
  });
});
