# Tuần 5 — Tích hợp cuối và báo cáo

**Ngày trình bày:** [nhóm điền] · **Bản chạy:** https://signlingo-vn.vercel.app · **Mã nguồn:** https://github.com/Nyanta-dotcom/SignLingo

## 1. Tám mục báo cáo tuần

| Mục | Nội dung |
|---|---|
| **What** | Web app hoàn chỉnh trên Vercel: lộ trình học (24 chữ tĩnh, J & Z, số 0–10), luyện tự do, bảng chữ cái, AI Lab, tài khoản và bảng xếp hạng tùy chọn; tài liệu 01–08; báo cáo kết quả `ml/reports/RESULTS.md` |
| **When** | Tuần này: demo + báo cáo cuối. Sau buổi chấm: thu dữ liệu nhiều người, huấn luyện lại |
| **Why** | Đưa mô hình thành sản phẩm học tập dùng được, có bằng chứng đo trong repo |
| **Who** | Hưng: mô hình, engine nhận diện, AI Lab, tài khoản. Triết: Lighthouse, tối ưu giao diện máy tính và điện thoại. Sanh: thu dữ liệu, kiểm thử trình duyệt và trợ năng. Thảo Anh: báo cáo, slide, video demo. Dũng: giao diện, trang giới thiệu, số 0–10 và J, Z, âm thanh |
| **How much** | Dự kiến: [nhóm điền]. Đã dùng: [nhóm điền]. Chênh lệch và cách xử lý: [nhóm điền] |
| **Rủi ro lớn nhất** | Độ chính xác trên webcam thật chưa đo trên người mới; chữ X và U nhận kém |
| **Thay đổi lớn** | Thêm tài khoản và đồng bộ tiến độ qua Supabase (backend có sẵn, không tự viết server); giao diện mới với linh vật; tối ưu Lighthouse |
| **Vấn đề chính** | MediaPipe trên CPU chiếm gần hết thời gian mỗi khung; trên laptop nhóm chỉ xử lý khoảng 22,6 khung/giây |

## 2. Demo toàn bộ pipeline: Dữ liệu → Mô hình → Kết quả

```text
DỮ LIỆU                     MÔ HÌNH (ml/, Python)                    KẾT QUẢ (trình duyệt)
keypoint.csv ──► lm-v1 ──► đặc trưng xy+dist+ang ──► 5× MLP ──► ONNX ──► frontend/public/models
                                                                             │
Webcam ──► MediaPipe (21 điểm) ──► lm-v1 ──► ONNX Runtime Web ──► 24 xác suất ─┘
                                                     │
                        làm mượt ──► giữ đúng ≥ 1 giây, xác suất ≥ 0,60 ──► "Đúng!", XP, chuỗi ngày
```

Kịch bản demo chi tiết: `docs/08_DEMO_SCRIPT.md` (trang chào → lộ trình → bài học với webcam → kết quả → luyện tự do → AI Lab).

## 3. Tổng kết hiệu năng mô hình

| Câu hỏi | Kết quả | Nguồn |
|---|---|---|
| **RQ1** | Tập hợp 5 CNN: test Macro-F1 **0,979**, hơn baseline tốt nhất (MLP + HOG, 0,911 ± 0,003) 0,069. Cùng MLP, HOG hơn pixel 0,134 | `ml/reports/summary.md` |
| **RQ2** | Landmark nhầm nhiều nhất U→R 71,2%, X→L 34,7%; F1 thấp nhất X 0,000, U 0,319. CNN: T 0,872 | `ml/reports/RESULTS.md` |
| **RQ3** | Đo 60 giây trong Chrome 157 trên laptop nhóm, MediaPipe chạy CPU: thời gian mỗi khung p50 **29,8 ms**, p95 **38,6 ms** (đạt chỉ tiêu p50 ≤ 33, p95 ≤ 40 ms); bộ phân loại 0,72 ms; nhưng chỉ xử lý **22,6 khung/giây** (< 30). MediaPipe trên GPU chậm hơn: 76,1 ms | Benchmark AI Lab, docs/02 |
| Mô hình trên web | Tập hợp 5 MLP landmark, test Macro-F1 0,778 (chia theo thứ tự tệp, không phải người mới), ONNX 5,68 MB | `landmark-mlp-ens5-1.0.0` |

Đã sửa cách xếp lịch khung (nhận khung kế tiếp trước khi xử lý) để không lỡ khung; **chưa đo lại** sau khi sửa.

## 4. Hạn chế và rủi ro

- **Chưa đo trên người mới:** `keypoint.csv` không có cột người ra dấu; 0,778 là cận trên lạc quan cho webcam thật.
- **Dữ liệu chữ X lệch dáng chuẩn:** chỉ 2,6% dòng X có đầu ngón trỏ cong móc (`ml/reports/x_pose_check.json`), trong khi ảnh bài học vẽ dáng cong móc → app gần như không nhận X chuẩn.
- **Số 0–10 và J, Z** dùng luật hình học, chưa có thí nghiệm đo độ chính xác.
- **Tốc độ:** chưa đạt 30 khung/giây trên laptop nhóm; mới có một lần đo trên một máy.
- **Điểm và XP** do trình duyệt báo lên, người cố ý có thể sửa; bảng xếp hạng chỉ mang tính vui.
- Ngưỡng chấm 0,60 và giữ 1 giây là giả thuyết khởi đầu, chưa được điều chỉnh bằng dữ liệu thật.

## 5. Hướng phát triển

1. Thu dữ liệu webcam từ ≥ 3 người (trang `/collect`), đo signer holdout, huấn luyện lại (ưu tiên X, U/R).
2. Chạy MediaPipe và ONNX trong Web Worker để đạt ≥ 30 khung/giây.
3. Mô hình học máy cho J, Z và chữ số thay cho luật hình học; mở rộng sang từ vựng.
4. Bật xác nhận email và SMTP trước khi có người dùng thật; chính thức hóa ADR đồng bộ.

## 6. Rà soát GitHub

| Hạng mục | Hiện trạng |
|---|---|
| **Code** | `ml/` (pipeline Python), `frontend/` (React + TypeScript), `shared/contracts/` (JSON Schema dùng chung), `e2e/` (Playwright), `supabase/` (SQL). `main` được bảo vệ, mọi thay đổi qua Pull Request và kiểm tra tự động |
| **Kiểm thử** | ML: 185 test qua (`pytest`), `ruff` sạch. Frontend: 449 test qua (Vitest), lint và typecheck sạch. E2E có 5 bộ: smoke, privacy, a11y, isolation, data (chưa chạy lại trong đợt này) |
| **Tài liệu** | `README.md` (cách chạy, kiến trúc, nhóm), `CONTRIBUTING.md`, `docs/01`–`08`, `ml/README.md` |
| **Báo cáo** | `ml/reports/RESULTS.md` (trả lời RQ1–RQ3), `summary.md`, `figures/`, báo cáo tuần `docs/weekly/` |
| **Tái lập** | `python -m signlingo_ml.pipeline all` chạy lại toàn bộ; seed 42; mỗi lần chạy ghi JSON có seed và git commit; dữ liệu thô không commit, `ml/README.md` ghi nguồn tải |
