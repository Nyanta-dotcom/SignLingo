// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createClassifier } from './classifier';

const root = (p: string) => resolve(process.cwd(), p);
const manifest = JSON.parse(readFileSync(root('public/models/landmark-mlp-ens5-1.0.0.manifest.json'), 'utf8'));
const modelBytes = readFileSync(root('public/models/landmark-mlp-ens5-1.0.0.onnx'));
const parity = JSON.parse(readFileSync(root('../shared/contracts/fixtures/classifier_parity.json'), 'utf8')) as {
  tolerance: number; inputs: number[][]; probs: number[][]; argmax: number[];
};

const serve = (bytes: Uint8Array) => async () => ({ ok: true, status: 200, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });

describe('Classifier (onnxruntime-web)', () => {
  const clf = createClassifier({ fetchFn: serve(modelBytes) as unknown as typeof fetch });

  beforeAll(async () => {
    await clf.load(manifest, '/models/landmark-mlp-ens5-1.0.0.onnx');
  }, 60_000);

  it('exposes the label list from the manifest and a backend', () => {
    expect(clf.labels).toEqual(manifest.labels);
    expect(clf.labels).toHaveLength(24);
    expect(['webgpu', 'wasm']).toContain(clf.backend);
  });

  it('gives the same probabilities as Python onnxruntime for the 10 fixture samples (AC-ML-09)', async () => {
    for (const [k, x] of parity.inputs.entries()) {
      const { probs, latencyMs } = await clf.predict(Float32Array.from(x));
      expect(probs).toHaveLength(24);
      expect(latencyMs).toBeGreaterThanOrEqual(0);
      probs.forEach((p, i) => expect(Math.abs(p - parity.probs[k][i])).toBeLessThanOrEqual(parity.tolerance));
      expect(probs.indexOf(Math.max(...probs))).toBe(parity.argmax[k]);
      expect(probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 4);
    }
  });

  it('reuses its input buffer without leaking state between calls', async () => {
    const a = (await clf.predict(Float32Array.from(parity.inputs[0]))).probs;
    await clf.predict(Float32Array.from(parity.inputs[1]));
    const again = (await clf.predict(Float32Array.from(parity.inputs[0]))).probs;
    expect(Array.from(again)).toEqual(Array.from(a));
  });

  it('rejects an input of the wrong size', async () => {
    await expect(clf.predict(new Float32Array(10))).rejects.toThrow(/42/);
  });
});

describe('Classifier loading errors', () => {
  it('refuses a model whose sha256 differs from the manifest', async () => {
    const tampered = new Uint8Array(modelBytes);
    tampered[100] ^= 0xff;
    const clf = createClassifier({ fetchFn: serve(tampered) as unknown as typeof fetch });
    await expect(clf.load(manifest, '/m.onnx')).rejects.toMatchObject({ code: 'MODEL_LOAD_FAILED' });
    await expect(clf.load(manifest, '/m.onnx')).rejects.toThrow(/sha256/);
  });

  it('reports a failed download', async () => {
    const clf = createClassifier({ fetchFn: (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch });
    await expect(clf.load(manifest, '/m.onnx')).rejects.toMatchObject({ code: 'MODEL_LOAD_FAILED' });
  });

  it('predict before load is an error', async () => {
    await expect(createClassifier().predict(new Float32Array(42))).rejects.toThrow(/not loaded/);
  });
});
