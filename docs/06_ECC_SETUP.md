# 06 — ECC Setup (Rules + Skills + Constraints) cho AI Coding Agent

> **Trạng thái:** v0.2 · **Ngày:** 2026-11-18 · **v0.2:** bỏ backend → còn 2 khối `ml/` và `frontend/`.
> Các file cấu hình ở §2 **đã được tạo** trong Phase 0 (P0-02) và đồng bộ với v0.2.
> Áp dụng `quy_trinh_ai_agent.md` Step 3: phân bổ context, nạp skill có sẵn từ GitHub, đặt rule/constraint chặt.

---

## 1. Phân bổ Context theo loại việc

| Loại task | Tài liệu cấp cho Agent | Thư mục được sửa | Cấm sửa |
|---|---|---|---|
| **ML** (Phase 1) | 01_PRD §2, §5.1, §6.1 · 02_ARCH §4 · 03_DATA §4–5 · 04_CONTRACTS §2–4 | `ml/`, `shared/contracts/schemas`, `shared/contracts/fixtures`, và **chỉ** `frontend/public/{models,data}` qua publish script | `frontend/src` |
| **Frontend – Data & Game** (Phase 2) | 01_PRD §5.2–5.4, §6.3 · 02_ARCH §6 · **03_DATA** · **04_CONTRACTS** §6–7 | `frontend/src/{storage,game,content}`, `shared/contracts/schemas` (curriculum, backup, landmark_capture) | `ml/`, `frontend/src/vision` |
| **Frontend – UI & Vision** (Phase 3) | **Prototype (V0) + 05_UI** · 01_PRD · 02_ARCH §5 · 03_DATA §3 · **04_CONTRACTS** §3, §5–6 | `frontend/`, `e2e/` | `ml/` (chỉ đọc `shared/contracts`) |
| **Test/Perf/Deploy** (Phase 4) | 01_PRD §6 (AC) · 02_ARCH §5.4, §7, §9 · 07_PLAN | `e2e/`, `*/tests/`, `frontend/vercel.json`, CI | Không đổi hợp đồng khi chưa duyệt |

> Mọi thay đổi `shared/contracts/*` là task riêng, được duyệt, và phải cập nhật test ở **cả hai** khối.

## 2. Cấu trúc file cấu hình

```
SignLingo/
├── CLAUDE.md                       # Rules gốc (mọi phiên đều đọc)   ✅ đã tạo
├── ml/CLAUDE.md                    # Rules riêng ML                  ✅
├── frontend/CLAUDE.md              # Rules riêng Frontend            ✅
├── .cursorrules                    # (tuỳ chọn) bản rút gọn cho thành viên dùng Cursor
└── .claude/
    ├── settings.json               # permissions (+ hooks ở P0-12)   ✅ (chưa có hooks)
    ├── settings.local.json         # cá nhân (gitignore)
    ├── agents/  planner.md · ml-reviewer.md · test-writer.md         (P0-10)
    └── skills/  leakage-checklist/ · landmark-parity/ · task-protocol/ (P0-10)
```

### 2.1 `CLAUDE.md` gốc — điểm chính
- `docs/` là nguồn sự thật; kiến trúc **không có backend**; không dữ liệu nào rời trình duyệt.
- Workflow mỗi task: đọc task → PLAN (chờ duyệt nếu [R]) → test trước → code ≤ 100 dòng → chạy lint + test → cập nhật plan.
- Cấm: tự thêm dữ liệu nội dung; hardcode metrics; **thêm backend/server/DB/gọi API ngoài khi chưa có ADR**; sửa ngoài khối; đổi stack; sửa `docs/course`, `docs/reports`, `ml/data/raw`.
- Lệnh: `ml` (pytest + ruff), `frontend` (lint + test + typecheck), `e2e` (playwright).

### 2.2 `ml/CLAUDE.md` — điểm chính
- Chỉ `data/split.py` tạo split; script tuning cấm đọc test (`load_split("test", final=True)` chỉ trong `evaluate --final`).
- Mọi `fit()` chỉ nhận `X_train`. Không lật ngang ảnh MNIST; landmark mirror-to-right theo lm-v1.
- Mỗi thí nghiệm = 1 YAML + 1 JSON kết quả đúng `experiment.schema.json`.
- Đổi tiền xử lý landmark ⇒ tăng `preprocess_version`, sinh lại fixture.
- Chỉ ghi vào `frontend/public/{models,data}` qua `python -m signlingo_ml.export.publish`.

### 2.3 `frontend/CLAUDE.md` — điểm chính
- Chỉ dùng design tokens từ docs/05; cấm hex rời trong component.
- `src/vision/*`, `src/game/*` là TypeScript thuần, không import React.
- Không backend: chỉ fetch file tĩnh cùng origin (`/models`, `/data`, `/mediapipe`, `/media`).
- Mọi đọc/ghi storage qua `src/storage/` (try/catch, `schema_version`).
- Vòng lặp khung hình không đi qua React state; UI nhận event throttle ≤ 30 Hz.
- Mỗi component có test cho các state ở docs/05 §3; a11y kiểm bằng axe trong E2E.

