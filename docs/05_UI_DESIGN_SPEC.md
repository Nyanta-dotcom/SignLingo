# 05 — UI Design Spec: SignLingo AI

> **Trạng thái:** Draft v0.2 — chờ review · **v0.2:** bỏ đăng nhập; tiến độ lưu trên máy, có Xuất/Nhập · Dùng làm đầu vào Prototype trên **V0 / Claude Design** (xem §8 Prompt mẫu).
> Phong cách: *học tập gamification kiểu Duolingo* (cảm hứng về cơ chế & cảm giác vui, **không sao chép thương hiệu, linh vật, minh họa hay màu xanh lá đặc trưng của Duolingo**). Màu chủ đạo: **Xanh dương Cobalt / Sky**.

---

## 1. Nguyên tắc thiết kế

| # | Nguyên tắc | Áp dụng |
|---|---|---|
| D1 | **Camera là trung tâm** | Màn học: khung webcam chiếm ≥ 50% chiều rộng desktop, luôn thấy skeleton tay |
| D2 | **Phản hồi tức thì, đa kênh** | Màu + biểu tượng + chữ + âm thanh (không chỉ dựa vào màu — cho người mù màu) |
| D3 | **Không phụ thuộc âm thanh** | Người khiếm thính là người dùng chính: mọi âm báo có tín hiệu hình tương đương (rung UI, toast, icon) |
| D4 | **Vui nhưng gọn** | Nút "3D" dày, bo tròn lớn, hiệu ứng nảy ngắn (≤ 300 ms); tôn trọng `prefers-reduced-motion` |
| D5 | **Minh bạch AI** | Luôn có chỗ xem confidence, "AI đang thấy chữ gì", và liên kết tới AI Lab |

## 2. Design Tokens

Định nghĩa dưới dạng CSS variables trong `frontend/src/styles/tokens.css`, ánh xạ vào Tailwind (`theme.extend.colors.brand = 'rgb(var(--brand-600) / <alpha-value>)'`…).

### 2.1 Bảng màu thương hiệu (Brand – Cobalt/Sky)

| Token | Hex | Dùng cho |
|---|---|---|
| `brand-50` | `#EEF5FF` | Nền nhấn nhẹ, hover hàng |
| `brand-100` | `#D9E8FF` | Nền node đã hoàn thành (light) |
| `brand-200` | `#B5D2FF` | Viền focus phụ |
| `brand-300` | `#7CB4FF` | Link/nhấn trên nền tối |
| `brand-400` | `#4C9AFF` | Icon, vòng tiến độ (dark) |
| `brand-500` | `#2F86FF` | Accent, progress bar fill |
| **`brand-600`** | **`#1D6FE8`** | **Nút chính, màu thương hiệu** (chữ trắng: 4,7:1 ✅ AA) |
| `brand-700` | `#1557C0` | Viền đáy nút 3D (shadow), hover |
| `brand-800` | `#12459A` | Pressed |
| `brand-900` | `#0F3570` | Tiêu đề trên nền brand-50 |
| `sky-400` | `#38BDF8` | Highlight phụ, gradient đầu |
| `sky-500` | `#0EA5E9` | Badge "Mới", skeleton tay |

### 2.2 Màu ngữ nghĩa

| Token | Light | Dark | Ghi chú |
|---|---|---|---|
| `success-fg` | `#15803D` | `#4ADE80` | Văn bản "Chính xác!" |
| `success-bg` | `#DCFCE7` | `#0F2A1B` | Banner đúng |
| `danger-fg` | `#DC2626` | `#F87171` | Sai, mất tim, ngón lệch |
| `danger-bg` | `#FEE2E2` | `#2A1215` | Banner sai |
| `warning-fg` | `#B45309` | `#FBBF24` | "Gần đúng", độ tin cậy thấp |
| `streak` | `#F59E0B` | `#FBBF24` | Icon ngọn lửa (chỉ icon, không làm nền chữ) |
| `xp` | `#EAB308` | `#FACC15` | Icon/chip XP |
| `heart` | `#EF4444` | `#F87171` | Icon tim |

