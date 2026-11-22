# 04 — Contracts: SignLingo AI

> **Trạng thái:** v0.3 · **Ngày:** 2026-11-22 · **v0.3 (đồng bộ với code):** thêm K6 (tài khoản, đồng bộ, bảng xếp hạng qua Supabase, tùy chọn); bỏ file Xuất tiến độ.
> **Thay thế** `04_API_DOCS.md` (v0.1). Không tự viết REST API. Tài liệu này đặc tả **các hợp đồng giao tiếp**: giữa `ml/` và frontend (file tĩnh), giữa React UI với engine nhận diện chạy trong trình duyệt, và (tùy chọn) giữa frontend với Supabase.
> Mọi JSON Schema đặt trong `shared/contracts/schemas/` và được kiểm bằng test ở cả `ml/` lẫn `frontend/`.

---

## 1. Các kênh giao tiếp

| Kênh | Giữa | Hình thức | Mô tả |
|---|---|---|---|
| **K1 – Static Data** | ML pipeline → Frontend | File JSON tĩnh trong `frontend/public/data/` (fetch cùng origin) | Kết quả thí nghiệm cho AI Lab |
| **K2 – Model Artifact** | ML pipeline → Frontend | `public/models/index.json` + `*.manifest.json` + `*.onnx` | Mô hình & tham số tiền xử lý |
| **K3 – Inference Engine API** | React UI ↔ `src/vision/` | TypeScript interface trong cùng tiến trình (Web Worker ở Phase 4) | Nhận diện thời gian thực |
| **K4 – Local Storage** | React UI ↔ `src/storage/` | TypeScript interface | Xem [03_DATA_STORAGE](03_DATA_STORAGE.md) §3 |
| **K5 – File Exchange** | Trình duyệt ↔ người dùng / `ml/` | File tải về / tải lên | Mẫu landmark, benchmark; nhập tiến độ từ file cũ |
| **K6 – Account & Sync (tùy chọn)** | `src/sync/` ↔ Supabase | `@supabase/supabase-js` qua HTTPS | Đăng nhập, đồng bộ tiến độ, bảng xếp hạng (§8) |

Ngoài các file cùng origin, app **không gọi mạng** (AC-PRIV-01), trừ K6 tới `https://*.supabase.co` khi đã cấu hình và người học tự đăng nhập. Hình camera và landmark không bao giờ đi qua K6. MediaPipe wasm và `hand_landmarker.task` được tự host trong `public/mediapipe/`.

## 2. Danh mục file tĩnh

| URL (cùng origin) | Sinh bởi | Schema | Cache (Vercel headers) |
|---|---|---|---|
| `/models/index.json` | `ml` publish | `model_index.schema.json` | `max-age=300` |
| `/models/<model_id>-<version>.manifest.json` | `ml` export | `model_manifest.schema.json` | `immutable, max-age=31536000` |
| `/models/<model_id>-<version>.onnx` | `ml` export | — | `immutable` |
| `/data/experiments/index.json` | `ml` publish | `experiment_index.schema.json` | `max-age=300` |
| `/data/experiments/<run_id>.json` | `ml` evaluate | `experiment.schema.json` | `max-age=300` |
| `/mediapipe/hand_landmarker.task`, `/mediapipe/wasm/*` | script `fetch-mediapipe` (1 lần, ghim version) | — | `immutable` |
| `/media/*` | Nhóm cung cấp | — | `max-age=86400` |
| `src/content/curriculum.json` (đóng gói trong bundle) | Nhóm | `curriculum.schema.json` | theo bundle hash |

## 3. K2 — Model Artifact

### 3.1 `models/index.json`

```json
{
  "schema_version": 1,
  "active": {
    "static_letters": "landmark-mlp-1.0.0",
    "static_letters_image": "cnn-1.0.0"
  },
  "available": ["landmark-mlp-1.0.0", "cnn-1.0.0"]
}
```

### 3.2 Manifest

Schema: `shared/contracts/schemas/model_manifest.schema.json` (đã có, task P0-07). Trường chính:

