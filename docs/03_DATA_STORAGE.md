# 03 — Data & Storage: SignLingo AI

> **Trạng thái:** Draft v0.2 — chờ review · **Ngày:** 2026-11-18
> **Thay thế** `03_DATABASE_SCHEMA.md` (v0.1). Theo quyết định ngày 2026-11-18: **không có backend và không có DB server**. Dữ liệu chia thành 3 loại: (1) **nội dung tĩnh** đóng gói cùng app, (2) **dữ liệu người học** lưu trong trình duyệt, (3) **dữ liệu ML** sinh offline bởi `ml/`.
> Truy vết: [01_PRD](01_PRD.md) §5 · [04_CONTRACTS](04_CONTRACTS.md)

---

## 1. Tổng quan

```mermaid
flowchart LR
  subgraph Build["Lúc build (repo)"]
    CUR[frontend/src/content/curriculum.json<br/>do người dùng duyệt] --> APP[Vite bundle]
    ML[ml/ pipeline] --> PUB[frontend/public/<br/>models/*.onnx · manifest<br/>data/experiments/*.json]
  end
  subgraph Browser["Trong trình duyệt người học"]
    APP --> ST[src/storage/<br/>LearnerStore]
    ST <--> LS[(localStorage<br/>signlingo:v1:*)]
    ST --> EXP[Xuất / Nhập JSON<br/>sao lưu thủ công]
    COL[/collect/] --> DL[Tải file mẫu landmark<br/>.json về máy]
  end
  DL -. nhóm gom thủ công .-> MLRAW[(ml/data/raw/webcam/)]
  MLRAW --> ML
```

| Loại | Lưu ở đâu | Ai ghi | Ghi chú |
|---|---|---|---|
| Nội dung học (units, lessons, items, signs) | `frontend/src/content/curriculum.json` (+ media trong `public/media/`) | Nhóm (qua PR) | **Nội dung do người dùng cung cấp/duyệt**, không tự sinh |
| Tiến độ, XP, streak, hearts, cài đặt | `localStorage` (khóa `signlingo:v1:*`) | App | Mất khi xóa dữ liệu trình duyệt → có Xuất/Nhập JSON |
| Lịch sử phiên & benchmark FPS | `localStorage` (giới hạn N bản ghi gần nhất) | App | Xuất JSON cho báo cáo RQ3 |
| Mẫu landmark thu thêm | **File tải về**, không lưu trên server | Người thu | Nhóm chép vào `ml/data/raw/webcam/` |
| Mô hình, manifest, kết quả thí nghiệm | `frontend/public/models/`, `frontend/public/data/` | `ml/` publish script | File tĩnh, cache theo version |

## 2. Nội dung tĩnh: `curriculum.json`

Schema: `shared/contracts/schemas/curriculum.schema.json` (kiểm bằng test khi build).

```mermaid
erDiagram
  UNIT ||--o{ LESSON : contains
  LESSON ||--o{ ITEM : contains
  SIGN ||--o{ ITEM : "target of"
  SIGN ||--o{ MEDIA : illustrated_by
  UNIT { string code PK  int level  string title  int order }
  LESSON { string code PK  string unit_code FK  string title  int order  int xp_reward  string[] requires }
  ITEM { string lesson_code FK  int order  enum type  string sign_code FK  string word  object config }
  SIGN { string code PK  string gloss  enum kind  string model_task  int model_class_index  object hints }
  MEDIA { string sign_code FK  enum type  string src  string license  string attribution }
```

| Trường | Ràng buộc |
|---|---|
| `unit.level` | 1 = Bảng chữ cái, 2 = Fingerspelling, 3 = Từ vựng (COULD) |
| `lesson.requires` | Danh sách `lesson.code` phải hoàn thành để mở; rỗng = mở mặc định |
| `item.type` | `learn_card` · `perform_sign` · `choose_sign` · `spell_word` · `perform_dynamic` |
| `item.sign_code` | Bắt buộc với mọi type trừ `spell_word` |
| `item.word` | Bắt buộc với `spell_word`; chỉ gồm chữ có trong `labels` của mô hình active |
| `item.config` | `{ hold_ms?, threshold?, time_limit_ms? }` — mặc định lấy từ `manifest.recommended` |
| `sign.model_class_index` | Phải khớp vị trí trong `manifest.labels` (kiểm ở test) |
| `media.license`, `attribution` | Bắt buộc |

`signs` cho 24 chữ tĩnh được **suy ra từ label map** (`ml/config.py`), không phải dữ liệu tự bịa. `hints`, `media`, danh sách lesson/từ **chờ người dùng cung cấp**.

## 3. Dữ liệu người học trong trình duyệt

