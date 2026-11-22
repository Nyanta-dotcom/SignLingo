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

## Bảng xếp hạng (đã làm theo `supabase/migrations/0002_leaderboard.sql`)
- Bảng `public_profiles` chỉ chứa tên hiển thị và điểm: tổng XP, XP 7 ngày gần nhất, chuỗi ngày, số lượt thử và lượt đúng (chung và từng chữ). **Mặc định không hiện** (`show_on_leaderboard = false`); người dùng phải tự bật ở Hồ sơ và tự đặt tên hiển thị 2 đến 24 ký tự (không lấy từ email hay tên ở Cài đặt).
- Bốn bảng: Tuần này, Tổng XP, Chuỗi ngày, Độ chính xác (chung, hoặc riêng từng chữ). Độ chính xác cần tối thiểu 20 lượt thử cho bảng chung và 5 lượt cho một chữ, để một lần may mắn không đứng đầu. Hai ngưỡng này là lựa chọn thiết kế, không phải kết quả thí nghiệm.
- Điểm do trigger trong cơ sở dữ liệu sao chép từ bản sao lưu đã đồng bộ; trình duyệt không được ghi trực tiếp vào cột điểm. Khi người dùng bật tham gia, điểm lấy ngay từ bản sao lưu (ứng dụng đồng bộ trước khi bật). Số lượt đúng không bao giờ vượt số lượt thử.
- **Chỉ người đã đăng nhập** đọc được bảng (khách không đọc được); chỉ các dòng đã bật hiển thị. Email và mọi dữ liệu khác không bao giờ lộ.
- XP tuần là 7 ngày gần nhất tính tại lần đồng bộ cuối, nên chỉ làm mới khi người đó đồng bộ.
- **Giới hạn trung thực:** XP và số lượt đúng do trình duyệt báo lên, nên người cố tình sửa file đồng bộ vẫn có thể gian lận điểm. Không có backend tự chấm bài thì không tránh được. Hiện chỉ kiểm tra tính nhất quán (đúng không vượt thử); chưa giới hạn XP tăng mỗi ngày vì chưa có số liệu để chọn mức. Đủ dùng cho đồ án và bảng xếp hạng bạn bè.
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
