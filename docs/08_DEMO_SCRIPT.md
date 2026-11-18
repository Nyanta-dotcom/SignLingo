# 08 · Kịch bản demo và phương án dự phòng (P4-12)

Mục tiêu: trong khoảng 7 phút cho người chấm thấy (1) vấn đề và giải pháp, (2) ứng dụng chạy thật với webcam, (3) bằng chứng AI đo được. Mọi con số khi trình bày **đọc trực tiếp trên màn AI Lab**, không đọc từ trí nhớ hay từ báo cáo cũ.

## Chuẩn bị (làm trước buổi demo)

- [ ] Máy trình chiếu: Chrome bản mới, đã cấp quyền camera cho địa chỉ sẽ dùng, tắt các ứng dụng khác đang dùng camera (Zoom, Meet).
- [ ] Ánh sáng: nguồn sáng ở phía trước người ra dấu, nền sau lưng đơn giản. Thiếu sáng làm hình mờ và nhận dạng kém.
- [ ] Mở sẵn 3 tab: trang chào, `/lab`, `/practice`. Dùng chế độ sáng hoặc tối đã chọn từ trước.
- [ ] Đã chạy bài 1 một lần để biết chữ nào nhận dạng ổn trên máy này (tránh chọn chữ dễ nhầm như M/N, S/T, R/U khi demo trực tiếp).
- [ ] Nếu muốn có số FPS thật của máy trình chiếu: vào `/lab` → Live Monitor → **Ghi 60 giây**, giữ file JSON làm bằng chứng.
- [ ] Mạng: dùng địa chỉ production (Vercel) nếu đã triển khai; **luôn chuẩn bị song song bản chạy cục bộ** (bên dưới).

## Kịch bản

| Phút | Màn hình | Nói và làm |
|---|---|---|
| 0:00 | Trang chào | Vấn đề: học bảng chữ cái ngôn ngữ ký hiệu ASL cần người sửa tay. Giải pháp: học trước webcam, AI nhận dạng ngay trong trình duyệt. Nhấn mạnh: không có máy chủ, không ảnh nào rời khỏi máy. |
| 1:00 | `/learn` | Lộ trình 7 bài, bài sau chỉ mở khi xong bài trước, mục tiêu XP trong ngày. |
| 1:30 | Bài 1 | Thẻ chữ, rồi ra dấu: vòng tiến độ đầy sau khi giữ đúng dấu khoảng 1 giây, gợi ý chỉnh ngón tay khi lệch. Làm đúng một chữ, và (nếu tình huống tự nhiên) một chữ sai để thấy mất tim. |
| 3:00 | Kết quả bài | XP, độ chính xác, chuỗi ngày. Nêu luật: cần đúng từ 50% mới tính hoàn thành. |
| 3:30 | `/practice` | Luyện tự do: giữ từng chữ để "gõ" thành văn bản, không trừ tim. |
| 4:30 | `/lab` → Benchmark | So sánh mô hình (baseline và mạng nơ-ron) bằng số trong bảng. Chỉ vạch baseline tốt nhất. Nói rõ bộ landmark hiện chia theo thứ tự file, **chưa phải theo người ra dấu mới**. |
| 5:15 | `/lab` → Data Leakage | Vì sao chia ngẫu nhiên cho điểm kiểm định cao giả tạo, so với chia theo nhóm ảnh. |
| 5:45 | `/lab` → Phân tích lỗi | Ma trận nhầm và các cặp chữ nhầm nhiều nhất; nối với gợi ý "đang giống chữ X" trong bài học. |
| 6:15 | `/lab` → Live Monitor | Thời gian xử lý mỗi khung và vạch 33 ms trên máy đang trình chiếu; backend ONNX và delegate đang dùng. |
| 6:45 | Giới hạn | Nói thẳng: chưa đo trên người mới (signer holdout) nếu chưa có dữ liệu; hiện chỉ 24 chữ tĩnh, chưa có J và Z; số FPS phụ thuộc máy. |

## Phương án dự phòng

| Sự cố | Cách xử lý |
|---|---|
| Mạng yếu hoặc Vercel lỗi | Chạy cục bộ: trong `frontend/` chạy `pnpm build` rồi `pnpm preview`, mở địa chỉ `Local:` mà terminal in ra. Làm sẵn trước buổi demo và thử một lần. |
| Webcam không hoạt động | Cho xem phần không cần camera: `/lab` (Benchmark, Phân tích lỗi, Data Leakage), `/learn`, thẻ chữ. Nói rõ camera là phần đang lỗi, không giả vờ. |
| Camera chạy nhưng nhận dạng kém | Đổi chữ dễ (A, B, L, V), tăng sáng, đưa tay lại gần khung và để lòng bàn tay hướng về camera. |
| Muốn trình diễn mà không có người ra dấu | Chrome có cờ camera giả đọc từ video đã quay sẵn: `--use-fake-device-for-media-stream --use-file-for-fake-video-capture=<file.y4m>`. **Cần quay và chuyển video sang `.y4m` từ trước**; chưa chuẩn bị thì không dùng cách này. |
| Máy treo hoặc giật | Tắt các tab khác; mở `/practice` thay vì bài học để nhẹ hơn; nói số FPS đo được trong Live Monitor thay vì đoán. |

## Câu hỏi hay gặp (chuẩn bị trả lời bằng số trong AI Lab)

- Vì sao bộ landmark có điểm thấp hơn bộ ảnh? → xem kết quả và ghi chú trong AI Lab; mô hình webcam dùng cho ứng dụng là bộ landmark vì nhẹ và chạy trực tiếp trên trình duyệt.
- Dữ liệu có rời máy không? → Không; có thể mở tab Network của Chrome để chứng minh chỉ có request cùng địa chỉ.
- Làm sao biết không bị rò rỉ dữ liệu khi đánh giá? → trang Data Leakage và quy trình đánh giá trong `ml/README.md`.
