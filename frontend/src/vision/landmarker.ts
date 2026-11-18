/** MediaPipe HandLandmarker wrapper (docs/04 §5): VIDEO mode, one hand, GPU delegate with CPU fallback. */

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import type { HandFrame } from './types';

export class TrackerError extends Error {
  readonly code = 'WEBGL_UNAVAILABLE';
}

type RawResult = { landmarks: Array<Array<{ x: number; y: number; z: number }>>; handedness: Array<Array<{ categoryName: string; score: number }>> };
type CreateOpts = { wasmPath: string; modelAssetPath: string; delegate: 'GPU' | 'CPU'; numHands: 1 };
type LandmarkerLike = { detectForVideo(video: HTMLVideoElement, ts: number): RawResult; close(): void };

export type InitOptions = { delegate: 'GPU' | 'CPU'; numHands: 1; modelAssetPath: string; wasmPath: string };

export function toHandFrame(result: RawResult, timestampMs: number): HandFrame | null {
  const lm = result.landmarks[0];
  if (!lm || lm.length !== 21) return null;
  const h = result.handedness[0]?.[0];
  return {
    landmarks: lm.map(({ x, y, z }) => ({ x, y, z })),
    handedness: h?.categoryName === 'Left' ? 'Left' : 'Right',
    score: h?.score ?? 0,
    timestampMs,
  };
}

async function createReal(o: CreateOpts): Promise<LandmarkerLike> {
  const fileset = await FilesetResolver.forVisionTasks(o.wasmPath);
  return HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: o.modelAssetPath, delegate: o.delegate },
    runningMode: 'VIDEO',
    numHands: o.numHands,
  }) as unknown as LandmarkerLike;
}

export function createHandTracker({ create = createReal }: { create?: (o: CreateOpts) => Promise<LandmarkerLike> } = {}) {
  let landmarker: LandmarkerLike | null = null;
  let delegate: 'GPU' | 'CPU' = 'CPU';
  return {
    get delegate() {
      return delegate;
    },
    async init(opts: InitOptions): Promise<void> {
      const order: Array<'GPU' | 'CPU'> = opts.delegate === 'GPU' ? ['GPU', 'CPU'] : ['CPU'];
      for (const d of order) {
        try {
          landmarker = await create({ wasmPath: opts.wasmPath, modelAssetPath: opts.modelAssetPath, delegate: d, numHands: opts.numHands });
          delegate = d;
          return;
        } catch {
          /* try the next delegate */
        }
      }
      throw new TrackerError('Hand tracker could not start with GPU or CPU');
    },
    detect(video: HTMLVideoElement, timestampMs: number): HandFrame | null {
      if (!landmarker) return null;
      return toHandFrame(landmarker.detectForVideo(video, timestampMs), timestampMs);
    },
    close(): void {
      landmarker?.close();
      landmarker = null;
    },
  };
}

export type HandTracker = ReturnType<typeof createHandTracker>;
