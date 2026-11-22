# ADR (nháp) · Tài khoản và đồng bộ tiến trình học

Trạng thái: **ĐƯỢC CHẤP THUẬN HƯỚNG** (người dùng muốn backend để đăng nhập, lưu tiến trình và làm bảng xếp hạng về sau, 2026-11-22). Các quy tắc gộp ở mục 5 và lời hứa quyền riêng tư mới đang được thực hiện theo nháp này, chờ xác nhận chi tiết.

## Bối cảnh
Hiện tiến trình lưu trong `localStorage` (có xuất/nhập JSON). Người dùng không giữ được tiến trình khi đổi máy hay xóa dữ liệu trình duyệt. Mục tiêu của bạn: có tài khoản và đồng bộ tiến trình để thể hiện kiến trúc đầy đủ cho đồ án, còn nhiều thời gian.

## Quyết định đề xuất
Dùng **Supabase** (Auth + Postgres, gói miễn phí) làm dịch vụ có sẵn, **không tự viết server**.

1. **Đồng bộ là tùy chọn.** Không đăng nhập vẫn dùng đủ mọi tính năng như hiện nay (local-first). Đăng nhập chỉ thêm việc đồng bộ.
2. **Đăng nhập:** Google (OAuth) và email + mật khẩu (xác thực email). Mật khẩu do Supabase xử lý, app không bao giờ thấy.
3. **Chỉ đồng bộ tiến trình** theo đúng `shared/contracts/schemas/backup.schema.json` (profile, stats, progress, daily, settings, sessions tóm tắt). **Không bao giờ tải lên** hình camera, video hay landmark bàn tay. Collect vẫn chỉ xuất file ra máy.
4. **Một dòng JSON cho mỗi người dùng** (bảng `user_backups`: `user_id`, `schema_version`, `data jsonb`, `updated_at`), bật Row Level Security: mỗi người chỉ đọc/ghi dòng của mình. Tái dùng bộ kiểm tra backup đã có, nên không thêm lược đồ mới.
5. **Xung đột giữa các máy:** gộp theo từng phần, không ghi đè mù. Quy tắc nháp: XP và số lần hoàn thành lấy giá trị lớn hơn, trạng thái bài lấy "completed" nếu một bên đã completed, chuỗi ngày và tim lấy bên có `updated_at` mới hơn. Cần bạn duyệt các quy tắc này.
6. **Bảo mật:** chỉ dùng khóa `anon` công khai trong bundle (an toàn nhờ RLS); tuyệt đối không đưa khóa `service_role` vào repo hay trình duyệt.

## Bảng xếp hạng (bạn muốn làm về sau; nền tảng làm sẵn từ bây giờ)
- Bảng `public_profiles` chỉ chứa tên hiển thị và điểm: tổng XP, XP 7 ngày gần nhất, chuỗi ngày. **Mặc định không hiện** (`show_on_leaderboard = false`); người dùng phải tự bật.
- Điểm do trigger trong cơ sở dữ liệu sao chép từ bản sao lưu đã đồng bộ; trình duyệt không được ghi trực tiếp vào cột điểm.
- Ai cũng đọc được các dòng đã bật hiển thị (kể cả chưa đăng nhập); email và mọi dữ liệu khác không bao giờ lộ.
- **Giới hạn trung thực:** XP do trình duyệt báo lên, nên người cố tình sửa file đồng bộ vẫn có thể gian lận điểm. Không có backend tự chấm bài thì không tránh được. Đủ dùng cho đồ án và bảng xếp hạng bạn bè; muốn xếp hạng thi đấu thật cần thêm kiểm tra phía máy chủ (ví dụ giới hạn XP tăng mỗi ngày). Màn hình bảng xếp hạng sẽ là một task riêng sau này.
- Người dùng xóa tài khoản bằng hàm `delete_my_account()` (xóa luôn mọi dòng của họ).

## Thay đổi kéo theo (làm khi được duyệt)
- Nới CSP đúng một địa chỉ: `connect-src 'self' https://<project>.supabase.co`, và cho phép `https://accounts.google.com` nếu dùng Google.
- Sửa lời hứa trên trang chào, trang Cài đặt, `docs/08_DEMO_SCRIPT.md` và câu hỏi Network: từ "không dữ liệu nào rời máy" thành "mặc định không rời máy; chỉ khi bạn đăng nhập, tiến trình học (không có hình ảnh) được đồng bộ".
- Cập nhật docs 02 (kiến trúc), 03 (lưu trữ), 04 (hợp đồng), ADR chính thức; thêm biến môi trường `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` trên Vercel.
- Màn hình: nút Đăng nhập trong Hồ sơ/Cài đặt, trạng thái đồng bộ, nút Đăng xuất, nút xóa dữ liệu trên máy chủ (quyền xóa của người dùng).
- Test: đơn vị cho phần gộp, mô phỏng Supabase bằng giả lập, e2e đăng nhập giả; kiểm tra CSP trên `pnpm preview`.

## Phương án đã cân nhắc
- **Giữ local + sao lưu JSON:** an toàn, rẻ, nhưng không có tài khoản.
- **Firebase:** tương đương Supabase nhưng dữ liệu NoSQL, khó dùng lại lược đồ JSON hiện có.
- **Serverless Vercel + DB / FastAPI:** tự viết đăng nhập và bảo mật, rủi ro lớn hơn lợi ích cho phạm vi đồ án.

## Rủi ro
- Phụ thuộc dịch vụ ngoài và hạn mức gói miễn phí (dự án Supabase miễn phí bị tạm dừng khi không hoạt động một thời gian; cần mở lại trước buổi demo).
- Thêm dữ liệu cá nhân (email): cần dòng thông báo quyền riêng tư và cách xóa tài khoản.
- Việc tạo tài khoản và dự án Supabase là của bạn; tôi không tự tạo tài khoản hay nhập khóa.

## Cần bạn duyệt
1. Dùng Supabase, đồng bộ tùy chọn, chỉ tiến trình.
2. Các quy tắc gộp ở mục 5.
3. Sửa lời hứa quyền riêng tư như trên.
