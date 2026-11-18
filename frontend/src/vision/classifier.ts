/**
 * ONNX classifier (docs/04 §5): checks the file's sha256 against the manifest, prefers WASM and
 * falls back to WebGPU, reuses one input tensor so there are no allocations per frame.
 * Input `x` (1, 42) lm-v1 features, output `probs` (1, 24) already softmaxed.
 */

import * as ort from 'onnxruntime-web';

export class ModelLoadError extends Error {
  readonly code = 'MODEL_LOAD_FAILED';
}

type Manifest = { labels: string[]; sha256: string; input?: { name?: string }; output?: { name?: string } };

export interface Classifier {
  load(manifest: Manifest, modelUrl: string): Promise<void>;
  /** Async because onnxruntime-web `run()` returns a Promise (docs/04 K3 said sync; corrected). */
  predict(features: Float32Array): Promise<{ probs: Float32Array; latencyMs: number }>;
  readonly labels: string[];
  readonly backend: 'webgpu' | 'wasm';
}

const N_FEATURES = 42;

/** The WASM runtime is self-hosted (public/ort, copied by scripts/fetch-mediapipe.mjs): CSP allows 'self' only. */
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
if (isBrowser) ort.env.wasm.wasmPaths = `${location.origin}/ort/`; // absolute: Vite's dev server rewrites root-relative dynamic imports

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function createClassifier({
  fetchFn = fetch,
  providers = ['wasm', 'webgpu'], // measured: WASM is ~8x faster than WebGPU for this tiny MLP (see P3-10 note)
}: { fetchFn?: typeof fetch; providers?: Array<'webgpu' | 'wasm'> } = {}): Classifier {
  let session: ort.InferenceSession | null = null;
  let labels: string[] = [];
  let backend: 'webgpu' | 'wasm' = 'wasm';
  let inputName = 'x';
  let outputName = 'probs';
  const inputData = new Float32Array(N_FEATURES);
  let tensor: ort.Tensor | null = null;

  return {
    get labels() {
      return labels;
    },
    get backend() {
      return backend;
    },
    async load(manifest, modelUrl) {
      const res = await fetchFn(modelUrl);
      if (!res.ok) throw new ModelLoadError(`${modelUrl} -> HTTP ${res.status}`);
      const bytes = await res.arrayBuffer();
      const actual = await sha256Hex(bytes);
      if (actual !== manifest.sha256) throw new ModelLoadError(`sha256 mismatch for ${modelUrl}: got ${actual.slice(0, 12)}…`);
      const model = new Uint8Array(bytes);
      let lastError: unknown;
      for (const provider of providers) {
        try {
          session = await ort.InferenceSession.create(model, { executionProviders: [provider] });
          backend = provider;
          break;
        } catch (e) {
          lastError = e;
        }
      }
      if (!session) throw new ModelLoadError(`no ONNX backend could start: ${(lastError as Error)?.message ?? 'unknown error'}`);
      labels = manifest.labels;
      inputName = manifest.input?.name ?? 'x';
      outputName = manifest.output?.name ?? 'probs';
      tensor = new ort.Tensor('float32', inputData, [1, N_FEATURES]);
    },
    async predict(features) {
      if (!session || !tensor) throw new Error('classifier not loaded');
      if (features.length !== N_FEATURES) throw new Error(`expected ${N_FEATURES} features, got ${features.length}`);
      inputData.set(features);
      const t0 = performance.now();
      const out = await session.run({ [inputName]: tensor });
      const latencyMs = performance.now() - t0;
      return { probs: Float32Array.from(out[outputName].data as Float32Array), latencyMs };
    },
  };
}
