# Tuần 2 — Định nghĩa bài toán, hiểu dữ liệu và xem xét giải pháp baseline

**Ngày trình bày:** [nhóm điền]

## 1. Tám mục báo cáo tuần

| Mục | Nội dung |
|---|---|
| **What** | Phát biểu bài toán đã chỉnh, 3 câu hỏi nghiên cứu, khám phá 2 bộ dữ liệu, báo cáo chất lượng dữ liệu (`ml/reports/data_quality.json`), WBS cập nhật |
| **When** | Tuần này: dữ liệu. Tuần 3: pipeline tiền xử lý + baseline |
| **Why** | Hiểu dữ liệu trước khi chọn mô hình: phát hiện sớm thiếu, trùng, mất cân bằng lớp và nguy cơ rò rỉ |
| **Who** | Hưng: bài toán, câu hỏi nghiên cứu, pipeline dữ liệu. Sanh: kiểm tra chất lượng dữ liệu, chuẩn bị thu mẫu webcam. Thảo Anh: viết báo cáo và slide. Triết, Dũng: dựng khung giao diện web |
| **How much** | Dự kiến: [nhóm điền]. Đã dùng: [nhóm điền]. Chênh lệch và cách xử lý: [nhóm điền] |
| **Rủi ro lớn nhất** | Ảnh MNIST là bản tăng cường của ít ảnh gốc → chia ngẫu nhiên sẽ rò rỉ; `keypoint.csv` không có cột người ra dấu → không đo được trên người mới |
| **Thay đổi lớn** | Dùng hai bộ dữ liệu cho hai mục đích: ảnh để so sánh phương pháp, landmark để chạy trên web |
| **Vấn đề chính** | J và Z là chữ có chuyển động, không có trong dữ liệu ảnh tĩnh → để sau, phạm vi chính là 24 chữ tĩnh |

## 2. Phát biểu bài toán (đã chỉnh)

> Xây dựng hệ thống nhận diện bảng chữ cái ASL tĩnh (24 lớp A–Y, trừ J, Z) theo thời gian thực từ webcam, chạy hoàn toàn trên trình duyệt (> 30 khung/giây), đạt Macro-F1 cao trên dữ liệu chưa thấy, và đóng gói thành gia sư AI có phản hồi tức thì kiểu trò chơi.

## 3. Ba câu hỏi nghiên cứu

| | Câu hỏi | Cách trả lời |
|---|---|---|
| **RQ1** | Deep learning (CNN có tăng cường dữ liệu) cải thiện bao nhiêu so với các baseline cổ điển, và đặc trưng (pixel, HOG, landmark) ảnh hưởng thế nào? | Cùng cách chia dữ liệu, nhiều seed, so Macro-F1 trên test |
| **RQ2** | Chữ nào bị nhầm nhiều nhất và vì sao? (giả thuyết: các chữ nắm tay và chữ 2–3 ngón dễ nhầm, cần kiểm bằng ma trận nhầm thật) | Ma trận nhầm, F1 từng chữ |
| **RQ3** | Có đạt suy luận thời gian thực > 30 khung/giây trên trình duyệt với độ chính xác chấp nhận được không? | Xuất ONNX, đo thời gian mỗi khung trong trình duyệt |

## 4. Khám phá dữ liệu

| | Sign Language MNIST | `keypoint.csv` |
|---|---|---|
| **Nguồn** | Kaggle | Repo `AkramOM606/American-Sign-Language-Detection` (giấy phép MIT) |
| **Mô tả** | Ảnh xám 28×28; nhãn 24 chữ (không có J, Z); train 27.455 dòng, test 7.172 dòng | Mỗi dòng: nhãn + 42 số (x, y của 21 điểm bàn tay, đã chuẩn hóa); 36.402 dòng, còn 33.536 mẫu 24 chữ tĩnh sau khi bỏ chữ động |
| **Liên quan** | Chuẩn so sánh phương pháp (baseline vs CNN) | Giống đúng đầu vào app có trong trình duyệt (MediaPipe trả 21 điểm) → dùng cho mô hình chạy trên web |

## 5. Chất lượng dữ liệu

Tính bằng `signlingo_ml.data.quality.quality_report` và `landmarks.dataset.load_keypoint_csv`; kết quả lưu ở `ml/reports/data_quality.json`.

| | MNIST train | MNIST test | `keypoint.csv` |
|---|---|---|---|
| Số dòng | 27.455 | 7.172 | 36.402 dòng tệp → 33.536 mẫu |
| Dòng thiếu giá trị | 0 | 0 | 0 |
| Dòng trùng hoàn toàn | 0 | 0 | 0 |
| Nhãn không hợp lệ / dòng hỏng | 0 | 0 | 1 dòng hỏng; 2.865 dòng chữ động bị bỏ |
| Giá trị điểm ảnh | 0–255 | 0–255 | — |
| Tỉ lệ lớp nhiều nhất / ít nhất | 1,35 | 3,46 | 8,67 (A: 4.136, O: 477) |

**Nguy cơ thiên lệch:**
- **Gần trùng:** không có dòng trùng hoàn toàn, nhưng tập train MNIST là nhiều bản tăng cường của ít ảnh gốc → chia ngẫu nhiên đặt ảnh gần giống nhau ở cả train và validation (rò rỉ). Sẽ đo ở tuần 3.
- **Mất cân bằng lớp:** `keypoint.csv` lệch mạnh (8,67 lần) → dùng Macro-F1 thay cho độ chính xác.
- **Ít người ra dấu, không rõ số người:** cả hai bộ không có cột người ra dấu → mô hình có thể học thói quen tay của một vài người; kết quả trên webcam thật có thể thấp hơn.
- **Điều kiện chụp:** nền, ánh sáng, góc trong dữ liệu khác webcam thật của người học.

## 6. Xem xét giải pháp baseline

Baseline sẽ chạy ở tuần 3, trên cùng cách chia dữ liệu: lớp đa số (mức sàn), Logistic Regression (pixel), Random Forest (pixel), MLP (pixel và HOG), Linear SVM (HOG). Mục đích: có mức so sánh trung thực trước khi dùng deep learning.

## 7. WBS cập nhật và kế hoạch tuần 3

- ☑ Bài toán, RQ, khám phá dữ liệu, chất lượng dữ liệu.
- Tuần 3:
  - Làm sạch (bỏ nhãn J, Z, dòng thiếu, dòng trùng).
  - Chia theo nhóm ảnh gốc để chống rò rỉ; đo rò rỉ bằng thí nghiệm so sánh với chia ngẫu nhiên.
  - Đặc trưng pixel và HOG; đặc trưng landmark (tọa độ, khoảng cách, góc).
  - Chạy toàn bộ baseline với 3 seed, ghi JSON thí nghiệm.
