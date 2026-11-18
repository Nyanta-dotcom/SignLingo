/** Sliding-window mean of class probabilities (docs/02 §5.2): the label shown is the one with the best mean. */

import type { Prediction } from './types';

export interface Smoother {
  push(probs: Float32Array): Prediction;
  reset(): void;
}

export function createSmoother(labels: readonly string[], window = 5, k = 3): Smoother {
  const history: Float32Array[] = [];
  return {
    push(probs) {
      if (probs.length !== labels.length) throw new Error(`expected ${labels.length} probabilities, got ${probs.length}`);
      history.push(probs);
      if (history.length > window) history.shift();
      const mean = labels.map((_, i) => history.reduce((s, h) => s + h[i], 0) / history.length);
      const topK = mean
        .map((p, i) => ({ label: labels[i], p }))
        .sort((a, b) => b.p - a.p)
        .slice(0, k);
      return { label: topK[0].label, confidence: topK[0].p, topK };
    },
    reset() {
      history.length = 0;
    },
  };
}
