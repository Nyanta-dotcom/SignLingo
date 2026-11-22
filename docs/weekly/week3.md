# Tuần 3 — Chuẩn bị dữ liệu và hướng tiếp cận mô hình

**Ngày trình bày:** [nhóm điền]

## 1. Tám mục báo cáo tuần

| Mục | Nội dung |
|---|---|
| **What** | Pipeline tiền xử lý (`ml/src/signlingo_ml/data`, `features`, `landmarks`), cách chia chống rò rỉ, thí nghiệm rò rỉ, 6 baseline có số đo thật (`ml/reports/experiments/baseline_*.json`, `leakage_*.json`) |
| **When** | Tuần này: tiền xử lý + baseline. Tuần 4: CNN, MLP landmark, đánh giá |
| **Why** | Cần mức so sánh trung thực trước khi dùng deep learning; chia sai sẽ làm số đo đẹp giả |
| **Who** | Hưng: pipeline, chia dữ liệu, baseline. Sanh: kiểm tra dữ liệu sau làm sạch. Thảo Anh: báo cáo, slide. Triết, Dũng: giao diện web |
| **How much** | Dự kiến: [nhóm điền]. Đã dùng: [nhóm điền]. Chênh lệch: Linear SVM chạy khoảng 39 phút nên chỉ chạy 1 seed |
| **Rủi ro lớn nhất** | Rò rỉ dữ liệu khi chia ngẫu nhiên (đã đo, xem §4); thời gian huấn luyện trên CPU |
| **Thay đổi lớn** | Bỏ toàn bộ số liệu của báo cáo tuần 3–4 cũ vì không do mã trong repo sinh ra; chạy lại từ đầu, mỗi lần chạy ghi JSON có seed và git commit |
| **Vấn đề chính** | Không có mã ảnh gốc để chia theo nhóm → phải ước lượng nhóm bằng phân cụm |

## 2. Pipeline tiền xử lý

```text
CSV thô ──► kiểm chất lượng ──► làm sạch ──► chia theo nhóm ──► biến đổi ──► đặc trưng ──► mô hình
            (thiếu, trùng,      (bỏ J, Z,     (Ward 70 cụm/     (pixel/255,   (pixel, HOG,
             nhãn, dải giá trị)  NaN, trùng)   chữ; test riêng)  chuẩn hóa     landmark)
                                                                  fit trên train)
```

- **Làm sạch** (`data/quality.py`): bỏ dòng thiếu, nhãn ngoài 24 lớp (J, Z), dòng trùng hoàn toàn.
- **Biến đổi:** điểm ảnh chia 255; bộ chuẩn hóa chỉ khớp trên train. Không lật ngang ảnh (lật biến ký hiệu tay phải thành tay trái, có thể đổi nghĩa).
- **Tăng cường cho CNN** (`features/augment.py`): xoay ±10°, dịch 2 px, phóng 0,9–1,1, độ sáng và tương phản ±15%, áp dụng với xác suất 0,7.
- **Landmark** (`landmarks/normalize.py`, chuẩn `lm-v1`): đưa cổ tay về gốc, chia cho max(|x|, |y|); Python và TypeScript cho cùng kết quả (kiểm bằng fixture chung).

## 3. Chiến lược chia dữ liệu

- **MNIST:** tập test riêng của Kaggle giữ nguyên, chỉ chấm một lần. Validation tách từ train **theo nhóm**: ảnh mỗi chữ được gom thành 70 cụm (Ward, trên ảnh thu nhỏ 10×10) để các bản tăng cường của cùng một ảnh gốc nằm chung một phía (`data/split.py`).
- **Chặn đọc test:** hàm `require_split_access` từ chối mọi đoạn mã đọc test nếu không khai `final=True`.
- **`keypoint.csv`:** không có cột người hay phiên → chia theo thứ tự tệp trong mỗi chữ: 60% train | đệm 2% | 20% val | đệm 2% | 20% test. Đây **không phải** kiểm tra trên người mới.
- **Seed:** 42 (thêm 43, 44 khi chạy nhiều seed).

## 4. Thí nghiệm rò rỉ dữ liệu (Logistic Regression, pixel, 3 seed)

