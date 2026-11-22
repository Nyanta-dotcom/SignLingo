# Backend tùy chọn: tài khoản và đồng bộ tiến trình (Supabase)

Ứng dụng chạy đầy đủ không cần phần này. Khi cấu hình xong, trang **Hồ sơ** có thẻ **Tài khoản** để đăng nhập và đồng bộ tiến trình. Chỉ tiến trình học được lưu; không có hình camera hay dữ liệu bàn tay. Thiết kế và lý do nằm ở `docs/drafts/ADR_backend_sync_DRAFT.md`.

## Thiết lập (một lần, do chủ dự án làm)

1. Tạo dự án tại https://supabase.com (gói Free). Chọn vùng gần Việt Nam, ví dụ Singapore.
2. **SQL Editor → New query**, dán toàn bộ `supabase/migrations/0001_init.sql`, bấm **Run**. Chạy lại nhiều lần vẫn an toàn đối với bảng và hàm, nhưng chính sách (policy) sẽ báo trùng nếu đã tạo.
3. **Authentication → Providers**: bật **Email** (giữ "Confirm email" nếu muốn xác thực qua thư) và **Google** (cần tạo OAuth client trong Google Cloud Console; dán Client ID và Secret vào Supabase).
4. **Authentication → URL Configuration**: đặt **Site URL** là địa chỉ Vercel (ví dụ `https://sign-lingo-zeta.vercel.app`), thêm vào **Redirect URLs**: `https://sign-lingo-zeta.vercel.app/profile` và `http://localhost:5173/profile`.
5. **Project Settings → API**: lấy **Project URL** và khóa **anon public**.
6. Trên Vercel, **Settings → Environment Variables**, thêm cho Production và Preview:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = khóa anon public
   rồi **Redeploy**. Chạy cục bộ thì tạo `frontend/.env.local` với hai biến này (file bị git bỏ qua; xem `frontend/.env.example`).

**Tuyệt đối không** đưa khóa `service_role` vào repo, Vercel hay trình duyệt. Khóa `anon` công khai an toàn vì Row Level Security chặn truy cập chéo giữa người dùng.

## Kiểm tra sau khi thiết lập

- Hồ sơ hiện thẻ Tài khoản; đăng ký bằng email, đăng nhập, làm một bài, bấm "Đồng bộ ngay".
- Mở tab Table Editor của Supabase: bảng `user_backups` có một dòng của bạn.
- Đăng nhập trên trình duyệt khác: tiến trình xuất hiện.
- Thử đăng nhập bằng hai tài khoản và kiểm tra mỗi tài khoản không thấy dữ liệu của người kia.