### 2.3 Màu bề mặt & chữ (theme)

| Token | Light | Dark |
|---|---|---|
| `bg` (nền trang) | `#F5F9FF` | `#0B1220` |
| `surface` (thẻ) | `#FFFFFF` | `#111A2E` |
| `surface-2` (thẻ lồng, input) | `#EEF3FB` | `#18233B` |
| `border` | `#D6E0EE` | `#263354` |
| `text` | `#0F172A` | `#E6EDF8` |
| `text-muted` | `#475569` | `#9AA8C1` |
| `text-on-brand` | `#FFFFFF` | `#FFFFFF` |
| `focus-ring` | `#2F86FF` | `#7CB4FF` |
| `overlay-skeleton` | `#0EA5E9` | `#38BDF8` |
| `overlay-joint-ok` | `#22C55E` | `#4ADE80` |
| `overlay-joint-bad` | `#EF4444` | `#F87171` |

**Chuyển theme:** thuộc tính `data-theme="light|dark"` trên `<html>`; mặc định theo `prefers-color-scheme`; lưu lựa chọn ở `localStorage` + `user_settings.theme`. Transition `background-color, color, border-color 200ms ease` (tắt khi reduced-motion). Script inline trong `index.html` đặt theme trước khi render để tránh nháy.

### 2.4 Typography

| Token | Giá trị |
|---|---|
| Font | **Nunito** (Google Fonts, hỗ trợ tiếng Việt) – weight 600/700/800; fallback `system-ui` |
| Số liệu | `font-variant-numeric: tabular-nums` cho XP, FPS, metrics |
| Mono (AI Lab) | `JetBrains Mono` 500 |
| Scale | `display 40/48 800` · `h1 32/40 800` · `h2 24/32 800` · `h3 20/28 700` · `body 16/24 600` · `small 14/20 600` · `caption 12/16 700 uppercase tracking .04em` |
| Chữ cái mục tiêu (màn học) | 96–128 px, 800 |

### 2.5 Spacing, Radius, Shadow, Motion

| Nhóm | Token |
|---|---|
| Spacing (4px grid) | `1=4 · 2=8 · 3=12 · 4=16 · 5=20 · 6=24 · 8=32 · 10=40 · 12=48 · 16=64` |
| Radius | `sm 8` · `md 12` · `lg 16` · `xl 20` (thẻ) · `2xl 28` (khung camera) · `full` (node, chip) |
| Nút 3D | `box-shadow: 0 4px 0 var(--brand-700)`; active: `translateY(4px)` + shadow 0 |
| Shadow thẻ | Light `0 2px 0 #D6E0EE` · Dark `0 2px 0 #263354` (phẳng, kiểu game) |
| Motion | `fast 120ms` · `base 200ms` · `bounce 300ms cubic-bezier(.34,1.56,.64,1)`; confetti ≤ 1,2 s |
| Breakpoints | `sm 640` · `md 768` · `lg 1024` · `xl 1280` |
| Touch target | ≥ 44×44 px |

## 3. Thư viện Component

