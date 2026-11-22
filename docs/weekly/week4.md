# Tuần 4 — Phát triển và đánh giá mô hình

**Ngày trình bày:** [nhóm điền]

## 1. Tám mục báo cáo tuần

| Mục | Nội dung |
|---|---|
| **What** | CNN (quét 7 cấu hình × 3 seed, tập hợp 5 CNN), MLP landmark (quét đặc trưng và cỡ mạng, tập hợp 5 MLP), ma trận nhầm, F1 từng chữ, mô hình ONNX cho web |
| **When** | Tuần này: mô hình + đánh giá. Tuần 5: tích hợp web, demo, báo cáo cuối |
| **Why** | Trả lời RQ1 (deep learning hơn baseline bao nhiêu) và RQ2 (chữ nào nhầm); có mô hình đủ nhỏ để chạy trên trình duyệt |
| **Who** | Hưng: huấn luyện, đánh giá, xuất ONNX, AI Lab. Sanh: chuẩn bị thu dữ liệu webcam để đo trên người mới. Thảo Anh: báo cáo, slide. Triết, Dũng: giao diện bài học |
| **How much** | Dự kiến: [nhóm điền]. Đã dùng: [nhóm điền]. Mỗi cấu hình CNN mất khoảng 1,5–3 phút trên CPU; quét đầy đủ mất vài giờ |
| **Rủi ro lớn nhất** | Mô hình landmark đo trên `keypoint.csv` chia theo thứ tự tệp, không phải người mới → kết quả trên webcam thật có thể thấp hơn |
| **Thay đổi lớn** | Thêm đặc trưng khoảng cách và góc cho landmark vì tọa độ thô khó tách U/R, M/N |
| **Vấn đề chính** | Chữ X có F1 = 0 ở mô hình landmark (xem §6) |

## 2. Kiến trúc mô hình

**SmallCNN** (`ml/src/signlingo_ml/models/cnn.py`), cấu hình `wide`:

```text
Ảnh 1×28×28 → Conv 3×3 (32) → ReLU → MaxPool → Conv 3×3 (64) → ReLU → MaxPool
           → Flatten (64×7×7) → Linear 256 → ReLU → Dropout 0,3 → Linear 24
```
828.056 tham số (cấu hình `base`: 16/32 kênh, 128 ẩn, 208.728 tham số).

**LandmarkMLP** (`models/landmark_mlp.py`), mô hình đang chạy trên web:

```text
283 đặc trưng (xy 42 + dist 210 + ang 31) → Linear 512 → ReLU → Dropout 0,3
                                          → Linear 256 → ReLU → Dropout 0,3 → Linear 24
```
Tập hợp 5 mô hình (5 seed), trung bình xác suất softmax ngay trong đồ thị ONNX.

## 3. Quá trình huấn luyện

| | CNN | MLP landmark |
|---|---|---|
| Tối ưu | Adam, lr 1e-3, weight decay 1e-4, giảm lr kiểu cosine | Adam, lr 1e-3 |
| Hàm mất mát | Cross-entropy, label smoothing 0,05 | Cross-entropy, label smoothing 0,05 |
| Batch | 128 | 256 |
| Epoch | 15 hoặc 30, dừng sớm theo validation (patience 3) | tối đa 60, patience 6 |
| Tăng cường | Có (xoay, dịch, phóng, sáng/tương phản; không lật) | Không |
| Seed | 42, 43, 44 | 42, 43, 44 (tập hợp: 5 seed) |

**Khó khăn khi huấn luyện:**
- CNN không tăng cường bị khớp quá mức: validation Macro-F1 giảm từ 0,962 xuống 0,918.
- Learning rate 3e-3 không ổn định giữa các seed (độ lệch ±0,043).
- Huấn luyện trên CPU chậm → giới hạn số cấu hình và seed.
- Test landmark đã được chấm nhiều lần cho các họ mô hình khác nhau; không quyết định nào dựa vào test.

## 4. Chỉ số đánh giá

Macro-F1 là chỉ số chính (dữ liệu landmark lệch lớp đến 8,67 lần), kèm độ chính xác và tỉ lệ sai. Báo cáo trung bình ± độ lệch chuẩn qua 3 seed.

