# Tuần 1 — Khởi động dự án SignLingo

**Đề tài:** Real-time Sign Language Alphabet Recognition Web App — ứng dụng web nhận diện bảng chữ cái ngôn ngữ ký hiệu Mỹ (ASL) theo thời gian thực qua webcam, theo kiểu "Duolingo cho ngôn ngữ ký hiệu".
**Ngày trình bày:** [nhóm điền]

## 1. Tám mục báo cáo tuần

| Mục | Nội dung |
|---|---|
| **What** | Bộ tài liệu thiết kế `docs/01`–`07` (PRD, kiến trúc, dữ liệu, hợp đồng, giao diện, quy trình, kế hoạch); khung repo GitHub; WBS toàn dự án |
| **When** | Tuần 1: tài liệu + khung repo. Tuần 2: dữ liệu. Tuần 3: tiền xử lý + baseline. Tuần 4: mô hình + đánh giá. Tuần 5: tích hợp web + báo cáo cuối |
| **Why** | Viết tài liệu trước để cả nhóm thống nhất phạm vi và tiêu chí chấp nhận (AC) trước khi code; mỗi task có test đi kèm |
| **Who** | Xem §3 bên dưới |
| **How much** | Dự kiến: [nhóm điền] giờ/người/tuần. Đã dùng tuần này: [nhóm điền]. Chênh lệch và cách xử lý: [nhóm điền] |
| **Rủi ro lớn nhất** | Dữ liệu huấn luyện không giống webcam thật; nhận diện chậm trên laptop yếu; ít người ra dấu để kiểm tra |
| **Thay đổi lớn** | Chốt kiến trúc: nhận diện chạy hoàn toàn trong trình duyệt, không gửi hình camera đi |
| **Vấn đề chính** | Chưa có dữ liệu webcam của nhóm; cần chọn bộ dữ liệu công khai phù hợp |

## 2. Tổng quan dự án

- **Bài toán:** người tự học ngôn ngữ ký hiệu qua sách hay video không biết mình đặt ngón tay đúng hay sai, vì không có ai sửa.
- **Giải pháp:** web app làm "gia sư AI": người học xem bài, ra dấu trước webcam, AI chấm ngay. MediaPipe lấy 21 điểm khớp bàn tay; mô hình học máy (xuất ONNX) phân loại chữ cái; mọi thứ chạy trong trình duyệt.
- **Vì sao chọn lĩnh vực và dữ liệu này:**
  - Ngôn ngữ ký hiệu là nhu cầu thật của cộng đồng người khiếm thính và người muốn giao tiếp với họ.
  - Có bộ dữ liệu công khai, gắn nhãn sẵn: Sign Language MNIST (ảnh 28×28, 24 lớp, Kaggle) để so sánh phương pháp, và `keypoint.csv` (21 điểm landmark, giấy phép MIT) cho mô hình chạy trên web.
  - Bài toán vừa sức một học kỳ nhưng đủ để đi hết quy trình AI: dữ liệu → mô hình → đánh giá → sản phẩm.

## 3. Phân công (Who)

| Thành viên | MSSV | Phụ trách |
|---|---|---|
| Nguyễn Tuấn Hưng (trưởng nhóm) | 24090019 | Huấn luyện mô hình nhận diện, nhận diện trong trình duyệt, lộ trình bài học và AI Lab, tài khoản và bảng xếp hạng |
| Nguyễn Hữu Triết | 24090003 | Tối ưu điểm Lighthouse, tối ưu giao diện trên máy tính và điện thoại, giảm thời gian tải trang và dung lượng ảnh |
| Trần Công Sanh | 24090009 | Thu thập dữ liệu webcam từ nhiều người, kiểm tra chất lượng dữ liệu, kiểm thử trên nhiều trình duyệt và thiết bị, kiểm tra trợ năng |
| Nguyễn Thảo Anh | 24090028 | Báo cáo cuối kỳ, slide, kịch bản và video demo, khảo sát người dùng, danh sách từ cho bài đánh vần |
| Nguyễn Anh Dũng | 24090021 | Thiết kế lại giao diện, các trang giới thiệu, nhận diện số 0–10 và J, Z, âm thanh bài học |