| Trường | Ý nghĩa |
|---|---|
| `model_id`, `version` (semver), `task` | Định danh |
| `file`, `sha256` | Frontend kiểm sha256 sau khi tải |
| `input` `{name, shape, dtype, features}` | Luôn **42 số lm-v1** (`[1, 42]`, `xy`), tên `x`, batch động. Phần chuẩn hóa hướng, khoảng cách, góc và chuẩn hóa đặc trưng **nằm trong đồ thị ONNX**; frontend chỉ cần `normalizeLandmarks` (lm-v1) |
| `output` `{name, shape}` | Tên `probs`, `[1, 24]`: **xác suất đã softmax**, trung bình qua các thành viên của tập hợp (softmax nằm trong đồ thị vì tập hợp cần trung bình xác suất) |
| `labels` | Thứ tự lớp; khớp `curriculum.sign.model_class_index` |
| `preprocess_version` | `lm-v1` (landmark) hoặc `img-v1` (CNN crop 28×28) |
| `recommended` `{threshold, hold_ms, smoothing_window}` | Mặc định 0,6 / 1000 / 5 |
| `class_templates` | Góc khớp mean/std mỗi lớp cho phản hồi ngón tay |
| `confusable` | `{ "N": ["M","S"], … }` lấy từ Confusion Matrix, dùng cho gợi ý "Đang giống chữ…" |
| `metrics`, `trained_at`, `git_commit`, `seed` | Truy vết |

**Quy tắc tương thích:** frontend chỉ nhận `preprocess_version` trong danh sách hỗ trợ (`["lm-v1", "img-v1"]`). Nếu manifest không hợp lệ hoặc sha256 sai → báo lỗi `MODEL_LOAD_FAILED`, không chạy mô hình lỗi.

### 3.3 Landmark preprocessing `lm-v1` (Python ↔ TypeScript)

Đã kiểm chứng trên toàn bộ `keypoint.csv`: cổ tay ở (0, 0) và giá trị tuyệt đối lớn nhất của x, y trong mỗi hàng đúng bằng 1.

1. `p_i := p_i − p_0` (cổ tay là gốc).
2. Chia mọi x, y cho `max_i max(|x_i|, |y_i|)` (chuẩn L-vô-cực, **không** phải chuẩn Euclid). Nếu hệ số = 0 → trả `null` (bỏ khung).
3. Flatten theo thứ tự `x0, y0, x1, y1, … x20, y20` → `Float32Array(42)`. z bị bỏ qua.
4. Không lật gương trong `lm-v1` (xem 02 §4.3); lật là thí nghiệm ở P1-19 và nếu có lợi sẽ thành `lm-v2`.

Golden fixture `shared/contracts/fixtures/landmarks_lm-v1.json` (do `ml` sinh) gồm `{ input: HandFrame, expected: number[] }[]`; cả hai phía phải khớp với sai số ≤ 1e-6 (AC-ML-09).

## 4. K1 — Experiment data (AI Lab)

### 4.1 `data/experiments/index.json`

```json
{
  "schema_version": 1,
  "generated_at": "ISO",
  "datasets": ["sign_mnist", "landmarks"],
  "runs": [
    { "run_id": "…", "kind": "baseline", "dataset": "sign_mnist", "model_name": "…", "feature_set": "hog",
      "split_strategy": "group_ward70",
      "metrics": { "val_acc": 0, "val_macro_f1": 0, "test_acc": 0, "test_macro_f1": 0, "error_rate": 0,
                   "latency_ms": 0, "params": 0, "train_s": 0 } }
  ],
  "leakage_study": [ { "model_name": "…", "split_strategy": "random", "val_acc": 0, "test_acc": 0 } ]
}
```

### 4.2 `data/experiments/<run_id>.json`

```json
{
  "run_id": "…", "kind": "main", "dataset": "sign_mnist", "model_name": "…",
  "hyperparams": { }, "metrics": { },
  "confusion_matrix": { "labels": ["A", "…"], "matrix": [[0.0]], "normalized": "row" },
  "per_class_f1": { "A": 0.0 },
  "top_confusions": [ { "true": "N", "pred": "M", "rate": 0.0 } ],
  "curves": { "epoch": [1], "train_loss": [0.0], "val_macro_f1": [0.0] },
  "diagnostics": { "nn_dist_val_to_train": { "median": 0.0 }, "val_test_gap": 0.0 },
  "git_commit": "…", "seed": 42, "run_at": "ISO"
}
```

