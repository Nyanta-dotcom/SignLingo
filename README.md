# SignLingo AI

Real-time ASL learning web app (Duolingo-style) + final project for *Introduction to AI*.
Ứng dụng web học ngôn ngữ ký hiệu ASL bằng camera: 24 chữ cái tĩnh (mô hình học máy), 2 chữ động J, Z và số 0–10 (luật hình học). Nhận dạng chạy hoàn toàn trong trình duyệt.

- Bản chạy: https://signlingo-vn.vercel.app

- Tài liệu thiết kế: [`docs/`](docs/) · Kế hoạch và trạng thái task: [`docs/07_MASTER_PLAN.md`](docs/07_MASTER_PLAN.md)
- Kết quả thí nghiệm ML: [`ml/reports/RESULTS.md`](ml/reports/RESULTS.md)
- Làm việc nhóm: [`CONTRIBUTING.md`](CONTRIBUTING.md)

## Kết quả chính

- Tập hợp 5 CNN trên Sign Language MNIST: test Macro-F1 **0,979**, so với baseline tốt nhất (MLP + HOG) 0,911.
- Mô hình chạy trên web (tập hợp 5 MLP landmark): test Macro-F1 0,778. Đây không phải số đo trên người mới.
- Trong trình duyệt (Chrome, laptop của nhóm): thời gian mỗi khung p50 29,8 ms, p95 38,6 ms, nhưng chỉ 22,6 khung/giây.
- Chữ nhận kém nhất: X (do dữ liệu huấn luyện dạy dáng khác ảnh bài học) và U (hay bị nhầm thành R).

Chi tiết: [`ml/reports/RESULTS.md`](ml/reports/RESULTS.md) · báo cáo cuối kỳ (IEEE): [`docs/final-report/`](docs/final-report/) · báo cáo từng tuần: [`docs/weekly/`](docs/weekly/)

## Giới hạn

- Chưa đo độ chính xác trên người mới: dữ liệu không có cột người ra dấu, chưa thu webcam nhiều người.
- Dữ liệu chữ X lệch dáng chuẩn; U thường bị nhận thành R.
- Số 0–10 và J, Z dùng luật hình học, chưa có thí nghiệm đo.
- Chưa đạt 30 khung/giây trên laptop của nhóm; mới đo một lần trên một máy.
- Ngưỡng 0,60 và giữ 1 giây là giả thuyết khởi đầu.

## Kiến trúc

**Backend dùng Supabase** (dịch vụ có sẵn, nhóm không tự viết hay vận hành server). Frontend là trang tĩnh (Vite + React + TypeScript) chạy MediaPipe và ONNX Runtime trong trình duyệt; tiến độ học lưu ở `localStorage` và, khi người học đăng nhập, được đồng bộ lên Supabase. Phần huấn luyện mô hình là pipeline Python chạy offline trong `ml/`, xuất mô hình ONNX và số liệu thí nghiệm vào `frontend/public/`. Không có ảnh, video hay dữ liệu bàn tay nào rời khỏi máy người dùng.

**Backend Supabase (tùy chọn):** đăng ký và đăng nhập (email + mật khẩu) để đồng bộ tiến độ giữa các máy và tham gia bảng xếp hạng, gồm Auth + Postgres với Row Level Security. Chỉ tiến độ học được lưu. Không cấu hình Supabase thì app vẫn chạy đầy đủ. Thiết lập: [`supabase/README.md`](supabase/README.md); thiết kế: [`docs/drafts/ADR_backend_sync_DRAFT.md`](docs/drafts/ADR_backend_sync_DRAFT.md).

## Chạy thử nhanh (frontend)

Cần Node.js 22 (xem `.nvmrc`) và pnpm 12 (phiên bản dự án dùng được ghi ở trường `packageManager` trong `frontend/package.json`; cài bằng `npm install -g pnpm@12` nếu chưa có).

```powershell
cd frontend
pnpm install
pnpm dev
```