### 3.1 Nguyên tắc
- Mọi truy cập qua module `src/storage/` (adapter), **không gọi `localStorage` trực tiếp** trong component.
- Mọi đọc/ghi bọc `try/catch`; khi storage không dùng được (chế độ riêng tư, bị chặn) → chạy bằng bộ nhớ tạm và hiện banner "Tiến độ sẽ không được lưu".
- Mỗi khóa có `schema_version`; khi đổi cấu trúc phải viết hàm `migrate(vN → vN+1)` kèm unit test.
- Không lưu ảnh/video. Không lưu thông tin định danh ngoài tên hiển thị (tùy chọn).
- Dung lượng mục tiêu < 1 MB; lịch sử phiên giữ tối đa 200 bản ghi, benchmark tối đa 20.

### 3.2 Lược đồ khóa (`schema_version = 1`)

| Khóa | Kiểu | Nội dung |
|---|---|---|
| `signlingo:v1:profile` | `Profile` | `{ display_name?: string, created_at: ISO, timezone: IANA }` |
| `signlingo:v1:settings` | `Settings` | `{ theme: 'system'\|'light'\|'dark', handedness: 'right'\|'left', sound_on: bool, reduced_motion: 'system'\|'on'\|'off', daily_xp_goal: 10\|20\|30\|50, camera_device_id?: string }` |
| `signlingo:v1:stats` | `Stats` | `{ total_xp, current_streak, longest_streak, last_goal_date: 'YYYY-MM-DD'\|null, hearts: 0..5, hearts_updated_at: ISO }` |
| `signlingo:v1:progress` | `Record<lesson_code, LessonProgress>` | `{ status: 'completed'\|'in_progress', best_accuracy_pct, times_completed, last_completed_at }` (trạng thái `locked/available` **tính ra** từ `requires`, không lưu) |
| `signlingo:v1:daily` | `Record<'YYYY-MM-DD', DailyActivity>` | `{ xp_earned, lessons_completed, goal_met }` — giữ 120 ngày gần nhất |
| `signlingo:v1:sessions` | `SessionRecord[]` | Xem §3.3 |
| `signlingo:v1:sign_stats` | `Record<sign_code, SignStat>` | `{ attempts, correct, avg_time_to_verify_ms }` — cho mục "Chữ cần ôn" |
| `signlingo:v1:benchmarks` | `PerfRecord[]` | Kết quả "Ghi 60 s benchmark" (§3.4) |
| `signlingo:v1:meta` | `{ schema_version: 1, app_version, model_version_seen }` | |

### 3.3 `SessionRecord`

```ts
type SessionRecord = {
  id: string;                     // crypto.randomUUID()
  mode: 'lesson' | 'free_practice' | 'review';
  lesson_code: string | null;
  model: { model_id: string; version: string };
  started_at: string; completed_at: string | null;
  status: 'completed' | 'abandoned' | 'failed_no_hearts';
  accuracy_pct: number | null;
  xp_awarded: number;             // ghi một lần khi completed (idempotent theo id)
  hearts_lost: number;            // số tim mất trong phiên; quyết định bonus "không mất tim"
  attempts: Array<{
    item_order: number; position: number | null;   // position: chỉ số chữ trong spell_word
    expected: string; predicted: string | null; confidence: number | null;
    result: 'correct' | 'timed_out' | 'skipped';
    time_to_verify_ms: number | null; retries: number;
    confused_with: string | null;
  }>;
  perf: { fps_avg: number; frame_ms_p95: number; mp_ms_p50: number; cls_ms_p50: number; backend: 'webgpu' | 'wasm' } | null;
};
```

### 3.4 `PerfRecord` (bằng chứng RQ3)

```ts
type PerfRecord = {
  id: string; recorded_at: string; duration_s: 60;
  model: { model_id: string; version: string };
  backend: 'webgpu' | 'wasm'; delegate: 'GPU' | 'CPU'; worker: boolean;
  camera: { width: number; height: number; fps_reported: number };
  frame_ms: { p50: number; p95: number; max: number };
  mp_ms: { p50: number; p95: number }; cls_ms: { p50: number; p95: number };
  processing_fps_avg: number; dropped_frames: number;
  user_agent: string;
};
```

### 3.5 Quy tắc nghiệp vụ (module TS thuần `src/game/`, không phụ thuộc DOM)

