# Backend tùy chọn: tài khoản và đồng bộ tiến trình (Supabase)

Ứng dụng chạy đầy đủ không cần phần này. Khi cấu hình xong: có trang **`/login`**, nút **Đăng nhập** / menu tài khoản ở thanh trên, thẻ **Tài khoản** trên trang Hồ sơ, và **bảng xếp hạng** (`/leaderboard`, thẻ Tham gia trên Hồ sơ). Chỉ tiến trình học được lưu; không có hình camera hay dữ liệu bàn tay. Thiết kế và lý do nằm ở `docs/drafts/ADR_backend_sync_DRAFT.md`.

## Thiết lập (một lần, do chủ dự án làm)

1. Tạo dự án tại https://supabase.com (gói Free). Chọn vùng gần Việt Nam, ví dụ Singapore.
2. **SQL Editor → New query**, dán toàn bộ `supabase/migrations/0001_init.sql`, bấm **Run**. Sau đó làm tương tự với `supabase/migrations/0002_leaderboard.sql` (bảng xếp hạng). Chạy lại nhiều lần vẫn an toàn đối với bảng và hàm, nhưng chính sách (policy) có thể báo trùng nếu đã tạo.
3. **Authentication → Providers**: bật **Email**. "Confirm email" hiện đang **tắt** để thử nhanh; bật lại kèm SMTP riêng trước khi có người dùng thật (thư mặc định của Supabase bị giới hạn số lượng). **Google** là tùy chọn và hiện chưa bật (cần OAuth client trong Google Cloud Console).
4. **Authentication → URL Configuration**: đặt **Site URL** là địa chỉ production `https://signlingo-vn.vercel.app`, thêm vào **Redirect URLs**: `https://signlingo-vn.vercel.app/profile` và địa chỉ chạy cục bộ, ví dụ `http://localhost:5173/profile` (thư xác nhận và đăng nhập Google quay về `/profile`).
5. **Project Settings → API**: lấy **Project URL** và khóa công khai (**anon public** hoặc **publishable**, dạng `sb_publishable_…`).
6. Trên Vercel, **Settings → Environment Variables**, thêm cho Production và Preview:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = khóa anon public
   - `VITE_SUPABASE_GOOGLE` = `true` chỉ sau khi Google đã bật ở bước 3 (không đặt thì nút Google ẩn, chỉ đăng nhập bằng email)
   rồi **Redeploy**. Chạy cục bộ thì tạo `frontend/.env.local` với hai biến này (file bị git bỏ qua; xem `frontend/.env.example`).

**Tuyệt đối không** đưa khóa `service_role` hay `sb_secret_…` vào repo, Vercel hay trình duyệt. Khóa `anon` công khai an toàn vì Row Level Security chặn truy cập chéo giữa người dùng.

## Kiểm tra sau khi thiết lập

- Thanh trên hiện nút Đăng nhập; vào `/login`, đăng ký bằng email, đăng nhập, làm một bài, bấm "Đồng bộ ngay" ở Hồ sơ.
- Mở tab Table Editor của Supabase: bảng `user_backups` có một dòng của bạn.
- Đăng nhập trên trình duyệt khác: tiến trình xuất hiện.
- Thử đăng nhập bằng hai tài khoản và kiểm tra mỗi tài khoản không thấy dữ liệu của người kia.
- Bảng xếp hạng: ở Hồ sơ bật tham gia với một tên hiển thị, mở `/leaderboard` và thấy tên mình gắn nhãn "Bạn"; tài khoản chưa tham gia không xuất hiện; mở `/leaderboard` khi chưa đăng nhập thì không thấy bảng.
