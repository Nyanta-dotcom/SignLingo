# Kết quả thí nghiệm và trả lời câu hỏi nghiên cứu

Mọi số dưới đây đọc từ `reports/experiments/*.json` (bảng đầy đủ: `summary.md`, hình: `figures/`). Câu chữ chính thức của RQ1 cần nhóm xác nhận; dưới đây dùng bản trong PRD.

## Hai bộ dữ liệu, hai bài toán — không so sánh trực tiếp

| | Ảnh (Sign Language MNIST) | Landmark (`keypoint.csv`) |
|---|---|---|
| Dùng cho | Đánh giá phương pháp (baseline, CNN) | Mô hình chạy trên web (42 số vào ONNX) |
| Cách chia | Chia theo nhóm ảnh gốc; test là tập test riêng của Kaggle | Theo thứ tự tệp, 60/20/20, đệm 2% |
| Test là gì | Ảnh chưa thấy từ tập test của Kaggle | Phần cuối mỗi chữ trong cùng tệp, **không phải người mới** |

## RQ1 — Deep Learning cải thiện bao nhiêu so với baseline cổ điển, và đặc trưng ảnh hưởng thế nào?

Trên ảnh (test Macro-F1):

| Mô hình | Test Macro-F1 |
|---|---|
| Đa số lớp (sàn) | 0,002 |
| Logistic Regression, pixel | 0,684 |
| MLP, pixel (3 seed) | 0,777 ± 0,008 |
| Random Forest, pixel (3 seed) | 0,788 ± 0,004 |
| Linear SVM, HOG (1 seed) | 0,876 |
| MLP, HOG (3 seed) — baseline tốt nhất | 0,911 ± 0,003 |
| CNN rộng 30 epoch (3 seed) | 0,974 ± 0,003 |
| Tập hợp 5 CNN | 0,979 (độ chính xác 0,979; sai 2,1%) |

- **Mức cải thiện:** tập hợp CNN hơn baseline tốt nhất 0,069 Macro-F1 (0,979 so với 0,911), lớn hơn hai lần độ lệch giữa các seed. Đây là quy tắc kinh nghiệm, không phải kiểm định thống kê. Tập hợp chỉ có một lần chấm vì các thành viên đã là 5 seed.
- **Ảnh hưởng của đặc trưng:** với cùng MLP, HOG cho 0,911 so với 0,777 của pixel, tức đặc trưng thiết kế tay có ảnh hưởng lớn hơn việc đổi mô hình cổ điển (RF 0,788). Augmentation giúp CNN: bỏ augmentation giảm validation Macro-F1 từ 0,962 xuống 0,918.
- **Landmark** (tập hợp 5 MLP, đặc trưng khoảng cách và góc): validation 0,857, test Macro-F1 0,778 (sai 21,9%). Đặc trưng kỹ thuật tăng validation từ 0,777 (chỉ x, y) lên 0,850. Số này đo trên bộ dữ liệu khác nên không so được với bảng trên.
- **Giới hạn:** độ rộng CNN (`wide`) là một giả thuyết được kiểm bằng validation. Linear SVM chỉ có 1 seed (chạy 39 phút).

## RQ2 — Chữ nào bị nhầm nhiều nhất?

Cặp nhầm lớn nhất (tỉ lệ trong chữ thật, ma trận nhầm trên test):

| Mô hình | Các cặp nhầm |
|---|---|
| Tập hợp CNN | Y→K 11,1%, T→X 8,9%, T→L 8,1%, M→S 5,3%, G→H 5,2% |
| Tập hợp landmark | **U→R 71,2%**, X→L 34,7%, X→M 27,4%, A→S 24,2%, M→N 18,5% |