**Quét CNN (chỉ validation):**

| Cấu hình | Val Macro-F1 |
|---|---|
| `wide_e30` | 0,980 ± 0,005 |
| `base_e30` | 0,977 ± 0,010 |
| `wide` | 0,975 ± 0,002 |
| `base` | 0,962 ± 0,015 |
| `lr_3e-3` | 0,952 ± 0,043 |
| `dropout_0.5` | 0,950 ± 0,009 |
| `no_aug` | 0,918 ± 0,014 |

**Quét landmark (chỉ validation):** `xy` 0,777 → `dist_ang` 0,794 → `xy_dist_ang` + MLP 512-256 0,850 ± 0,005 → tập hợp 5: 0,857.

## 5. So sánh baseline và mô hình cải tiến (test, chấm một lần)

| Mô hình | Test acc | Test Macro-F1 |
|---|---|---|
| Lớp đa số (sàn) | 0,020 | 0,002 |
| Baseline tốt nhất: MLP + HOG (3 seed) | 0,917 ± 0,001 | 0,911 ± 0,003 |
| CNN `wide_e30` (3 seed) | 0,975 ± 0,002 | 0,974 ± 0,003 |
| **Tập hợp 5 CNN** | **0,979** | **0,979** |

→ **RQ1:** tập hợp CNN hơn baseline tốt nhất 0,069 Macro-F1, lớn hơn hai lần độ lệch giữa các seed (quy tắc kinh nghiệm, không phải kiểm định thống kê). Đặc trưng có ảnh hưởng lớn: cùng MLP, HOG cho 0,911 so với 0,777 của pixel.

**Landmark** (bộ dữ liệu khác, không so trực tiếp với bảng trên): tập hợp 5 MLP đạt test acc 0,782, Macro-F1 0,778. Lượng tử hóa int8 giữ nguyên Macro-F1 validation (0,857) nhưng không nhanh hơn, nên app dùng bản fp32 (5,68 MB).

Hình: `ml/reports/figures/model_comparison.png`, `curves_cnn_main_wide_e30_s42.png`.

## 6. Phân tích lỗi (RQ2)

| Mô hình | Cặp nhầm lớn nhất (tỉ lệ trong chữ thật) | F1 thấp nhất |
|---|---|---|
| Tập hợp CNN | Y→K 11,1%, T→X 8,9%, T→L 8,1%, M→S 5,3%, G→H 5,2% | T 0,872, G 0,935, Y 0,938 |
| Tập hợp landmark | **U→R 71,2%**, X→L 34,7%, X→M 27,4%, A→S 24,2%, M→N 18,5% | **X 0,000**, U 0,319, S 0,604 |

- Giả thuyết "chữ nắm tay và chữ 2–3 ngón dễ nhầm" khớp một phần: U/R, M/N, A/S là các cặp bàn tay gần nhau.
- **Chữ X:** kiểm tra lại dữ liệu (`ml/reports/x_pose_check.json`) cho thấy trong 1.094 dòng X của `keypoint.csv`, góc khớp đầu ngón trỏ trung bình 160° (gần thẳng) và chỉ 2,6% dòng có đầu ngón cong móc dưới 110°. Ảnh bài học vẽ X chuẩn ASL với ngón trỏ cong móc. Nghĩa là dữ liệu huấn luyện dạy một dáng X khác ảnh bài học — lỗi nằm ở dữ liệu, không chỉ ở mô hình.

Hình: `ml/reports/figures/confusion_cnn.png`, `confusion_landmark.png`, `per_class_f1.png`.

## 7. Kế hoạch cải thiện

1. Thu dữ liệu webcam từ ít nhất 3 người (trang `/collect` của app) để đo trên người mới (signer holdout) — số đo hiện tại là cận trên lạc quan.
2. Thu thêm mẫu X cong móc và U/R từ nhiều người, huấn luyện lại, so với mô hình cũ trước khi thay.
3. Đo tốc độ trong trình duyệt (RQ3) bằng AI Lab → Live Monitor.