| Quy tắc | Giá trị mặc định (cần duyệt) |
|---|---|
| XP hoàn thành bài | `lesson.xp_reward` (mặc định 10) |
| Bonus độ chính xác | `round(5 × accuracy)` |
| Bonus không mất tim | +5 |
| Mục tiêu ngày | `settings.daily_xp_goal` (mặc định 20) |
| Hearts | Tối đa 5; mất 1 khi `timed_out`/`skipped` trong mode `lesson` **và** độ tin cậy cuối cùng của mô hình ≥ ngưỡng (tránh phạt người học vì mô hình phân vân); hồi 1 tim / 30 phút, tính lười khi đọc |
| Streak | Ngày (theo múi giờ máy) có `xp_earned ≥ goal` lần đầu → +1; ngày gần nhất đạt mục tiêu < hôm qua → streak về 0 khi đọc |
| Idempotent | `completeSession(id)` gọi lại không cộng XP lần 2 |

> Vì không có server, XP có thể bị người dùng sửa bằng DevTools. Chấp nhận được với dự án học tập; ghi trong phần Giới hạn của báo cáo.

### 3.6 Xuất / Nhập (sao lưu)

- **Xuất:** file `signlingo-backup-YYYYMMDD.json` = `{ schema_version, exported_at, app_version, data: { profile, settings, stats, progress, daily, sign_stats, sessions, benchmarks } }`.
- **Nhập:** kiểm JSON Schema `shared/contracts/schemas/backup.schema.json` → chạy `migrate` nếu version cũ → hỏi xác nhận "Ghi đè tiến độ hiện tại?" → ghi.
- **Xóa dữ liệu:** nút trong Cài đặt, có xác nhận.

## 4. Mẫu landmark thu thêm (thay cho bảng `landmark_samples`)

Trang `/collect` tạo file `landmarks_<sign>_<signer>_<timestamp>.json`, schema `shared/contracts/schemas/landmark_capture.schema.json`:

```json
{
  "schema_version": 1,
  "preprocess_version": "raw",
  "signer_id": "S01",
  "capture_session_id": "uuid",
  "device": { "user_agent": "…", "camera": { "width": 640, "height": 480 } },
  "samples": [
    { "sign_code": "LETTER_R", "handedness": "Right", "captured_at": "ISO",
      "frames": [ [[0.51, 0.72, -0.01], "… 21 điểm (x, y, z) chưa chuẩn hóa"] ] }
  ]
}
```

- `signer_id` là **mã ẩn danh do nhóm tự đặt** (S01, S02…), không phải tên thật. Danh sách mã ↔ người chỉ nhóm giữ, không commit.
- `capture_session_id` dùng cho split theo phiên; `signer_id` dùng cho signer-holdout (FT-ML-07).
- `ml/src/signlingo_ml/landmarks/ingest.py` đọc các file này từ `ml/data/raw/webcam/` (gitignored).
- Không lưu ảnh/video; trang `/collect` hiển thị rõ điều này.

## 5. Dữ liệu ML (offline, `ml/`)

| Đường dẫn | Nội dung | Commit? |
|---|---|---|
| `ml/data/raw/` | Kaggle CSV, `keypoint.csv`, `webcam/*.json` | ✗ (gitignore; README hướng dẫn tải) |
| `ml/data/processed/split_v1.parquet` | `row_id, label, group_id, split` | ✗ (tái tạo bằng pipeline) |
| `ml/reports/experiments/*.json` | Kết quả từng run (schema `experiment.schema.json`) | ✓ |
| `ml/reports/figures/*.png` | Hình cho báo cáo | ✓ |
| `ml/artifacts/*.onnx`, `*.manifest.json` | Mô hình đã export | ✗; bản publish được copy vào `frontend/public/models/` và **commit** (vài MB) |

Publish script (`python -m signlingo_ml.export.publish`) copy:
- `artifacts/<model>-<ver>.onnx` + `.manifest.json` → `frontend/public/models/`
- cập nhật `frontend/public/models/index.json` (model active cho từng task)
- `reports/experiments/*.json` (bỏ trường nặng không cần) → `frontend/public/data/experiments/` + `index.json`

## 6. Truy vết Feature → Lưu trữ

| Feature | Nơi lưu |
|---|---|
| FT-LRN-01 Skill Tree | `curriculum.json` + `progress` |
| FT-LRN-02..07 | `curriculum.json` + `sessions`, `sign_stats` |
| FT-LRN-04 Feedback ngón | `manifest.class_templates` |
| FT-GAM-01..04 | `stats`, `daily`, `sessions` |
| FT-ACC-02/03 Hồ sơ cục bộ, Cài đặt | `profile`, `settings` |
| FT-ACC-04 Xuất/Nhập | §3.6 |
| FT-SYS-01 Phiên bản mô hình | `public/models/index.json` + manifest |
| FT-SYS-02 Thu mẫu | File tải về (§4) |
| FT-LAB-01..04 | `public/data/experiments/*.json`, `benchmarks` |
