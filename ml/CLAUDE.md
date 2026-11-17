# ml/ — Rules (đọc kèm ../CLAUDE.md)
Context: docs 01 §2/§5.1/§6.1 · 02 §4 · 04 §4. Chỉ sửa `ml/` và `shared/contracts/{schemas,fixtures}`.

- Chỉ `data/split.py` được tạo split; script tuning **cấm** đọc test (`load_split("test", final=True)` chỉ trong `evaluate --final`).
- Mọi `fit()` của scaler/PCA chỉ nhận `X_train`.
- Không lật ngang ảnh MNIST; landmark `lm-v1` = tịnh tiến cổ tay + chia max(|x|,|y|), không lật gương (docs/02 §4.3).
- Mỗi thí nghiệm = 1 YAML trong `configs/` + 1 JSON trong `reports/experiments/`.
- Đổi tiền xử lý landmark ⇒ tăng `preprocess_version`, sinh lại fixture.
- Test: unit cho hàm thuần; integration trên `tests/fixtures/tiny_*.csv` (≤ 500 dòng, < 60 s).