| Cách chia | Val acc | Test acc | Khoảng cách val–test | Khoảng cách ảnh gần nhất val→train |
|---|---|---|---|---|
| Ngẫu nhiên | 1,000 | 0,687 ± 0,004 | 0,312 | 0,45 |
| Theo nhóm (Ward 70) | 0,745 ± 0,040 | 0,690 ± 0,014 | 0,055 | 2,45 |

Chia ngẫu nhiên cho validation hoàn hảo nhưng test chỉ 0,69: chênh 0,31 là do rò rỉ. Chia theo nhóm giảm chênh lệch xuống 0,055. Nhóm chỉ là ước lượng nên có thể còn rò rỉ nhỏ. Hình: `ml/reports/figures/leakage_study.png`.

## 5. Đặc trưng

| Đặc trưng | Kích thước | Dùng cho |
|---|---|---|
| Pixel | 784 | Baseline, CNN |
| HOG (9 hướng, ô 4×4, khối 2×2) | 1.296 | Baseline |
| Landmark `xy` | 42 | MLP landmark |
| `dist` | 210 khoảng cách cặp điểm / cỡ bàn tay | MLP landmark |
| `ang` | 31: 15 cosin góc khớp ngón + 8 cặp hướng ngón (cos, sin) | MLP landmark |

Đặc trưng khoảng cách và góc giúp tách các chữ khác nhau ở cách ngón bắt chéo hay gập (U/R, M/N), không phụ thuộc xoay và cỡ bàn tay.

## 6. Lý do chọn mô hình

- **Baseline cổ điển** (Logistic Regression, Random Forest, Linear SVM, MLP): mức so sánh nhanh, dễ hiểu; HOG là đặc trưng thiết kế tay mạnh cho ảnh nhỏ.
- **CNN:** học trực tiếp đặc trưng không gian từ ảnh; phù hợp ảnh 28×28; tăng cường dữ liệu giúp chống khớp quá mức.
- **MLP trên landmark:** đầu vào chỉ 42 số (hoặc vài trăm đặc trưng) → mô hình nhỏ, chạy dưới 2 ms trong trình duyệt; MediaPipe đã làm phần khó là tìm bàn tay. Không dùng LSTM vì 24 chữ tĩnh không có chuỗi thời gian (J, Z để giai đoạn sau).

## 7. Số đo baseline (MNIST, chia theo nhóm, test chấm một lần)

| Mô hình | Đặc trưng | Seed | Val Macro-F1 | Test acc | Test Macro-F1 |
|---|---|---|---|---|---|
| Lớp đa số (sàn) | pixel | 1 | 0,004 | 0,020 | 0,002 |
| Logistic Regression | pixel | 1 | 0,772 | 0,705 | 0,684 |
| MLP 256-128 | pixel | 3 | 0,834 ± 0,003 | 0,799 ± 0,009 | 0,777 ± 0,008 |
| Random Forest (200 cây) | pixel | 3 | 0,837 ± 0,002 | 0,804 ± 0,004 | 0,788 ± 0,004 |
| Linear SVM | HOG | 1 | 0,877 | 0,882 | 0,876 |
| **MLP 256-128** | **HOG** | 3 | **0,923 ± 0,007** | **0,917 ± 0,001** | **0,911 ± 0,003** |

Baseline tốt nhất theo validation: MLP + HOG. Cặp nhầm lớn nhất của nó: U→K 15,0%, V→W 12,7%, U→R 11,7%, N→S 10,7%, Y→K 9,0%.

## 8. Kế hoạch mô hình tuần 4

- Quét cấu hình CNN trên validation (độ rộng, số epoch, learning rate, dropout, có/không tăng cường), 3 seed mỗi cấu hình; chọn cấu hình tốt nhất, chấm test một lần; thử tập hợp 5 CNN.
- MLP landmark: so các bộ đặc trưng (`xy`, `dist`, `dist_ang`, `xy_dist_ang`) và cỡ mạng; tập hợp 5 MLP; xuất ONNX cho web.
- Ma trận nhầm, F1 từng chữ, phân tích lỗi.