`diagnostics` (tùy chọn) chứa số đo phụ của thí nghiệm, ví dụ rò rỉ dữ liệu: khoảng cách từ ảnh validation tới ảnh train gần nhất cùng lớp.

`kind`: `baseline` · `main` · `ablation` · `leakage_study` · `perf_benchmark`.
`split_strategy`: `random` · `group_ward70` · `session_holdout` · `signer_holdout`.
Các số `0` ở trên chỉ minh họa kiểu dữ liệu; **giá trị thật chỉ đến từ pipeline**.

## 5. K3 — In-Browser Inference Engine API (TypeScript)

```ts
// frontend/src/vision/types.ts
export type Landmark = { x: number; y: number; z: number };
export type HandFrame = { landmarks: Landmark[] /*21*/; handedness: 'Left' | 'Right'; score: number; timestampMs: number };

export interface HandTracker {                  // vision/landmarker.ts
  init(opts: { delegate: 'GPU' | 'CPU'; numHands: 1; modelAssetPath: string; wasmPath: string }): Promise<void>;
  detect(video: HTMLVideoElement, timestampMs: number): HandFrame | null;
  close(): void;
}

export interface Classifier {                   // vision/classifier.ts
  load(manifest: ModelManifest, modelUrl: string): Promise<void>; // kiểm sha256; wasm → webgpu (đo thật: WASM nhanh hơn với MLP nhỏ)
  predict(features: Float32Array): Promise<{ probs: Float32Array; latencyMs: number }>; // async: onnxruntime-web run() trả Promise
  readonly labels: string[];
  readonly backend: 'webgpu' | 'wasm';
}

export function normalizeLandmarks(frame: HandFrame): Float32Array | null; // lm-v1: 42 số (x, y), không lật gương

export interface Smoother {
  push(probs: Float32Array): { label: string; confidence: number; topK: Array<{ label: string; p: number }> };
  reset(): void;
}

export type HoldState = 'idle' | 'searching' | 'holding' | 'verified' | 'timed_out';
export type HoldCfg = { holdMs: number; threshold: number; graceMs: number; timeLimitMs: number };
export interface HoldVerifier {                 // vision/holdFsm.ts — thuần, test không cần DOM
  reset(target: string, cfg: HoldCfg): void;
  update(input: { label: string | null; confidence: number; nowMs: number }): { state: HoldState; progress: number };
}

export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';
export function fingerFeedback(frame: HandFrame, template: ClassTemplate):
  Array<{ finger: FingerName; joint: string; deltaDeg: number; hint: string }>;

export interface RecognitionEngine {            // vision/engine.ts — façade cho React
  start(video: HTMLVideoElement): Promise<void>;
  stop(): void;
  setTarget(target: string | null, cfg?: Partial<HoldCfg>): void;
  subscribe(cb: (e: RecognitionEvent) => void): () => void;   // throttle ≤ 30 Hz
  getPerf(): PerfSnapshot;                      // { processingFps, frameMsP50, frameMsP95, mpMsP50, clsMsP50, backend, delegate, worker }
  recordBenchmark(durationS: 60): Promise<PerfRecord>;        // 03 §3.4
}

export type RecognitionEvent =
  | { type: 'loading'; progress: number }
  | { type: 'ready'; backend: 'webgpu' | 'wasm'; delegate: 'GPU' | 'CPU' }
  | { type: 'no_hand'; sinceMs: number }
  | { type: 'prediction'; label: string; confidence: number; topK: Array<{ label: string; p: number }>;
      hold: { state: HoldState; progress: number }; fingers: ReturnType<typeof fingerFeedback>; confusedWith: string | null }
  | { type: 'verified'; label: string; timeToVerifyMs: number }
  | { type: 'timed_out'; target: string; lastLabel: string | null; lastConfidence: number | null }
  | { type: 'error'; code: 'CAMERA_DENIED' | 'CAMERA_NOT_FOUND' | 'MODEL_LOAD_FAILED' | 'WEBGL_UNAVAILABLE' | 'INSECURE_CONTEXT'; message: string };
```

