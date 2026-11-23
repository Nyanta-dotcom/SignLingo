# 09 · Kịch bản video demo (5 người cùng tham gia)

Video quay sẵn để nộp vào thư mục Google Drive của môn. Dài khoảng **5 phút**, chia thành 6 cảnh; mỗi thành viên dẫn phần mình phụ trách (theo trang Giới thiệu). Bản trình bày trực tiếp và phương án dự phòng ở [08_DEMO_SCRIPT.md](08_DEMO_SCRIPT.md).

Quy ước: mọi con số **đọc trên màn hình lúc quay** (AI Lab, Live Monitor, Lighthouse), không đọc từ trí nhớ. Chỗ `[số trên màn hình]` là chỗ người nói đọc con số đang hiện.

## Phân vai

| Người | Cảnh | Thời lượng | Nội dung |
|---|---|---|---|
| Lê Nguyễn Thảo Anh | 1 và 6 | 0:00–0:35, 4:30–5:00 | Mở đầu, kết thúc, đọc lời dẫn chuyển cảnh |
| Nguyễn Anh Dũng | 2 | 0:35–1:35 | Giao diện, lộ trình, học một bài, J/Z và số |
| Nguyễn Tuấn Hưng | 3 | 1:35–2:50 | AI hoạt động thế nào, AI Lab, tài khoản và bảng xếp hạng |
| Trần Công Sanh | 4 | 2:50–3:40 | Thu dữ liệu, chất lượng dữ liệu, kiểm thử |
| Nguyễn Hữu Triết | 5 | 3:40–4:30 | Tốc độ, Lighthouse, giao diện điện thoại |

Mỗi người nên **xuất hiện trên hình ít nhất một lần** (khung webcam nhỏ ở góc hoặc cảnh đứng nói), không chỉ lồng tiếng.

## Chuẩn bị trước khi quay

- [ ] Quay màn hình 1920×1080 (OBS hoặc Xbox Game Bar), Chrome toàn màn hình, ẩn thanh dấu trang và thông báo.
- [ ] Ánh sáng phía trước người ra dấu, nền sau đơn giản.
- [ ] Chọn trước chữ dễ nhận để demo: **A, B, L, V**. Tránh M/N, S/T, R/U và X.
- [ ] Đăng nhập sẵn tài khoản demo đã bật tham gia bảng xếp hạng; mở dự án Supabase trước để không bị tạm dừng.
- [ ] Mở sẵn tab: `/welcome`, `/learn`, `/practice`, `/lab`, `/leaderboard`, `/collect`.
- [ ] Chạy sẵn Lighthouse một lần (Chrome DevTools → Lighthouse) để có ảnh chụp kết quả.
- [ ] Mỗi người tự quay phần mình; Thảo Anh ghép, thêm phụ đề và nhạc nền nhẹ.

## Kịch bản

### Cảnh 1 · Mở đầu — Thảo Anh (0:00–0:35)

**Hình:** cả nhóm đứng chung (hoặc ghép 5 khung webcam), sau đó chuyển sang trang `/welcome`.

**Lời:**
> Xin chào thầy và các bạn, chúng em là nhóm Ngũ Đại Hào Kiệt, môn Nhập môn Trí tuệ nhân tạo. Học bảng chữ cái ngôn ngữ ký hiệu Mỹ thường cần có người bên cạnh sửa tay. Sản phẩm của nhóm là SignLingo: một ứng dụng web học ngôn ngữ ký hiệu kiểu Duolingo. Bạn ra dấu trước webcam và AI chấm ngay trong trình duyệt. Hình camera không bao giờ rời khỏi máy của bạn.
>
> Sau đây, Dũng sẽ giới thiệu cách học trên SignLingo.

### Cảnh 2 · Học với SignLingo — Dũng (0:35–1:35)

**Hình:** `/welcome` → bấm **Vào học** → `/learn` → mở bài 1 → ra dấu chữ A rồi B → màn kết quả. Cuối cảnh lướt nhanh vùng chữ động J, Z và vùng số.

**Lời:**
> Nhóm em thiết kế lại giao diện cho thân thiện, có mèo Lingo đi cùng. Lộ trình chia thành từng vùng: bảng chữ cái, chữ động J và Z, và số từ 0 đến 10. Bài sau chỉ mở khi học xong bài trước.
>
> Trong bài học, mình xem hình mẫu rồi ra dấu. Khi giữ đúng dấu khoảng một giây, vòng tiến độ đầy và có âm thanh báo đúng. Nếu tay lệch, app gợi ý cần chỉnh ngón nào.
>
> Với J và Z là chữ có chuyển động, và với các số, nhóm dùng luật hình học dựa trên vị trí các khớp tay.
>
> Học xong, mình thấy XP, độ chính xác và chuỗi ngày học. Vậy AI nhận ra ký hiệu bằng cách nào? Mời Hưng.

### Cảnh 3 · AI hoạt động thế nào — Hưng (1:35–2:50)

**Hình:** sơ đồ ngắn (slide): webcam → MediaPipe Hands (21 điểm khớp) → chuẩn hóa → mô hình MLP (ONNX) → chữ cái. Sau đó `/lab` → tab **Benchmark** → **Data Leakage** → **Phân tích lỗi**. Cuối cảnh `/leaderboard`.