## 4. SWOT nhóm

| | Tích cực | Tiêu cực |
|---|---|---|
| **Bên trong** | **Điểm mạnh:** có bộ dữ liệu công khai gắn nhãn sẵn; kiến trúc chạy trong trình duyệt (không cần server, bảo vệ quyền riêng tư); quy trình tài liệu trước + test trước; repo GitHub và CI ngay từ đầu | **Điểm yếu:** nhóm mới làm học máy lần đầu; ít người ra dấu thật để thu dữ liệu; thời gian học kỳ ngắn; khối lượng việc lệch giữa các thành viên nếu không chia rõ |
| **Bên ngoài** | **Cơ hội:** MediaPipe và ONNX Runtime Web cho phép chạy AI ngay trên trình duyệt; Vercel deploy miễn phí; ứng dụng có ích cho cộng đồng | **Thách thức:** dữ liệu công khai khác webcam thật (ánh sáng, góc, người); máy yếu có thể không đạt 30 khung/giây; các chữ có dáng tay gần nhau dễ nhầm |

## 5. Kế hoạch liên lạc

| Việc | Kênh | Tần suất |
|---|---|---|
| Trao đổi hằng ngày | [nhóm điền: Zalo/Messenger/Discord] | Hằng ngày |
| Họp nhóm | [nhóm điền] | [nhóm điền], trước buổi trình bày mỗi tuần |
| Giao và theo dõi việc | `docs/07_MASTER_PLAN.md` (mỗi task có ID, file, test, checkbox) | Cập nhật khi xong task |
| Code và review | GitHub: mỗi việc một nhánh, gộp qua Pull Request; `main` được bảo vệ, phải qua kiểm tra tự động (`ml`, `frontend`) | Mỗi task |
| Báo vấn đề gấp | Nhắn trưởng nhóm (hung.nguyen240919@vnuk.udn.vn) | Khi cần |

## 6. WBS toàn dự án

```text
SignLingo
├── 0. Khởi tạo: tài liệu 01–07, khung repo, CI, quy ước (Phase 0)
├── 1. Dữ liệu & ML (Phase 1)
│   ├── 1.1 Thu thập: Sign Language MNIST, keypoint.csv, công cụ thu mẫu webcam
│   ├── 1.2 Chất lượng & làm sạch: thiếu, trùng, nhãn sai, cân bằng lớp
│   ├── 1.3 Chia dữ liệu chống rò rỉ (theo nhóm), chặn đọc test
│   ├── 1.4 Baseline: đa số lớp, Logistic Regression, Random Forest, SVM, MLP (pixel, HOG)
│   ├── 1.5 Deep learning: CNN (quét cấu hình, tập hợp), MLP landmark
│   └── 1.6 Đánh giá, phân tích lỗi, xuất ONNX + manifest
├── 2. Dữ liệu người học & game (Phase 2): tiến độ, XP, chuỗi ngày, tim
├── 3. Giao diện & nhận diện trong trình duyệt (Phase 3): MediaPipe, engine, bài học, luyện tự do, AI Lab
├── 4. Kiểm thử, đo FPS, deploy Vercel (Phase 4)
└── 5. Mở rộng (Phase 5): tài khoản, bảng xếp hạng, số 0–10, J/Z, giao diện mới, Lighthouse
```

## 7. Cấu trúc repo GitHub

Repo: https://github.com/Nyanta-dotcom/SignLingo

```text
SignLingo/
├── docs/            tài liệu thiết kế 01–08, báo cáo tuần (weekly/)
├── ml/              pipeline Python: data, features, landmarks, models, train, evaluate, export
│   └── reports/     experiments/*.json, summary.md, RESULTS.md, figures/
├── frontend/        web app React + TypeScript (Vite), chạy MediaPipe và ONNX trong trình duyệt
├── shared/contracts/ JSON Schema dùng chung giữa ml và frontend
├── e2e/             kiểm thử đầu-cuối Playwright
├── supabase/        SQL cho tài khoản tùy chọn
├── README.md        hướng dẫn chạy
└── CONTRIBUTING.md  quy trình làm việc nhóm
```
