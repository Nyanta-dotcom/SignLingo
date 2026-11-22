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
        <section className="hero-enter mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-brand-200 bg-surface px-4 py-1 text-xs font-extrabold uppercase tracking-widest text-brand-fg">
            <SparkleIcon className="size-3.5 text-brand-500" />
            Tính năng nổi bật
          </span>
          <h1 className="text-balance text-4xl font-black tracking-tight text-text sm:text-5xl">
            Học bài bản theo lộ trình, luyện tập trực tiếp trước webcam
          </h1>
          <p className="text-pretty text-lg text-text-muted">
            Kết hợp trải nghiệm game hóa quen thuộc của Duolingo với nhận diện bàn tay thời gian thực ngay trong trình duyệt.
          </p>
        </section>

        {/* Feature 1: Duolingo Skill Tree */}
        <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <Card className="flex flex-col items-center gap-5 border-brand-200 p-6 sm:p-8">
            <div className="unit-banner flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left text-ink-on-pink">
              <div>
                <p className="w-fit rounded-full bg-surface/75 px-2.5 py-0.5 text-[11px] font-extrabold uppercase">Cấp 1 · Lộ trình</p>
                <p className="mt-1 text-lg font-black">Bảng chữ cái ASL cơ bản</p>
              </div>
              <span className="rounded-full bg-surface/80 px-3 py-1 text-xs font-extrabold">1 / 6 bài</span>
            </div>
            <div className="flex items-center justify-center gap-4 py-2 sm:gap-6">
              <div className="flex flex-col items-center gap-1.5">
                <span className="flex size-16 items-center justify-center rounded-full border-4 border-success-fg bg-success-bg text-success-fg shadow-[0_4px_0_var(--border)]">
                  <StarIcon className="size-7" />
                </span>
                <span className="text-xs font-extrabold text-text">Bài 1: A B C D</span>
              </div>
              <span aria-hidden="true" className="h-1 w-6 rounded-full bg-brand-200" />
              <div className="flex flex-col items-center gap-1.5">
                <span className="node-available node-halo flex size-16 items-center justify-center rounded-full border-4 border-surface text-ink-on-pink">
                  <PlayIcon className="size-7" />
                </span>
                <span className="text-xs font-extrabold text-brand-fg">Bài 2: E F G H</span>
              </div>
              <span aria-hidden="true" className="h-1 w-6 rounded-full bg-border" />
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
              Chia nhỏ 26 chữ cái &amp; 11 chữ số (0–10) thành từng bài học ngắn
            </h2>
            <p className="leading-relaxed text-text-muted">
              Lộ trình gồm 3 cấp rõ ràng: <strong>Cấp 1</strong> (24 chữ cái tĩnh), <strong>Cấp 2</strong> (2 chữ động <strong>J &amp; Z</strong>), và <strong>Cấp 3</strong> (chữ số cơ bản <strong>0 – 10</strong>). Mỗi bài học kết hợp thẻ minh họa trực quan và thực hành ngay trước webcam.
            </p>
            <ul className="flex flex-col gap-2 text-sm font-bold text-text">
              <li>✓ Hệ thống tim, chuỗi ngày học và biểu đồ nhiệt 12 tuần</li>
              <li>✓ Lưu &amp; đồng bộ tiến độ, XP lên cơ sở dữ liệu khi đăng nhập</li>
              <li>✓ Nút thử lại ngay khi ra dấu chưa đúng &amp; hiệu ứng chúc mừng</li>
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
              Nhận diện chữ tĩnh, chữ số 0–10 và cử chỉ động J, Z, 10
            </h2>
            <p className="leading-relaxed text-text-muted">
              Khi bạn giơ tay trước webcam, hệ thống hiển thị vòng tiến độ giữ chữ, top 3 xác suất dự đoán và gợi ý chỉnh từng ngón tay theo thời gian thực. Với các ký hiệu động <strong>J</strong>, <strong>Z</strong> và số <strong>10</strong>, màn hình vẽ trực tiếp vệt sáng hồng theo đầu ngón tay.
            </p>
            <ul className="flex flex-col gap-2 text-sm font-bold text-text">
              <li>✓ Khung gợi ý cố định chống giật bố cục khi đang luyện</li>
              <li>✓ Tự cảnh báo các cặp chữ dễ nhầm lẫn</li>
              <li>✓ Chế độ Luyện tự do cho phép gõ từ bằng ngôn ngữ ký hiệu</li>
            </ul>
          </div>

          <Card className="order-1 relative flex flex-col items-center gap-4 overflow-hidden border-brand-200 p-6 sm:p-8 lg:order-2">
            {/* Animated AI vision scan beam */}
            <div aria-hidden="true" className="bg-scan-beam scan-beam pointer-events-none absolute inset-x-0 top-0 h-16" />

            <div className="relative z-10 flex items-center gap-5">
              <div className="node-halo flex size-28 items-center justify-center rounded-full border-8 border-brand-400 bg-surface text-5xl font-black text-text shadow-(--card-shadow)">
                Z
              </div>
              <div className="relative flex size-28 items-center justify-center rounded-3xl border-2 border-brand-200 bg-brand-50 p-3">
                <img src="/media/letters/Z.svg" alt="Minh họa chữ Z động" className="size-full object-contain" />
                <svg aria-hidden="true" viewBox="0 0 100 100" fill="none" className="pointer-events-none absolute inset-0 size-full">
                  <path
                    d="M22 24 H78 L24 76 H78"
                    stroke="var(--brand-500)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="10 8"
                    className="motion-arrow opacity-75"
                  />
                </svg>
              </div>
            </div>
            <div className="relative z-10 w-full max-w-xs space-y-2">
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
            <p className="relative z-10 w-full max-w-xs rounded-2xl border border-border bg-surface-2/80 px-3.5 py-2 text-center text-xs font-extrabold text-brand-fg">
              Giơ ngón trỏ, vẽ đường ziczac ngang → chéo xuống → ngang
            </p>
          </Card>
        </section>

        {/* Extra Feature Cards */}
        <section className="grid gap-5 sm:grid-cols-3">
          <Card className="group flex flex-col gap-3 p-6 hover:-translate-y-1.5 hover:border-brand-300 hover:shadow-(--card-shadow-hover)">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-fg transition-transform duration-(--motion-bounce) group-hover:-rotate-6 group-hover:scale-110">
              <HandIcon className="size-5" />
            </span>
            <h3 className="text-lg font-black">Luyện tự do không mất tim</h3>
            <p className="text-sm text-text-muted">Thoải mái ghép từ bằng 26 chữ cái ASL, bật/tắt khung xương bàn tay bất cứ lúc nào.</p>
          </Card>
          <Card className="group flex flex-col gap-3 p-6 hover:-translate-y-1.5 hover:border-brand-300 hover:shadow-(--card-shadow-hover)">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-fg transition-transform duration-(--motion-bounce) group-hover:-rotate-6 group-hover:scale-110">
              <AlphabetIcon className="size-5" />
            </span>
            <h3 className="text-lg font-black">Từ điển chữ cái &amp; chữ số trực quan</h3>
            <p className="text-sm text-text-muted">Tra cứu nhanh dáng tay chuẩn cho đủ 26 chữ A–Z và 11 chữ số 0–10 kèm hướng dẫn chi tiết.</p>
          </Card>
          <Card className="group flex flex-col gap-3 p-6 hover:-translate-y-1.5 hover:border-brand-300 hover:shadow-(--card-shadow-hover)">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-fg transition-transform duration-(--motion-bounce) group-hover:-rotate-6 group-hover:scale-110">
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
