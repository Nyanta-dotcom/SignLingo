# SignLingo AI

Real-time ASL learning web app (Duolingo-style) + final project for *Introduction to AI*.
Ứng dụng web học bảng chữ cái ngôn ngữ ký hiệu ASL (24 chữ tĩnh, A–Y trừ J và Z) bằng camera, chạy hoàn toàn trong trình duyệt.

- Tài liệu thiết kế: [`docs/`](docs/) · Kế hoạch và trạng thái task: [`docs/07_MASTER_PLAN.md`](docs/07_MASTER_PLAN.md)
- Kết quả thí nghiệm ML: [`ml/reports/RESULTS.md`](ml/reports/RESULTS.md)
- Làm việc nhóm: [`CONTRIBUTING.md`](CONTRIBUTING.md)

> Đang phát triển. Phần Kết quả, Giới hạn và liên kết triển khai sẽ được hoàn thiện ở Phase 4.

## Kiến trúc

Không có backend. Frontend là trang tĩnh (Vite + React + TypeScript) chạy MediaPipe và ONNX Runtime trong trình duyệt; tiến độ học lưu ở `localStorage`. Phần huấn luyện mô hình là pipeline Python chạy offline trong `ml/`, xuất mô hình ONNX và số liệu thí nghiệm vào `frontend/public/`. Không có ảnh hay video nào rời khỏi máy người dùng.

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
| `/practice` | Luyện tự do: ra dấu trước camera, giữ 1 giây để gõ chữ |
| `/lab` | AI Lab: so sánh mô hình, ma trận nhầm, rò rỉ dữ liệu, đo FPS |
| `/collect` | Thu mẫu landmark cho nhóm (xem `CONTRIBUTING.md`) |
| `/settings`, `/profile` | Cài đặt và hồ sơ |

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
e2e/        kiểm thử đầu cuối (Playwright)
```

## Giấy phép

[MIT](LICENSE). Các bộ dữ liệu (Sign Language MNIST, `keypoint.csv`) và thư viện bên thứ ba giữ giấy phép riêng của tác giả gốc.