Khi chuyển sang Web Worker (Phase 4), `RecognitionEngine` giữ nguyên interface; bên trong dùng `postMessage({ type: 'frame', bitmap }, [bitmap])`. Hiện engine chạy trên luồng chính, hand tracker mặc định delegate `CPU`.

Số 0–10 và chữ J, Z không qua `Classifier` mà qua hai bộ nhận diện luật (02 §5.5): `vision/numberGesture.ts` (trả `{ detected, progress, verified, trail }`) và `vision/dynamicGesture.ts` (trả `{ target, poseMatch, progress, verified, trail }`, `trail` để vẽ vệt quỹ đạo).

## 6. K4 — Storage & Game API (TypeScript)

```ts
// frontend/src/storage/learnerStore.ts
export interface LearnerStore {
  readonly available: boolean;                  // false → chạy bộ nhớ tạm, UI hiện banner
  getSettings(): Settings; updateSettings(p: Partial<Settings>): Settings;
  getStats(now: Date): Stats;                   // đã áp dụng hồi tim & reset streak lười
  getProgress(): Record<string, LessonProgress>;
  startSession(input: { mode: SessionRecord['mode']; lessonCode: string | null; model: ModelRef }): SessionRecord;
  recordAttempt(sessionId: string, a: SessionRecord['attempts'][number]): { hearts: number; heartsLost: number; status: SessionRecord['status'] };
  completeSession(sessionId: string, perf: SessionRecord['perf'], now: Date): CompleteResult; // idempotent
  abandonSession(sessionId: string): void;
  saveBenchmark(r: PerfRecord): void; listBenchmarks(): PerfRecord[];
  // backup (src/storage/backup.ts): exportBackup() → BackupFile (chỉ dùng nội bộ, không còn nút Xuất), importBackup(raw),
  // readData()/applyData(data) cho đồng bộ (K6)
  clearAll(): void;
}

// frontend/src/game/*.ts — hàm thuần, tiêm `now`
export function computeXp(input: { xpReward: number; accuracy: number; heartsLost: number }): Array<{ source: 'lesson_complete' | 'accuracy_bonus' | 'perfect_bonus'; amount: number }>;
export function applyHeartRegen(stats: Stats, now: Date): Stats;
export function applyDailyXp(stats: Stats, daily: Record<string, DailyActivity>, xp: number, goal: number, now: Date, tz: string): { stats: Stats; daily: Record<string, DailyActivity>; streakExtended: boolean };
export function lessonStatus(lesson: Lesson, progress: Record<string, LessonProgress>): 'locked' | 'available' | 'in_progress' | 'completed';

export type CompleteResult = {
  accuracyPct: number;
  xp: { total: number; breakdown: ReturnType<typeof computeXp> };
  streak: { current: number; extendedToday: boolean };
  dailyGoal: { xpEarned: number; goal: number; goalMet: boolean };
  unlockedLessons: string[];
};
```

## 7. K5 — File Exchange

| File | Hướng | Schema |
|---|---|---|
| File sao lưu từ bản cũ | Chỉ Nhập (nút Xuất đã bỏ 2026-11-22) | `backup.schema.json` (03 §3.6) |
| `landmarks_<sign>_<signer>_<ts>.json` | Tải về từ `/collect` → `ml/data/raw/webcam/` | `landmark_capture.schema.json` (03 §4) |
| `perf_<ts>.json` | Tải về từ AI Lab → `ml/reports/perf/` | `PerfRecord` (03 §3.4) |

## 8. K6 — Account, Sync & Leaderboard (Supabase, tùy chọn)