- F1 thấp nhất: CNN: T 0,872, G 0,935, Y 0,938. Landmark: **X 0,000**, U 0,319, S 0,604.
- Giả thuyết ban đầu "các chữ nắm tay hoặc 2–3 ngón nhầm với nhau" khớp một phần: U/R, M/N, A/S là các cặp bàn tay gần nhau. Chúng tôi **chưa kiểm chứng nguyên nhân** (ví dụ do 2D thiếu độ sâu, ít mẫu, hay do người ra dấu); đo mới cho thấy đâu bị nhầm, không cho biết vì sao.
- Với landmark, sửa lỗi làm lỗi di chuyển chứ không biến mất: đặc trưng kỹ thuật và tập hợp giảm tổng lỗi nhưng X vẫn có F1 bằng 0. Hướng cải thiện lớn nhất theo chúng tôi là thêm dữ liệu từ nhiều người; việc này chưa được kiểm chứng.
- **Chữ X:** trong 1.094 dòng X của `keypoint.csv`, góc khớp đầu ngón trỏ trung bình là 160° (gần thẳng) và chỉ 2,6% dòng có đầu ngón cong móc dưới 110° (`x_pose_check.json`). Ảnh bài học vẽ X chuẩn ASL với ngón trỏ cong móc. Một bản ghi X chuẩn bằng webcam của một thành viên bị đoán là I ở cả 40 khung. Lỗi của X nằm ở dữ liệu huấn luyện, không chỉ ở mô hình.

## RQ3 — Suy luận thời gian thực > 30 FPS trên trình duyệt?

Đo 60 giây trong Chrome 157 trên laptop của nhóm (AI Lab → Live Monitor). MediaPipe chạy CPU: thời gian mỗi khung p50 **29,8 ms**, p95 **38,6 ms** (đạt chỉ tiêu p50 ≤ 33 ms, p95 ≤ 40 ms); bộ phân loại 0,72 ms. Nhưng chỉ xử lý được **22,6 khung/giây**, dưới mục tiêu 30. MediaPipe chạy GPU chậm hơn khoảng 2,6 lần (MediaPipe p50 76,1 ms) nên giữ CPU. Đã sửa cách xếp lịch khung, **chưa đo lại**. Mới đo một lần trên một máy. Mô hình ONNX đã xuất (5,68 MB, khớp PyTorch ở 3,3e-7).

## Chất lượng dữ liệu

| | MNIST train | MNIST test | `keypoint.csv` |
|---|---|---|---|
| Dòng thiếu / trùng hoàn toàn | 0 / 0 | 0 / 0 | 0 / 0 |
| Dòng hỏng hoặc bị bỏ | 0 | 0 | 1 dòng hỏng, 2.865 dòng chữ động |
| Lớp nhiều nhất / ít nhất | 1,35 | 3,46 | 8,67 (A 4.136, O 477) |

Nguồn: `data_quality.json`. Không có dòng trùng hoàn toàn, nhưng ảnh MNIST là bản tăng cường của ít ảnh gốc (xem phần rò rỉ dữ liệu).

## Đo trên người mới (signer-holdout)

**Chưa đo.** `keypoint.csv` không có cột người hoặc phiên. Công cụ thu mẫu (`tools/capture.py`), bộ đọc file và đánh giá leave-one-signer-out (`evaluate/signer_holdout.py`) đã có và đã test trên dữ liệu giả, nhưng chưa có file thu thật. Đến khi có, số 0,778 ở trên là **cận trên lạc quan** cho webcam thật.

## Chống rò rỉ dữ liệu (leakage study)

Logistic Regression trên pixel, 3 seed:

| Cách chia | Val acc | Test acc | Khoảng cách ảnh gần nhất val→train |
|---|---|---|---|
| Ngẫu nhiên | 1,000 | 0,687 | 0,45 |
| Theo nhóm (Ward, 70 cụm) | 0,745 ± 0,040 | 0,690 ± 0,014 | 2,45 |

Chia ngẫu nhiên cho validation hoàn hảo nhưng test chỉ 0,69: khoảng cách 0,31 là rò rỉ do bản sao tăng cường. Chia theo nhóm đưa khoảng cách xuống 0,055. Các nhóm là ước lượng (không có mã ảnh gốc), nên có thể còn rò rỉ nhỏ.

## Hạn chế cần nêu khi báo cáo

- Test của landmark đã được chấm nhiều lần cho các họ mô hình khác nhau (lần đầu cho MLP x,y, sau đó cho mô hình cải tiến); không quyết định nào dựa trên test, nhưng đó không phải lần chạm đầu tiên.
- Độ chính xác trên webcam thật chưa biết; ngưỡng chấm đúng 0,60 trong bài học là giả thuyết khởi đầu.
- Kích thước thumbnail dùng để gom nhóm được chọn bằng cách xem khoảng cách val–test của một baseline (test làm chẩn đoán rò rỉ, không chọn mô hình).
- Dữ liệu ảnh Kaggle và `keypoint.csv` có số người ra dấu không rõ.
