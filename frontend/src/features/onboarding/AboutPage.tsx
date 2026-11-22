import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';
import { MarketingLayout } from './MarketingLayout';

const LEADER_EMAIL = 'hung.nguyen240919@vnuk.udn.vn';
const REPO_URL = 'https://github.com/Nyanta-dotcom/SignLingo';

const TEAM = [
  { name: 'Nguyễn Tuấn Hưng', id: '24090019', role: 'Trưởng nhóm; tài khoản và đồng bộ tiến độ (Supabase), bảng xếp hạng, triển khai Vercel, trang Giới thiệu & Liên hệ; quản lý mã nguồn' },
  { name: 'Nguyễn Hữu Triết', id: '24090003', role: 'Pipeline học máy: thu thập, tiền xử lý dữ liệu, huấn luyện và đánh giá mô hình nhận diện chữ cái' },
  { name: 'Trần Công Sanh', id: '24090009', role: 'Nhận diện thời gian thực trong trình duyệt: MediaPipe, ONNX Runtime, đo hiệu năng camera' },
  { name: 'Nguyễn Thảo Anh', id: '24090028', role: 'AI Lab (kết quả thí nghiệm), kiểm thử tự động; báo cáo và slide thuyết trình' },
  { name: 'Nguyễn Anh Dũng', id: '24090021', role: 'Thiết kế lại giao diện, các trang giới thiệu, nhận diện số 0–10 và ký hiệu động J, Z, âm thanh bài học' },
] as const;

const linkClass = 'font-bold text-brand-fg underline underline-offset-2 hover:text-brand-500';

/** Page 4 of the pre-app website: what SignLingo is, quick start, the team, privacy and contact. */
export function AboutPage({ onStart }: { onStart: () => void }) {
  return (
    <MarketingLayout onStart={onStart}>
      <div className="mx-auto flex max-w-4xl flex-col gap-12 px-4 py-12 sm:px-6 sm:py-16">
        <section className="flex flex-col gap-3">
          <h1 className="text-4xl font-black tracking-tight text-text sm:text-5xl">Về SignLingo</h1>
          <p className="text-pretty text-lg text-text-muted">
            SignLingo là ứng dụng web học bảng chữ cái ngôn ngữ ký hiệu Mỹ (ASL) theo kiểu Duolingo: bạn ra dấu trước webcam và AI chấm ngay trong trình duyệt.
          </p>
        </section>

        <section aria-labelledby="quick-title" className="flex flex-col gap-3">
          <h2 id="quick-title" className="text-2xl font-black text-text">Cách dùng nhanh</h2>
          <ol className="list-decimal space-y-2 pl-6 text-text marker:font-black marker:text-brand-fg">
            <li>Bấm <button type="button" onClick={onStart} className={linkClass}>Vào học</button> và chọn bài đầu tiên trên lộ trình.</li>
            <li>Cho phép trình duyệt dùng camera.</li>
            <li>Ra dấu chữ cái theo hình mẫu; AI báo đúng ngay khi nhận ra.</li>
            <li>Ôn lại ở mục Luyện và tra cứu ở Bảng chữ cái.</li>
            <li>Đăng nhập ở <Link to="/profile" className={linkClass}>Hồ sơ</Link> để lưu tiến độ giữa các thiết bị và tham gia bảng xếp hạng.</li>
          </ol>
        </section>

        <section aria-labelledby="team-title" className="flex flex-col gap-3">
          <h2 id="team-title" className="text-2xl font-black text-text">Nhóm phát triển</h2>
          <p className="text-text-muted">Đồ án cuối kỳ môn Nhập môn Trí tuệ nhân tạo (Introduction to AI), VNUK.</p>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs font-extrabold uppercase tracking-wider text-text-muted">
                <tr className="border-b-2 border-border">
                  <th scope="col" className="px-4 py-3">Thành viên</th>
                  <th scope="col" className="px-4 py-3">MSSV</th>
                  <th scope="col" className="px-4 py-3">Phụ trách</th>
                </tr>
              </thead>
              <tbody>
                {TEAM.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-b-0">
                    <td className="whitespace-nowrap px-4 py-3 font-extrabold text-text">{m.name}</td>
                    <td className="px-4 py-3 font-bold tabular-nums text-text">{m.id}</td>
                    <td className="px-4 py-3 text-text-muted">{m.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        <section aria-labelledby="privacy-title" className="flex flex-col gap-3">
          <h2 id="privacy-title" className="text-2xl font-black text-text">Quyền riêng tư</h2>
          <p className="text-text-muted">
            Hình ảnh camera được xử lý ngay trong trình duyệt và không rời khỏi máy. Khi chưa đăng nhập, tiến độ chỉ lưu trên trình duyệt này.
            Khi đăng nhập, chỉ tiến độ học (XP, chuỗi ngày, bài đã học, độ chính xác từng chữ) được lưu để đồng bộ. Bạn chỉ xuất hiện trên bảng xếp hạng nếu tự bật tham gia, với tên do bạn chọn.
          </p>
        </section>

        <section aria-labelledby="contact-title" className="flex flex-col gap-3">
          <h2 id="contact-title" className="text-2xl font-black text-text">Liên hệ</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="flex flex-col gap-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-text-muted">Email</span>
              <p className="break-words text-text">
                <a href={`mailto:${LEADER_EMAIL}`} className={linkClass}>{LEADER_EMAIL}</a> (Nguyễn Tuấn Hưng, trưởng nhóm)
              </p>
            </Card>
            <Card className="flex flex-col gap-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-text-muted">Mã nguồn GitHub</span>
              <a href={REPO_URL} target="_blank" rel="noreferrer" className={`break-words ${linkClass}`}>github.com/Nyanta-dotcom/SignLingo</a>
            </Card>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
