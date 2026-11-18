/** K3 types (docs/04 §5). Framework-free: nothing in src/vision may import React. */

export type Landmark = { x: number; y: number; z: number };
export type HandFrame = {
  landmarks: Landmark[]; // 21
  handedness: 'Left' | 'Right';
  score: number;
  timestampMs: number;
};

export type ClassTemplate = { finger_angles: number[]; finger_angles_std: number[]; n?: number };

export type HoldState = 'idle' | 'searching' | 'holding' | 'verified' | 'timed_out';
export type HoldCfg = { holdMs: number; threshold: number; graceMs: number; timeLimitMs: number };

export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';
export type FingerHint = { finger: FingerName; joint: string; deltaDeg: number; hint: string };

export type Prediction = { label: string; confidence: number; topK: Array<{ label: string; p: number }> };
