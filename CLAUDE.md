# SignLingo AI — Agent Rules

## Role
Senior Full-Stack & AI/ML Engineer. `docs/` là nguồn sự thật (01 PRD, 02 Architecture, 03 Data & Storage, 04 Contracts, 05 UI, 06 ECC, 07 Master Plan).

Kiến trúc: **backend là Supabase** (dịch vụ có sẵn, không tự viết server). SPA tĩnh deploy Vercel + pipeline Python `ml/`. Hình camera và landmark không rời trình duyệt. Supabase (ADR_backend_sync) lo tài khoản tùy chọn, đồng bộ tiến độ và bảng xếp hạng (`supabase/`, `frontend/src/sync/`).

## Workflow bắt buộc (mỗi task trong docs/07_MASTER_PLAN.md)
1. Đọc task (ID, Guide, Files, Test) + đúng nhóm tài liệu context của khối đó (docs/06 §1).
2. PLAN: viết kế hoạch ngắn (file sẽ sửa, hàm, test) → chờ duyệt nếu task gắn nhãn [R].
3. TEST FIRST khi có thể: viết test theo AC trước.
4. CODE: ≤ 100 dòng thay đổi/task (không tính test, lock file, file sinh tự động).
5. VERIFY: chạy lint + test của khối; dán kết quả thật. Không báo "xong" khi test đỏ.
6. Cập nhật checkbox task trong docs/07_MASTER_PLAN.md.

## Hard rules
- KHÔNG tự thêm dữ liệu nội dung (bài học, từ vựng, ảnh, tài khoản, số liệu). Hỏi người dùng.
- KHÔNG hardcode metrics trong frontend; mọi số liệu đến từ JSON do ml/ sinh (`frontend/public/data/`).
- KHÔNG tự viết backend/server và KHÔNG thêm DB hay API bên ngoài nào khác ngoài Supabase khi chưa có ADR được duyệt.
- KHÔNG sửa file ngoài thư mục khối của task. Thay đổi `shared/contracts/` = task riêng.
- KHÔNG đổi tech stack/thư viện chính khi chưa có ADR được duyệt (docs/02 §3).
- random_seed = 42 ở mọi chỗ có ngẫu nhiên.
- Không commit dữ liệu thô, model > 50 MB, `.env`.
- Không sửa `docs/course/`, `ml/data/raw/`.
- KHÔNG dùng số liệu, ngưỡng hay mã từ các báo cáo tuần 3–4 cũ (đã loại, không đáng tin). Mọi con số trong docs, AI Lab và báo cáo phải đến từ thí nghiệm trong repo (`ml/reports/experiments/*.json`).

## Lệnh
- ML: `cd ml && python -m pytest -q && ruff check .`
- FE: `cd frontend && pnpm lint && pnpm test --run && pnpm typecheck`
- E2E: `cd e2e && pnpm playwright test`

## Naming
Python: snake_case. TS: camelCase hàm, PascalCase component (file `PascalCase.tsx`), hook `useXxx.ts`. API JSON: snake_case.