Mở địa chỉ `Local:` mà terminal in ra (thường là `http://localhost:5173`), dùng Chrome. Lần đầu chạy, `pnpm dev` tự chép các file MediaPipe và ONNX Runtime vào `public/` và có thể tải mô hình bàn tay (khoảng 8 MB) từ Google; những file này không được commit.

| Địa chỉ | Việc |
|---|---|
| `/`, `/welcome`, `/features`, `/how-it-works`, `/about` | Trang chào (nút Vào học / Tiếp tục học), tính năng, cách hoạt động, nhóm & liên hệ |
| `/learn` | Lộ trình học kiểu bản đồ kẹo: bảng chữ cái, J & Z, số 0–10 |
| `/practice` | Luyện tự do: ra dấu trước camera, giữ 1 giây để gõ chữ |
| `/alphabet` | Bảng chữ cái: hình mẫu từng chữ |
| `/leaderboard` | Bảng xếp hạng (cần đăng nhập) |
| `/lab` | AI Lab: so sánh mô hình, ma trận nhầm, rò rỉ dữ liệu, đo FPS |
| `/login`, `/register`, `/profile`, `/settings` | Đăng nhập, đăng ký, hồ sơ và tài khoản, cài đặt |
| `/collect` | Thu mẫu landmark cho nhóm (xem `CONTRIBUTING.md`) |

Muốn thử đăng nhập khi chạy cục bộ: chép `frontend/.env.example` thành `frontend/.env.local` và điền `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (khóa công khai; không bao giờ dùng khóa `service_role`).

Camera chỉ hoạt động trên `localhost` hoặc HTTPS.

Kiểm tra mã: `pnpm lint`, `pnpm typecheck`, `pnpm test --run`.

## Chạy lại phần ML

Cần Python 3.11 và bộ dữ liệu đặt đúng chỗ (dữ liệu không được commit). Hướng dẫn cài đặt, nguồn dữ liệu và các bước pipeline nằm trong [`ml/README.md`](ml/README.md).

## Cấu trúc

```text
docs/       thiết kế và kế hoạch
frontend/   ứng dụng web
ml/         pipeline học máy (Python)
shared/     hợp đồng dữ liệu giữa ml/ và frontend/
supabase/   SQL cho tài khoản và bảng xếp hạng (tùy chọn)
e2e/        kiểm thử đầu cuối (Playwright)
```

## Nhóm thực hiện

Đồ án cuối kỳ môn Nhập môn Trí tuệ nhân tạo (Introduction to AI), VNUK. Phân công giống trang Giới thiệu & Liên hệ của app; task theo người ở [`docs/07_MASTER_PLAN.md`](docs/07_MASTER_PLAN.md) §9.

| Thành viên | MSSV | Phụ trách |
|---|---|---|
| Nguyễn Tuấn Hưng (trưởng nhóm) | 24090019 | Huấn luyện mô hình nhận diện, nhận diện trong trình duyệt, lộ trình bài học và AI Lab, tài khoản và bảng xếp hạng |
| Nguyễn Hữu Triết | 24090003 | Tối ưu điểm Lighthouse, tối ưu giao diện trên máy tính, tối ưu giao diện trên điện thoại, giảm thời gian tải trang và dung lượng ảnh |
| Trần Công Sanh | 24090009 | Thu thập dữ liệu webcam từ nhiều người, kiểm tra chất lượng dữ liệu, kiểm thử trên nhiều trình duyệt và thiết bị, kiểm tra trợ năng |
| Lê Nguyễn Thảo Anh | 24090028 | Viết báo cáo cuối kỳ, làm slide thuyết trình, kịch bản và video demo, khảo sát ý kiến người dùng, soạn danh sách từ cho bài đánh vần |
| Nguyễn Anh Dũng | 24090021 | Thiết kế lại giao diện, các trang giới thiệu, nhận diện số 0–10 và ký hiệu động J, Z, âm thanh bài học |

Liên hệ: hung.nguyen240919@vnuk.udn.vn (trưởng nhóm).

## Giấy phép

[MIT](LICENSE). Các bộ dữ liệu (Sign Language MNIST, `keypoint.csv`) và thư viện bên thứ ba giữ giấy phép riêng của tác giả gốc.