**Lời:**
> Mỗi khung hình, MediaPipe tìm 21 điểm khớp trên bàn tay. Nhóm chuẩn hóa các điểm này để không phụ thuộc vị trí và kích thước tay, rồi đưa vào một mạng nơ-ron nhỏ chạy bằng ONNX Runtime ngay trong trình duyệt. Không có server nào xử lý hình ảnh.
>
> Trang AI Lab cho thấy bằng chứng. Ở Benchmark, mô hình mạng nơ-ron đạt `[số trên màn hình]`, so với mô hình cơ sở `[số trên màn hình]`. Tất cả số liệu này sinh ra từ thí nghiệm trong repo, có seed cố định.
>
> Tab Data Leakage giải thích vì sao chia dữ liệu ngẫu nhiên cho điểm cao giả tạo. Tab Phân tích lỗi cho thấy các cặp chữ hay bị nhầm, và app dùng thông tin này để gợi ý khi người học ra dấu gần giống chữ khác.
>
> Nếu đăng nhập, tiến độ được đồng bộ qua Supabase và người học có thể tự bật tham gia bảng xếp hạng. Chỉ tiến độ học được lưu, không có hình ảnh.
>
> Dữ liệu là nền tảng của mô hình. Mời Sanh nói về phần dữ liệu và kiểm thử.

### Cảnh 4 · Dữ liệu và kiểm thử — Sanh (2:50–3:40)

**Hình:** trang `/collect` ghi một mẫu → bảng hoặc biểu đồ chất lượng dữ liệu (slide từ `ml/reports/data_quality.json`) → ghép nhanh app chạy trên Chrome, Edge và điện thoại.

**Lời:**
> Trang thu mẫu cho phép ghi lại dữ liệu bàn tay của nhiều người để bổ sung cho bộ huấn luyện. Mỗi mẫu chỉ là tọa độ các khớp, không phải ảnh.
>
> Nhóm kiểm tra chất lượng dữ liệu trước khi huấn luyện: số mẫu mỗi chữ, mẫu trùng, mẫu lỗi. Khi kiểm tra, em phát hiện chữ X trong dữ liệu gốc phần lớn có ngón trỏ duỗi thẳng, trong khi dấu đúng là ngón trỏ cong. Vì vậy chữ X khó nhận hơn, và cần thu thêm mẫu từ nhiều người.
>
> Em cũng kiểm thử app trên nhiều trình duyệt và thiết bị, và kiểm tra trợ năng: dùng được bằng bàn phím và có nhãn cho trình đọc màn hình.
>
> App phải chạy mượt trên cả máy tính lẫn điện thoại. Mời Triết.

### Cảnh 5 · Tốc độ và giao diện điện thoại — Triết (3:40–4:30)

**Hình:** `/lab` → tab **Live Monitor** khi đang ra dấu → ảnh chụp kết quả Lighthouse → app mở trên điện thoại (hoặc chế độ thiết bị di động của DevTools).

**Lời:**
> Ở Live Monitor, mình thấy thời gian xử lý mỗi khung hình trên máy đang quay là `[số trên màn hình]` mili giây, so với vạch 33 mili giây tương ứng 30 khung mỗi giây. Nhóm đã đo và thấy chạy MediaPipe bằng CPU nhanh hơn GPU trên máy của nhóm, nên chọn CPU làm mặc định.
>
> Em phụ trách tối ưu điểm Lighthouse: giảm dung lượng ảnh, tải trước những phần cần thiết. Kết quả Lighthouse hiện là `[số trên màn hình]`.
>
> Giao diện được tối ưu cho cả máy tính và điện thoại: trên điện thoại, thanh điều hướng chuyển xuống dưới và camera vừa khung màn hình.
>
> Cuối cùng, Thảo Anh sẽ tổng kết.

### Cảnh 6 · Tổng kết — Thảo Anh (4:30–5:00)

**Hình:** `/practice` đánh vần một từ ngắn bằng các chữ dễ (ví dụ chữ có A, B, L, V) → màn hình cuối có tên 5 thành viên, MSSV và link GitHub.

**Lời:**
> Ngoài bài học, mục Luyện cho phép đánh vần từ bằng cách giữ từng chữ.
>
> SignLingo còn giới hạn: mô hình chưa được đo trên người ra dấu mới, chữ X cần thêm dữ liệu, J, Z và số dùng luật hình học chưa đo độ chính xác, và tốc độ phụ thuộc vào máy. Đây là những việc nhóm sẽ làm tiếp.
>
> Cảm ơn thầy và các bạn đã theo dõi. Mã nguồn và báo cáo có trong link GitHub trên màn hình.

## Sau khi quay

- [ ] Kiểm tra mỗi người có xuất hiện và nói phần của mình.
- [ ] Phụ đề tiếng Việt khớp lời nói; các `[số trên màn hình]` đã được đọc đúng số thật.
- [ ] Xuất MP4 1080p, đặt tên `SignLingo_Demo_NguDaiHaoKiet.mp4`, đưa vào thư mục Google Drive của nhóm.