| Component | Biến thể / trạng thái | Ghi chú |
|---|---|---|
| `Button` | primary (brand) · secondary (viền) · success · danger · ghost; size sm/md/lg; loading; disabled | Nút 3D; chữ HOA, 700 |
| `IconButton` | — | aria-label bắt buộc |
| `Card` | default · interactive · selected | |
| `ProgressBar` | lesson (dày 16px, bo full, có highlight sáng phía trên) · hold (vòng tròn) | `role="progressbar"` + `aria-valuenow` |
| `HoldRing` | 0–100%, đổi màu brand → success khi đạt | Bao quanh chữ mục tiêu / góc khung camera |
| `StatChip` | streak 🔥 · XP ⚡ · hearts ❤ | Trên TopBar; tooltip giải thích |
| `SkillNode` | locked · available · in_progress (vòng tiến độ) · completed (ngôi sao/vương miện) · current (nảy nhẹ) | Tròn 72px, nút 3D |
| `CameraFrame` | loading · no-permission · no-hand · tracking · verified · error | Gồm `<video>` + `<canvas>` overlay, gương ngang để người dùng thấy như soi gương |
| `PredictionBars` | top-3 (học) · top-24 (AI Lab) | Thanh ngang, label + % |
| `FingerHint` | danh sách ngón lệch + icon bàn tay SVG tô ngón | |
| `FeedbackBanner` | correct · incorrect · near (confused_with) | Trượt từ đáy, có nút TIẾP TỤC |
| `Modal`, `Toast`, `Tooltip`, `Tabs`, `Switch`, `Select` | | Radix primitives |
| `ThemeToggle` | system/light/dark | |
| `ConfusionMatrix` | heatmap 24×24, hover hiện `true→pred %`, click ô mở gallery | Màu tuần tự brand-50 → brand-900 |
| `MetricTable` | sort theo cột, đánh dấu mô hình tốt nhất | |
| `FpsMeter` | số + sparkline 60 s, ngưỡng 30 vạch đứt | |

## 4. Kiến trúc thông tin & Điều hướng

```
/                 → Landing lần đầu (giới thiệu + nút BẮT ĐẦU) · lần sau chuyển thẳng /learn
/learn            → Dashboard lộ trình (Skill Tree)            [Tab: Học]
/lesson/:id       → Lesson Player (toàn màn, không nav)
/lesson/:id/done  → Màn kết quả
/practice         → Luyện tự do                                [Tab: Luyện]
/dictionary       → Từ điển ký hiệu                            [Tab: Từ điển]
/lab              → AI Lab (Benchmark · Confusion · Live · Leakage)   [Tab: AI Lab]
/profile          → Hồ sơ & thống kê                           [Tab: Hồ sơ]
/settings         → Cài đặt
/collect          → Thu mẫu dữ liệu (contributor)
/collect/export   → (trong /collect) tải file mẫu đã thu
```

Desktop: sidebar trái (logo, 5 tab) + nội dung giữa + cột phải (StatChips, mục tiêu ngày, mẹo). Mobile/tablet: bottom nav 5 tab; cột phải chuyển lên TopBar.

## 5. Màn hình chính

### 5.1 Dashboard lộ trình (`/learn`) — FT-LRN-01, FT-GAM-*

```
┌──────────┬──────────────────────────────────────────┬───────────────────┐
│ ◆ Sign-  │  ┌────────────────────────────────────┐  │ 🔥 4   ⚡ 340  ❤ 5 │
│   Lingo  │  │ CẤP 1 · UNIT 1  Bảng chữ cái A–E    │  │───────────────────│
│          │  │ [📖 HƯỚNG DẪN]                      │  │ Mục tiêu hôm nay   │
│ ● Học    │  └────────────────────────────────────┘  │ ▓▓▓▓▓░░░ 15/20 XP  │
│ ○ Luyện  │              (★)  A                       │───────────────────│
│ ○ Từ điển│           (★)     B                       │ Chữ cần ôn         │
│ ○ AI Lab │              (◐)  C  ← "BẮT ĐẦU" tooltip  │ N · S · R          │
│ ○ Hồ sơ  │           (🔒)    D                       │ [ÔN NGAY]          │
│          │              (🔒) 🏆 Checkpoint           │───────────────────│
│ ⚙ Cài đặt│  ┌────────────────────────────────────┐  │ AI đang dùng:      │
│          │  │ CẤP 1 · UNIT 2  F–K  (khóa)         │  │ landmark-mlp 1.2   │
└──────────┴──┴────────────────────────────────────┴──┴───────────────────┘
```
- Node xếp **zig-zag** theo trục dọc; banner mỗi Unit dùng nền `brand-600` chữ trắng, Unit cấp 2 dùng `sky-500`→`brand-600` gradient, cấp 3 `brand-800`.
- Click node available → popover: tên bài, số bài tập, XP, nút **BẮT ĐẦU**.
- Banner nhắc sao lưu: "Tiến độ chỉ lưu trên trình duyệt này — Xuất bản sao lưu" (hiện sau mỗi 7 ngày hoặc khi XP ≥ 100, đóng được).
- Khi `localStorage` bị chặn: banner `warning` "Tiến độ sẽ không được lưu" (AC-ACC-02).

