import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AlphabetIcon, BoltIcon, HandIcon, LabIcon, LockIcon, PlayIcon, SparkleIcon, StarIcon } from '@/components/ui/Icons';
import { MarketingLayout } from './MarketingLayout';

/** Page 2 of the 3-page pre-app website: Detailed Features with crafted UI mockups. */
export function FeaturesPage({ onStart }: { onStart: () => void }) {
  return (
    <MarketingLayout onStart={onStart}>
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-12 sm:px-6 sm:py-16">
        {/* Header */}
        <section className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-brand-200 bg-surface px-4 py-1 text-xs font-extrabold uppercase tracking-widest text-brand-fg">
            <SparkleIcon className="size-3.5 text-brand-500" />
            Tính năng nổi bật
          </span>
          <h1 className="text-4xl font-black tracking-tight text-text sm:text-5xl">
            Học bài bản theo lộ trình, luyện tập trực tiếp trước webcam
          </h1>
          <p className="text-lg text-text-muted">
            Kết hợp trải nghiệm game hóa quen thuộc của Duolingo với nhận diện bàn tay thời gian thực ngay trong trình duyệt.
          </p>
        </section>

        {/* Feature 1: Duolingo Skill Tree */}
        <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <Card className="flex flex-col items-center gap-5 border-brand-200 p-6 sm:p-8">
            <div className="unit-banner w-full rounded-2xl px-5 py-4 text-left text-ink-on-pink">
              <p className="w-fit rounded-full bg-surface/75 px-2.5 py-0.5 text-[11px] font-extrabold uppercase">Cấp 1 · Lộ trình</p>
              <p className="mt-1 text-lg font-black">Bảng chữ cái ASL cơ bản</p>
            </div>
            <div className="flex items-center justify-center gap-6 py-2">
              <div className="flex flex-col items-center gap-1.5">
                <span className="flex size-16 items-center justify-center rounded-full border-4 border-success-fg bg-success-bg text-success-fg shadow-[0_4px_0_var(--border)]">
                  <StarIcon className="size-7" />
                </span>
                <span className="text-xs font-extrabold text-text">Bài 1: A B C D</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="node-available flex size-16 items-center justify-center rounded-full border-4 border-surface text-ink-on-pink">
                  <PlayIcon className="size-7" />
                </span>
                <span className="text-xs font-extrabold text-brand-fg">Bài 2: E F G H</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="flex size-16 items-center justify-center rounded-full border-4 border-border bg-surface-2 text-text-muted">
                  <LockIcon className="size-6" />
                </span>
                <span className="text-xs font-extrabold text-text-muted">Bài 3: I K L M</span>
              </div>
            </div>
            <div className="w-full rounded-2xl bg-surface-2 p-3.5">
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="inline-flex items-center gap-1 text-text"><BoltIcon className="size-3.5 text-xp" />Mục tiêu hôm nay</span>
                <span className="text-brand-fg">15 / 20 XP</span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-surface">
                <div className="progress-fill h-full w-3/4 rounded-full" />
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <span className="w-fit rounded-full bg-brand-100 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-brand-fg">
              Lộ trình game hóa
            </span>
            <h2 className="text-3xl font-black tracking-tight text-text">
              Chia nhỏ 26 chữ cái thành từng bài học 2 phút
            </h2>
            <p className="leading-relaxed text-text-muted">
              Mỗi bài học giới thiệu 3–4 chữ cái kèm thẻ minh họa, sau đó chuyển ngay sang thực hành trước camera. Hoàn thành bài nhận XP, giữ chuỗi ngày học (streak), và mở khóa các bài nâng cao cùng chương riêng cho 2 chữ động <strong>J &amp; Z</strong>.
            </p>
            <ul className="flex flex-col gap-2 text-sm font-bold text-text">
              <li>✓ Hệ thống tim, chuỗi ngày học và biểu đồ nhiệt 12 tuần</li>
              <li>✓ Nút thử lại ngay khi ra dấu chưa đúng</li>
              <li>✓ Hiệu ứng pháo giấy &amp; âm thanh vui nhộn khi hoàn thành bài</li>
            </ul>
          </div>
        </section>

        {/* Feature 2: Real-time Vision & Dynamic J/Z */}
        <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="order-2 flex flex-col gap-4 lg:order-1">
            <span className="w-fit rounded-full bg-brand-100 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-brand-fg">
              Phản hồi từng ngón tay
            </span>
            <h2 className="text-3xl font-black tracking-tight text-text">
              Nhận diện cả chữ tĩnh lẫn chuyển động vẽ nét J &amp; Z
            </h2>
            <p className="leading-relaxed text-text-muted">
              Khi bạn giơ tay trước webcam, hệ thống hiển thị vòng tiến độ giữ chữ, top 3 xác suất dự đoán và gợi ý chỉnh từng ngón tay theo thời gian thực. Với chữ động <strong>J</strong> và <strong>Z</strong>, màn hình vẽ trực tiếp vệt sáng hồng theo đầu ngón tay để bạn kiểm soát nét vẽ.
            </p>
            <ul className="flex flex-col gap-2 text-sm font-bold text-text">
              <li>✓ Khung gợi ý cố định chống giật bố cục khi đang luyện</li>
              <li>✓ Tự cảnh báo các cặp chữ dễ nhầm lẫn</li>
              <li>✓ Chế độ Luyện tự do cho phép gõ từ bằng ngôn ngữ ký hiệu</li>
            </ul>
          </div>

          <Card className="order-1 flex flex-col items-center gap-4 border-brand-200 p-6 sm:p-8 lg:order-2">
            <div className="flex items-center gap-5">
              <div className="flex size-28 items-center justify-center rounded-full border-8 border-brand-400 bg-surface text-5xl font-black text-text shadow-(--card-shadow)">
                Z
              </div>
              <div className="flex size-28 items-center justify-center rounded-3xl border-2 border-brand-200 bg-brand-50 p-3">
                <img src="/media/letters/Z.svg" alt="Minh họa chữ Z động" className="size-full object-contain" />
              </div>
            </div>
            <div className="w-full max-w-xs space-y-2">
              {([['Z', '92%', 'w-[92%] progress-fill'], ['D', '6%', 'w-[12%] bg-brand-200'], ['I', '2%', 'w-[6%] bg-brand-200']] as const).map(([l, pct, cls]) => (
                <div key={l} className="flex items-center gap-2.5 text-xs font-extrabold">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-brand-100 text-brand-fg">{l}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className={`h-full rounded-full ${cls}`} />
                  </div>
                  <span className="w-9 text-right tabular-nums text-text-muted">{pct}</span>
                </div>
              ))}
            </div>
            <p className="w-full max-w-xs rounded-2xl border border-border bg-surface-2/80 px-3.5 py-2 text-center text-xs font-extrabold text-brand-fg">
              Giơ ngón trỏ, vẽ đường ziczac ngang → chéo xuống → ngang
            </p>
          </Card>
        </section>

        {/* Extra Feature Cards */}
        <section className="grid gap-5 sm:grid-cols-3">
          <Card className="flex flex-col gap-3 p-6">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-fg">
              <HandIcon className="size-5" />
            </span>
            <h3 className="text-lg font-black">Luyện tự do không mất tim</h3>
            <p className="text-sm text-text-muted">Thoải mái ghép từ bằng 26 chữ cái ASL, bật/tắt khung xương bàn tay bất cứ lúc nào.</p>
          </Card>
          <Card className="flex flex-col gap-3 p-6">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-fg">
              <AlphabetIcon className="size-5" />
            </span>
            <h3 className="text-lg font-black">Từ điển 26 chữ cái trực quan</h3>
            <p className="text-sm text-text-muted">Tra cứu nhanh dáng tay chuẩn cho đủ 26 chữ A–Z kèm hướng dẫn thao tác chi tiết.</p>
          </Card>
          <Card className="flex flex-col gap-3 p-6">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-fg">
              <LabIcon className="size-5" />
            </span>
            <h3 className="text-lg font-black">AI Lab minh bạch số liệu</h3>
            <p className="text-sm text-text-muted">Xem trực tiếp kết quả benchmark, ma trận nhầm lẫn và đo tốc độ FPS thật trên máy của bạn.</p>
          </Card>
        </section>

        {/* Bottom CTA */}
        <section className="flex flex-wrap items-center justify-center gap-4 rounded-3xl border-2 border-brand-200 bg-surface p-8 text-center shadow-(--card-shadow)">
          <div className="w-full">
            <h2 className="text-2xl font-black text-text">Muốn biết công nghệ AI bên dưới hoạt động thế nào?</h2>
          </div>
          <Button size="lg" onClick={onStart}>
            <PlayIcon className="size-4" />
            Bắt đầu học ngay
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/how-it-works">Xem Cách hoạt động →</Link>
          </Button>
        </section>
      </div>
    </MarketingLayout>
  );
}