## 3. Skills cần nạp

### 3.1 Skill có sẵn (tìm & cài từ GitHub / marketplace — **không tự viết**)

> Danh sách là ứng viên; trước khi cài, kiểm tra lại repo còn tồn tại, giấy phép, và đọc nội dung SKILL.md (skill là mã/prompt bên thứ ba).

| Nhóm | Skill / Nguồn | Dùng cho |
|---|---|---|
| Quy trình | `web-project-workflow` (đã có trong môi trường này) | Design → Docs → Plan → Code → Test |
| Quy trình | `obra/superpowers`: *writing-plans, executing-plans, test-driven-development, systematic-debugging, verification-before-completion* | Kỷ luật Plan → Code → Test |
| ECC tổng hợp | `affaan-m/everything-claude-code` (agents planner/architect/tdd-guide/code-reviewer/e2e-runner) | **Chỉ chọn lọc phần cần**, không cài toàn bộ |
| Frontend UI/UX | `frontend-design` (plugin Anthropic, đã có) | Thẩm mỹ, tránh UI "template" |
| Testing Web | `anthropics/skills` → *webapp-testing* (Playwright) | E2E, screenshot |
| Accessibility | `design:accessibility-review` (đã có) | Audit WCAG AA |
| Review | `code-review`, `security-review` (built-in) | Review cuối mỗi phase |
| Python ML/CV | Tìm: `claude skill pytorch`, `claude skill scikit-learn`, `claude skill mlops reproducibility`, `claude skill mediapipe` → chọn 1–2 skill nhiều sao | Training loop, ONNX export |
| Deploy | Tìm: `claude skill vercel` (tùy chọn) | Cấu hình `vercel.json`, headers |

### 3.2 Skill nội bộ (rất nhỏ, đặc thù dự án)

| Skill | Nội dung |
|---|---|
| `leakage-checklist` | 6 câu Agent phải tự trả lời trước khi xong task ML: split ở đâu? fit trên gì? test có bị đọc không? seed? augment có hflip không? group overlap = 0? |
| `landmark-parity` | Cách sinh fixture `lm-v1`, chạy test 2 phía, quy tắc tăng version |
| `task-protocol` | Mẫu output mỗi task: Plan · Diff summary · Test output · AC checked · Next |

## 4. Hooks đề xuất (`.claude/settings.json`, task P0-12)

| Hook | Khi | Hành động |
|---|---|---|
| PostToolUse (Edit/Write trong `ml/`) | Sau khi sửa `.py` | `ruff format <file>` |
| PostToolUse (Edit/Write trong `frontend/`, `e2e/`) | Sau khi sửa `.ts/.tsx` | `prettier --write <file>` |
| PreToolUse (Edit/Write) | Trước khi sửa | Chặn ghi vào `ml/data/raw/`, `docs/course/`, `docs/reports/` |
| Stop | Cuối lượt | Nhắc chạy test của khối đã sửa nếu có file thay đổi |

Permissions: cho phép `python -m pytest`, `ruff`, `pnpm test|lint|typecheck`, `git status|diff`; hỏi trước `git push`, `rm`, cài thư viện ngoài lock.

## 5. Ràng buộc kiến trúc (Constraints)

| # | Ràng buộc | Cách kiểm tự động | Trạng thái |
|---|---|---|---|
| C1 | `frontend/` không import mã nguồn `ml/` | ESLint `no-restricted-imports` | ✅ đã có |
| C2 | Không có request ra ngoài origin lúc chạy (không CDN, analytics, API ngoài) | E2E bắt network log + CSP `default-src 'self'` trong `vercel.json` | P4 |
| C3 | `src/vision/*`, `src/game/*` không import React | ESLint override | ✅ (vision) · thêm `game` ở P2 |
| C4 | Component không gọi `localStorage`/`indexedDB` trực tiếp (chỉ `src/storage/`) | ESLint `no-restricted-globals` (trừ `src/storage/**`) | P2 |
| C5 | Không màu hex ngoài `tokens.css` | ESLint/Stylelint regex rule | P3 |
| C6 | Không payload ảnh/video/landmark trong request | E2E (AC-PRIV-01) | P4 |
| C7 | Mỗi task ≤ 100 dòng code nguồn thay đổi (cảnh báo) | Script CI `git diff --numstat` | P0-12 |
| C8 | File JSON trong `public/models`, `public/data`, `src/content` đúng schema | Test Vitest validate bằng `ajv` | P2 |
| C9 | Fixture lm-v1 khớp Python ↔ TS | Test 2 phía trong CI | P1/P3 |

## 6. Chế độ chạy Agent khuyến nghị

| Việc | Model | Ghi chú |
|---|---|---|
| Planning / review plan / kiến trúc | Opus | Task có nhãn [R] |
| Code task nguyên tử | Sonnet | 1 task / lượt, context đúng nhóm tài liệu |
| Viết test, refactor nhỏ | Sonnet / Haiku | |
| Review cuối phase | Opus + `code-review` | |