### 5.2 Lesson Player – Màn học Webcam (`/lesson/:id`) — FT-LRN-02..05

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ✕   ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░  4/10                         ❤ 5     │
├───────────────────────────────┬─────────────────────────────────────────┤
│   Hãy ra dấu chữ               │  ┌───────────────────────────────────┐ │
│        ╭──────╮                │  │                                   │ │
│        │  C   │ ← HoldRing     │  │      [ webcam (mirror) ]          │ │
│        ╰──────╯   72%          │  │      skeleton sky-500             │ │
│   [ảnh/GIF mẫu cách ra dấu]    │  │      ngón lệch: đỏ                │ │
│                                │  │                         ● AI: C 84%│ │
│   💡 Gợi ý                      │  └───────────────────────────────────┘ │
│   • Cong tất cả ngón như chữ C │   Top-3:  C ███████ 84%                 │
│   ⚠ Ngón cái: mở rộng hơn 20°  │           O ██ 9%    E █ 3%             │
│                                │   [ĐỔI TAY]  [ẨN KHUNG XƯƠNG]  ⏱ 0:12   │
├───────────────────────────────┴─────────────────────────────────────────┤
│  [BỎ QUA]                                                  [KIỂM TRA]*  │
└─────────────────────────────────────────────────────────────────────────┘
 * Với perform_sign: không cần bấm — tự verify khi HoldRing đầy; nút chỉ hiện khi tắt auto.
