/**
 * Builds `landmark_capture` files (shared/contracts/schemas/landmark_capture.schema.json), the same
 * format ml/tools/capture.py writes. Only coordinates, never images. Coordinates are NOT mirrored.
 */

import type { HandFrame } from './types';

export const SIGNER_RE = /^S[0-9]{2,}$/;

export type CaptureSample = {
  sign_code: string;
  handedness: 'Left' | 'Right';
  captured_at: string;
  frames: number[][][];
};

export type CaptureDocument = {
  schema_version: 1;
  preprocess_version: 'raw';
  signer_id: string;
  capture_session_id: string;
  device: Record<string, unknown>;
  samples: CaptureSample[];
};

const round5 = (v: number) => Math.round(v * 1e5) / 1e5;

/** One letter's recording. `labels` are the model's static classes (from the manifest). */
export function makeSample(letter: string, frames: HandFrame[], nowIso: string, labels: readonly string[]): CaptureSample {
  if (!labels.includes(letter)) throw new Error(`"${letter}" is not one of the static letters ${labels.join('')}`);
  if (frames.length === 0) throw new Error('a sample needs at least one frame');
  const right = frames.filter((f) => f.handedness === 'Right').length;
  return {
    sign_code: `LETTER_${letter}`,
    handedness: right * 2 >= frames.length ? 'Right' : 'Left',
    captured_at: nowIso,
    frames: frames.map((f) => f.landmarks.map((p) => [round5(p.x), round5(p.y), round5(p.z)])),
  };
}

export function buildCaptureDocument(o: {
  signerId: string;
  sessionId: string;
  samples: CaptureSample[];
  device?: Record<string, unknown>;
}): CaptureDocument {
  if (!SIGNER_RE.test(o.signerId)) throw new Error(`signer_id must be an anonymous code like S01, got "${o.signerId}"`);
  if (o.samples.length === 0) throw new Error('nothing recorded yet');
  return {
    schema_version: 1, preprocess_version: 'raw', signer_id: o.signerId,
    capture_session_id: o.sessionId, device: o.device ?? {}, samples: o.samples,
  };
}

export const captureFileName = (signerId: string, nowMs: number) => `landmarks_${signerId}_${Math.floor(nowMs / 1000)}.json`;
