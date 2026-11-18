# ml/ — Pipeline học máy của SignLingo AI

Nhận diện bảng chữ cái ASL tĩnh (24 lớp A–Y, bỏ J và Z). Thư mục này chứa toàn bộ phần AI: làm sạch dữ liệu, chia dữ liệu chống rò rỉ, baseline, CNN, mô hình landmark, xuất ONNX và vẽ hình. Mọi con số đều do các lần chạy trong repo này sinh ra (`reports/experiments/*.json`). Kết quả và phân tích: [`reports/RESULTS.md`](reports/RESULTS.md).

## Cài đặt

Python 3.11. Trong thư mục `ml/`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev,dl]"
```

PyTorch bản CPU: `pip install torch --index-url https://download.pytorch.org/whl/cpu`. Công cụ thu mẫu webcam cần thêm nhóm `capture` (`opencv-python`, `mediapipe`).

## Dữ liệu (không commit, đặt trong `ml/data/raw/`)

| File | Nguồn |
|---|---|
| `sign_mnist_train.csv`, `sign_mnist_test.csv` | Kaggle, Sign Language MNIST (ảnh xám 28×28, 24 lớp) |
| `keypoint.csv` | Repo MIT `AkramOM606/American-Sign-Language-Detection` (nhãn + 42 số tọa độ landmark) |
| `webcam/landmarks_*.json` | Tự thu bằng `tools/capture.py` (chưa có, xem P1-21) |

## Chạy lại

```powershell
.\.venv\Scripts\python.exe -m signlingo_ml.pipeline all --dry-run   # xem bước nào sẽ chạy
.\.venv\Scripts\python.exe -m signlingo_ml.pipeline all             # chạy tất cả (nhiều giờ trên CPU)
.\.venv\Scripts\python.exe -m signlingo_ml.pipeline cnn --force     # chạy lại riêng một bước
```

Các bước: `data`, `baselines`, `cnn`, `landmarks`, `export`, `publish`, `report`. Bước nào đã đủ file đầu ra thì bị bỏ qua. Bước nặng nhất là baseline Linear SVM (khoảng 39 phút) và quét CNN. Chưa có bản chạy rút gọn trên dữ liệu nhỏ cho CI.

Kiểm tra mã: `python -m pytest -q` và `ruff check .`.

## Quy trình đánh giá (để kết quả không tự dối mình)

1. **Chia theo nhóm, không chia ngẫu nhiên.** Tập train của Kaggle là nhiều bản tăng cường của ít ảnh gốc; chia ngẫu nhiên đặt bản sao của cùng một ảnh ở cả hai phía. Chúng tôi gom ảnh thành nhóm (Ward, 70 cụm mỗi lớp) và giữ nguyên cả nhóm làm validation. `reports/RESULTS.md` có đo mức rò rỉ.
2. **Chọn trên validation, test chấm một lần.** Hàm `require_split_access` chặn mọi đoạn mã đọc test mà không khai `final=True`. Bộ chuẩn hóa chỉ khớp trên train.
3. **Seed cố định 42**, nhiều seed khi có thể, báo cáo trung bình ± độ lệch chuẩn.
4. **Landmark:** `keypoint.csv` không có cột người hoặc phiên, nên chia theo thứ tự tệp (60/20/20, đệm 2%). Đây KHÔNG phải kiểm tra trên người mới.

## Cấu trúc

```text
src/signlingo_ml/
  data/       đọc, làm sạch, chia (chỉ split.py được tạo split), chặn đọc test
  features/   pixel, HOG, augmentation
  landmarks/  đọc keypoint.csv và file webcam, chuẩn hóa lm-v1, đặc trưng, mẫu ngón tay
  models/     SmallCNN, LandmarkMLP
  train/      baseline, leakage study, CNN, landmark, trainer dùng chung
  evaluate/   metric, ghi log thí nghiệm, tổng hợp, hình, signer-holdout
  export/     ONNX, manifest, xuất bản vào frontend/public
  pipeline.py một lệnh chạy lại toàn bộ
tools/capture.py  thu mẫu landmark từ webcam (chỉ lưu tọa độ)
reports/          experiments/*.json, summary.md, figures/*.png, RESULTS.md
```

## Đầu ra cho ứng dụng web

`export` + `publish` tạo `frontend/public/models/landmark-mlp-ens5-1.0.0.onnx` (+ manifest, index) và `frontend/public/data/experiments/` cho trang AI Lab. Đầu vào của ONNX là 42 số theo `lm-v1` (tịnh tiến cổ tay về gốc, chia cho max(|x|,|y|), không lật gương), đầu ra là 24 xác suất. Phiên bản đã xuất bản là bất biến.