Chỉ `frontend/src/sync/supabase.ts` import `@supabase/supabase-js`. Khi thiếu `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, `getAuthApi()` trả `null`, account store ở trạng thái `disabled` và giao diện tài khoản tự ẩn.

```ts
// frontend/src/sync/supabase.ts
export type AccountUser = { id: string; email: string };
export type AuthApi = {
  getUser(): Promise<AccountUser | null>;
  onChange(cb: (user: AccountUser | null) => void): () => void;
  signInWithGoogle(): Promise<void>;            // nút chỉ hiện khi VITE_SUPABASE_GOOGLE=true
  signInWithPassword(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;               // rpc delete_my_account()
  progressFor(userId: string): RemoteProgress;  // đọc/ghi một dòng user_backups
  leaderboardFor(userId: string): LeaderboardApi;
};
export type LeaderboardKind = 'week' | 'total' | 'streak' | 'accuracy' | 'letter';
export type LeaderboardRow = { rank: number; name: string; score: number; detail: number | null; me: boolean };
export type LeaderboardApi = {
  loadMine(): Promise<{ display_name: string; show_on_leaderboard: boolean } | null>;
  join(displayName: string): Promise<void>;     // update rồi insert (không upsert: client không được ghi user_id)
  leave(): Promise<void>;
  top(kind: LeaderboardKind, letter?: string): Promise<LeaderboardRow[]>; // rpc get_leaderboard
};

// frontend/src/sync/account.ts — Zustand store, trạng thái:
// status: 'disabled' | 'loading' | 'signed_out' | 'signed_in'; sync: 'idle' | 'syncing' | 'done' | 'error'; lastSyncAt; message; detail
```

| Bảng / hàm Supabase | Dùng bởi |
|---|---|
| `user_backups` (select/insert/update theo `auth.uid()`) | `progressFor().load/save` |
| `public_profiles` (cột ghi được: `display_name`, `show_on_leaderboard`) | `LeaderboardApi.loadMine/join/leave` |
| `get_leaderboard(p_kind, p_letter, p_limit)` → `(rank_no, shown_name, score, detail, is_me)` | `LeaderboardApi.top` |
| `delete_my_account()` | `AuthApi.deleteAccount` |

Dữ liệu gửi đi là phần `data` đã lọc bằng `pickSynced` (`profile, stats, progress, daily, sign_stats`), gộp bằng `mergeProgress` (03 §6.2).

## 9. Mã lỗi phía client

| code | Khi nào | UI |
|---|---|---|
| `INSECURE_CONTEXT` | Không phải HTTPS/localhost | Thông báo cần HTTPS |
| `CAMERA_DENIED` | Người dùng từ chối quyền | Hướng dẫn cấp quyền theo trình duyệt |
| `CAMERA_NOT_FOUND` | Không có thiết bị | Gợi ý cắm webcam; vẫn học được thẻ `learn_card`, `choose_sign` |
| `MODEL_LOAD_FAILED` | Lỗi tải / sha256 / manifest | Nút "Thử lại" |
| `WEBGL_UNAVAILABLE` | Không có GPU delegate | Tự chuyển CPU, hiện cảnh báo hiệu năng |
| `STORAGE_UNAVAILABLE` | localStorage bị chặn | Banner "Tiến độ sẽ không được lưu" |
| `BACKUP_INVALID` | File nhập sai schema | Thông báo lý do, không ghi đè |
| `auth_failed` (account store) | Supabase từ chối đăng nhập/đăng ký | Thông báo + lý do gốc của dịch vụ; gợi ý Đăng ký khi chưa có tài khoản |
| Lỗi ghi bảng xếp hạng | Supabase từ chối `join` | "Chưa lưu được" + lý do gốc của dịch vụ |

## 10. Truy vết Feature → Hợp đồng

| Feature | Hợp đồng |
|---|---|
| FT-ML-06, FT-SYS-01 | K2 |
| FT-LAB-01..04 | K1 + `RecognitionEngine.getPerf/recordBenchmark` |
| FT-LRN-02..07 | K3 + K4 (`startSession`, `recordAttempt`, `completeSession`) |
| FT-LRN-04 | K2 `class_templates`, `confusable` + `fingerFeedback` |
| FT-GAM-01..04 | K4 `src/game/*` |
| FT-ACC-02..04 | K4 settings, import, clear |
| FT-SYS-02 | K5 landmark capture |
| Tài khoản, đồng bộ, bảng xếp hạng | K6 |