```
- **Trạng thái CameraFrame:** loading (skeleton shimmer + "Đang tải AI…" kèm %), no-permission (minh họa + nút "Cấp quyền camera" + hướng dẫn theo trình duyệt), no-hand > 2 s (khung nhấp nháy viền `warning`, chữ "Đưa tay vào khung"), tracking, verified (viền `success`, nảy, âm "ding").
- **FeedbackBanner** trượt lên khi verified: nền `success-bg`, "Tuyệt vời! ⚡ +1", nút TIẾP TỤC (Enter). Khi timed_out: nền `danger-bg`, "Chưa đúng — đây là cách làm chữ C", hiện lại media, mất 1 tim (animation tim vỡ).
- **Near-miss:** nếu top-1 là chữ dễ nhầm → chip `warning`: "Đang giống **O** — mở rộng khoảng cách ngón cái".
- **Fingerspelling (`spell_word`):** hàng ô chữ `[H][E][L][L][O]` phía trên; ô hiện tại viền brand, ô đã verify nền success; HoldRing áp cho chữ hiện tại; chữ trùng liên tiếp (LL) yêu cầu hạ tay/nhả (no-hand hoặc đổi nhãn) giữa hai lần.
- **choose_sign:** hiện ảnh tay, chọn 1 trong 4 chữ (không cần camera) — giảm mệt.
- Phím tắt: `Enter` tiếp tục, `S` bỏ qua, `H` ẩn skeleton, `Esc` thoát (xác nhận).
- Mobile: camera trên, chữ mục tiêu + HoldRing chồng góc trên trái camera, gợi ý dạng bottom sheet.

### 5.3 Màn kết quả (`/lesson/:id/done`) — FT-GAM-04

- Tiêu đề "Hoàn thành bài học!" + confetti; 3 thẻ số: **⚡ XP** (đếm tăng dần), **🎯 Chính xác %**, **⏱ Thời gian**.
- Streak: ngọn lửa + "4 → 5 ngày" khi vừa đạt mục tiêu.
- Danh sách chữ sai nhiều nhất → nút "Ôn lại".
- Nút **TIẾP TỤC** (về /learn, node kế tiếp nảy).

### 5.4 Luyện tự do (`/practice`) — FT-LRN-07

Camera lớn + chữ dự đoán khổng lồ + Top-3 + lịch sử chữ đã nhận (chuỗi ký tự tích lũy, nút xóa/space) → tạo cảm giác "gõ bằng tay". Không trừ tim.

### 5.5 AI Lab (`/lab`) — FT-LAB-01..04 (dành cho người chấm, P3)

Tabs: **Benchmark · Phân tích lỗi · Live Monitor · Data Leakage · Về dữ liệu**

```
┌ Benchmark ─────────────────────────────────────────────────────────────┐
│ Dataset: [Sign Language MNIST ▾]  Split: group_ward70   Seed 42  commit│
│ ┌──────────────┬────────┬────────┬────────┬────────┬───────┬────────┐  │
│ │ Model        │Features│Val F1  │Test Acc│Test F1 │Err %  │ms/img  │  │
│ │ Majority     │ –      │ …      │ …      │ …      │ …     │ …      │  │
│ │ …            │        │        │        │        │       │        │  │
│ │ ★ CNN+aug    │ 28×28  │ …      │ …      │ …      │ …     │ …      │  │
│ └──────────────┴────────┴────────┴────────┴────────┴───────┴────────┘  │
│ [Bar chart Test Macro-F1, vạch đứt = mốc baseline tốt nhất]            │
└────────────────────────────────────────────────────────────────────────┘
```
(Mọi số lấy từ file tĩnh `/data/experiments/index.json` do `ml/` sinh — không hardcode.)
- **Phân tích lỗi:** chọn mô hình → `ConfusionMatrix` 24×24 (chuẩn hóa hàng) + bảng Top cặp nhầm + bar per-class F1 + gallery ảnh sai (nếu có) + khung trả lời **RQ2**.
- **Live Monitor:** camera + `PredictionBars` 24 lớp + `FpsMeter` (thời gian xử lý khung p50/p95 với vạch 33 ms, MediaPipe ms, classifier ms, FPS xử lý, ORT backend WebGPU/WASM, delegate GPU/CPU) + nút "Ghi 60 s benchmark" lưu vào lịch sử và **tải file JSON** → bằng chứng **RQ3**.
- **Data Leakage:** biểu đồ cột đôi Val vs Test cho random vs group split, sơ đồ giải thích vì sao các bản augment của cùng một ảnh gây rò rỉ khi chia ngẫu nhiên (số liệu lấy từ thí nghiệm `leakage_study`).
- **Về dữ liệu:** phân bố lớp, ảnh mẫu mỗi chữ, giấy phép dataset.

### 5.6 Hồ sơ (`/profile`)
Avatar chữ cái đầu (từ tên hiển thị tùy chọn), tổng XP, streak dài nhất, heatmap hoạt động 12 tuần (màu brand), bảng "độ thành thạo" từng chữ (vòng % đúng).

### 5.7 Cài đặt (`/settings`)
Giao diện (System/Light/Dark preview), Tay thuận (trái/phải — ảnh hưởng mirror), Camera (chọn thiết bị, xem thử), Âm thanh (on/off), Mục tiêu ngày (10/20/30/50), Dữ liệu (ghi chú "Mọi dữ liệu chỉ nằm trên trình duyệt này, không gửi đi đâu"; nút **Xuất tiến độ**, **Nhập tiến độ** (hỏi xác nhận ghi đè), **Xóa toàn bộ dữ liệu** (xác nhận 2 bước)), Tên hiển thị (tùy chọn).

### 5.8 Thu mẫu (`/collect`) — FT-SYS-02
Nhập mã người ra dấu ẩn danh (S01…) → chọn chữ → đếm ngược 3-2-1 → ghi N khung landmark → xem lại skeleton → Giữ / Bỏ. Thanh tiến độ "30/50 mẫu chữ R". Nút **TẢI FILE** (`landmarks_<chữ>_<mã>_<thời gian>.json`). Ghi rõ: "Chỉ lưu tọa độ khớp tay, không lưu hình ảnh". Mẫu chưa tải giữ tạm trong bộ nhớ trang; rời trang sẽ hỏi xác nhận.

## 6. Âm thanh & Hiệu ứng (FT-GAM-05)

| Sự kiện | Âm | Hình tương đương (bắt buộc) |
|---|---|---|
| Hold đạt 100% | "ding" ngắn | HoldRing chuyển success + nảy |
| Sai/timeout | "bonk" trầm | Banner đỏ + rung ngang 200 ms |
| Hoàn thành bài | fanfare 1 s | Confetti + đếm XP |
| Streak tăng | "whoosh" | Ngọn lửa phóng to |
| Mất tim | "pop" | Tim vỡ |

Âm thanh cần nguồn có giấy phép hoặc tự tạo — **chờ người dùng chọn**.

## 7. Accessibility (AC-UI-02)

- Tương phản ≥ 4,5:1 cho văn bản thường, ≥ 3:1 cho icon/viền trạng thái ở **cả hai theme** (đã chọn token theo tiêu chí này; kiểm lại bằng axe trong E2E).
- Focus ring 3px `focus-ring`, không bỏ outline.
- Trạng thái nhận diện được thông báo qua `aria-live="polite"` ("Đã nhận chữ C, độ tin cậy 84%"), throttle 1 lần/giây.
- Không truyền đạt thông tin chỉ bằng màu: ngón lệch có icon ⚠ + chữ.
- Hỗ trợ người thuận tay trái (mirror) và người dùng một tay.

## 8. Prompt mẫu cho V0 / Claude Design

```
Build a responsive web app UI called "SignLingo AI" — a gamified American Sign Language
learning app (inspired by the mechanics of language-learning games, but with an original
look; no green; no owl or any existing mascot).
Brand: cobalt blue primary #1D6FE8 (3D buttons with 4px bottom shadow #1557C0), sky accent
#38BDF8, light bg #F5F9FF / dark bg #0B1220, cards #FFFFFF / #111A2E, font Nunito 600–800,
large rounded corners (20–28px). Support light/dark toggle via data-theme on <html>.
Screens:
1) /learn dashboard: left sidebar nav (Learn, Practice, Dictionary, AI Lab, Profile),
   center zig-zag skill path of round 72px nodes (locked/available/in-progress/completed)
   grouped under unit banners, right column with streak/XP/hearts chips and daily goal bar.
2) /lesson/:id: full-screen lesson player; top progress bar + hearts; left: big target letter
   inside a circular hold-progress ring, reference image, hint list; right: mirrored webcam
   frame with hand skeleton overlay, top-3 prediction bars; bottom bar with SKIP and a slide-up
   feedback banner (success green / error red). Include states: loading AI, camera permission
   denied, no hand detected, verified.
3) /lab: tabs Benchmark (sortable metrics table + bar chart), Error Analysis (24×24 confusion
   matrix heatmap in blue scale + per-class F1 bars), Live Monitor (webcam, 24 probability bars,
   FPS meter with 30 FPS dashed threshold), Data Leakage (grouped bar chart random vs group split).
Use placeholder numbers clearly marked "—"; do not invent metrics.
```

## 9. Cần người dùng cung cấp / quyết định

1. Logo & tên hiển thị cuối cùng (SignLingo AI?), có linh vật riêng không.
2. Nguồn ảnh/GIF minh họa từng chữ ASL (có giấy phép).
3. Nguồn âm thanh.
4. Ngôn ngữ UI (VI / EN / cả hai — nếu cả hai, thêm i18n từ Phase 3).
