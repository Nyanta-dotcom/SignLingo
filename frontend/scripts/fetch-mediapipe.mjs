// Self-hosts MediaPipe so the app never loads code or models from another origin (CSP: 'self' only).
//   node scripts/fetch-mediapipe.mjs
// - copies the ONNX Runtime Web WASM files into public/ort
// - copies the WASM runtime from the pinned @mediapipe/tasks-vision package into public/mediapipe/wasm
// - puts hand_landmarker.task into public/mediapipe/, taken from ml/data/models if present, else
//   downloaded from Google's model storage; either way its sha256 must match the pin below.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../public/mediapipe');
const TASK_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const TASK_SHA256 = 'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

mkdirSync(out, { recursive: true });

// onnxruntime-web fetches its WASM runtime at run time; self-host it too (public/ort).
const ortOut = resolve(here, '../public/ort');
const ortSrc = resolve(here, '../node_modules/onnxruntime-web/dist');
mkdirSync(ortOut, { recursive: true });
for (const f of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']) {
  cpSync(resolve(ortSrc, f), resolve(ortOut, f));
}
cpSync(resolve(here, '../node_modules/@mediapipe/tasks-vision/wasm'), resolve(out, 'wasm'), { recursive: true });

const task = resolve(out, 'hand_landmarker.task');
const local = resolve(here, '../../ml/data/models/hand_landmarker.task');
let bytes;
if (existsSync(task) && sha256(readFileSync(task)) === TASK_SHA256) {
  console.log('hand_landmarker.task already present');
} else {
  if (existsSync(local)) {
    bytes = readFileSync(local);
  } else {
    const res = await fetch(TASK_URL);
    if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
    bytes = Buffer.from(await res.arrayBuffer());
  }
  if (sha256(bytes) !== TASK_SHA256) throw new Error('hand_landmarker.task does not match the pinned sha256');
  writeFileSync(task, bytes);
  console.log('hand_landmarker.task written');
}
console.log('MediaPipe assets ready in', out);
