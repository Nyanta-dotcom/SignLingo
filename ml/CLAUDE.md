# ml/ — Rules (đọc kèm ../CLAUDE.md)
Context: docs 01 §2/§5.1/§6.1 · 02 §4 · 04 §4 · docs/reports/*. Chỉ sửa `ml/` và `shared/contracts/{schemas,fixtures}`.

- Chỉ `data/split.py` được tạo split; script tuning **cấm** đọc test (`load_split("test", final=True)` chỉ trong `evaluate --final`).
- Mọi `fit()` của scaler/PCA chỉ nhận `X_train`.
- Không lật ngang ảnh MNIST; landmark mirror-to-right theo spec lm-v1.
- Mỗi thí nghiệm = 1 YAML trong `configs/` + 1 JSON trong `reports/experiments/`.
- Đổi tiền xử lý landmark ⇒ tăng `preprocess_version`, sinh lại fixture.
- Test: unit cho hàm thuần; integration trên `tests/fixtures/tiny_*.csv` (≤ 500 dòng, < 60 s).
