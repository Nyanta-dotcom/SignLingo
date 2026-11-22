# Đóng góp cho SignLingo AI

Tài liệu cho các thành viên nhóm. Nguồn sự thật về sản phẩm và kỹ thuật nằm trong [`docs/`](docs/); kế hoạch và trạng thái từng task ở [`docs/07_MASTER_PLAN.md`](docs/07_MASTER_PLAN.md).

## Ai phụ trách phần nào

Xem bảng phân công trong [`docs/07_MASTER_PLAN.md`](docs/07_MASTER_PLAN.md) §9 (giống trang Giới thiệu & Liên hệ). Khi đổi phân công, sửa `frontend/src/features/onboarding/AboutPage.tsx`, PRD §10, docs/07 §9 và README cùng lúc.

## Quy trình làm việc

Nhánh `main` được bảo vệ: **không push thẳng vào `main`**. Mọi thay đổi đi qua Pull Request.

1. Lấy bản mới nhất: `git switch main` rồi `git pull`.
2. Tạo nhánh từ `main`, đặt tên theo loại việc: `feat/ten-ngan`, `fix/ten-ngan`, `docs/ten-ngan`, `chore/ten-ngan`.
3. Làm một task nhỏ cho mỗi PR (xem ID task trong `docs/07_MASTER_PLAN.md`). Mỗi task thay đổi khoảng 100 dòng trở xuống, không tính test, file khóa và file sinh tự động; CI sẽ cảnh báo khi vượt.
4. Viết test trước khi viết mã khi có thể.
5. Chạy kiểm tra ở máy trước khi push (bên dưới).
6. Push nhánh, mở Pull Request vào `main`, điền mẫu PR.
7. Hai job CI `ml` và `frontend` phải xanh thì mới merge được. Cần ít nhất một người khác trong nhóm xem qua khi nhóm bật yêu cầu duyệt.

Commit viết theo dạng `loại(phạm vi): mô tả ngắn`, ví dụ `feat(frontend): trang Cài đặt (P3-23)` hoặc `fix(ml): sửa chia dữ liệu`.

## Chạy kiểm tra

| Khối | Lệnh (chạy trong thư mục tương ứng) |
|---|---|
| Frontend | `pnpm lint`, `pnpm typecheck`, `pnpm test --run` |
| ML | `python -m pytest -q`, `ruff check .` |
| E2E | `pnpm exec playwright test` (trong `e2e/`; đặt `PW_CHANNEL=chrome` để dùng Chrome cài sẵn, và `E2E_PORT=5199` nếu cổng 5173 đang có server khác) |

Không báo "xong" khi test còn đỏ.

## Quy tắc bắt buộc

- **Số liệu:** mọi con số trong tài liệu, AI Lab và báo cáo phải đến từ thí nghiệm chạy trong repo này (`ml/reports/experiments/*.json`) hoặc từ phép đo ghi rõ nguồn. Không dùng số liệu, ngưỡng hay mã từ các báo cáo tuần 3–4 cũ (đã loại, không đáng tin). Không hardcode số liệu trong frontend.
- **Nội dung học:** không tự thêm bài học, từ vựng, ảnh, tài khoản hay số liệu. Hỏi người phụ trách nội dung.
- **Backend là Supabase, không tự viết server:** ứng dụng là trang tĩnh; không thêm máy chủ, cơ sở dữ liệu hay gọi API ngoài nào khác khi chưa có ADR được duyệt. Supabase lo tài khoản và đồng bộ tiến độ (`docs/drafts/ADR_backend_sync_DRAFT.md`), chỉ gọi từ `frontend/src/sync/supabase.ts`. Hình camera và landmark không bao giờ rời trình duyệt. Không bao giờ đưa khóa `service_role`/`sb_secret_…` vào repo, Vercel hay trình duyệt.
- **Không commit:** dữ liệu thô, ảnh hay video của người, mô hình lớn hơn 50 MB, file `.env`, khóa bí mật.
- **Không sửa:** `docs/course/`, `ml/data/raw/`. Thay đổi `shared/contracts/` là một task riêng.
- **Ngẫu nhiên:** dùng `random_seed = 42` ở mọi nơi có ngẫu nhiên.
- **Frontend:** chỉ dùng design token (không viết mã màu hex rời trong component); `src/vision/**` và `src/game/**` không import React; chỉ `src/storage/**` được đọc/ghi `localStorage` (thư viện Supabase tự lưu phiên đăng nhập); chữ giao diện nằm trong `src/i18n/vi.ts` (riêng nội dung các trang giới thiệu viết trong component).

## Thu dữ liệu webcam (task P1-21)

Mục tiêu là có dữ liệu từ ít nhất 3 người ra dấu để đo mô hình trên người mới.

1. Chạy frontend (`pnpm dev` trong `frontend/`) và mở `/collect`, hoặc dùng `ml/tools/capture.py`.
2. Dùng **mã ẩn danh** `S01`, `S02`, `S03`… cho mỗi người. Không ghi tên thật. Mỗi người một mã riêng, không dùng chung.
3. Ghi đủ 24 chữ (A–Y trừ J và Z), mỗi chữ 40 khung. Chỉ lưu tọa độ bàn tay, không lưu ảnh.
4. File tải về có dạng `landmarks_<mã>_<thời gian>.json`. Bỏ vào `ml/data/raw/webcam/` (thư mục này không được commit) và gửi cho người chạy đánh giá qua kênh riêng của nhóm.
5. Chỉ thu dữ liệu của người đã đồng ý.

## Cấu trúc repo

```text
docs/       tài liệu thiết kế và kế hoạch (docs/course/ là tài liệu môn học, không sửa)
frontend/   ứng dụng React + TypeScript (Vite, Tailwind, Vitest)
ml/         pipeline Python: dữ liệu, huấn luyện, xuất ONNX, báo cáo
supabase/   SQL cho tài khoản, đồng bộ và bảng xếp hạng (chạy tay trong Supabase)
shared/     hợp đồng dữ liệu giữa ml/ và frontend/ (JSON Schema, fixture)
e2e/        kiểm thử đầu cuối bằng Playwright
scripts/    công cụ cho CI
```
