import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BoltIcon, FlameIcon, HandIcon, HeartIcon, LabIcon, PlayIcon, ShieldLockIcon, SparkleIcon } from '@/components/ui/Icons';
import { vi } from '@/i18n/vi';
import { MarketingLayout } from './MarketingLayout';

const POINT_ICONS = [HandIcon, ShieldLockIcon, LabIcon] as const;

const PREVIEW_ITEMS = [
  { symbol: 'A', kind: 'Tĩnh', isNumber: false, tip: 'Nắm tay gọn, ngón cái áp sát cạnh ngón trỏ.' },
  { symbol: 'J', kind: 'Động', isNumber: false, tip: 'Giơ ngón út, kéo xuống rồi hất cong vẽ nét móc chữ J.' },
  { symbol: 'Z', kind: 'Động', isNumber: false, tip: 'Giơ ngón trỏ, vẽ đường ziczac ngang → chéo xuống → ngang.' },
  { symbol: '0', kind: 'Tĩnh', isNumber: true, tip: 'Khép cong các đầu ngón chạm ngón cái tạo vòng tròn số 0.' },
  { symbol: '5', kind: 'Tĩnh', isNumber: true, tip: 'Xòe rộng cả 5 ngón tay hướng về trước.' },
  { symbol: '10', kind: 'Động', isNumber: true, tip: 'Giơ ngón cái lên và lắc nhẹ cổ tay qua lại để tạo số 10.' },
] as const;

/** Page 1 of the 3-page pre-app website: Hero with live interactive SignLingo preview + 3 highlights. */
export function Landing({ onStart }: { onStart: () => void }) {
  const t = vi.landing;
  const [selected, setSelected] = useState(0);
  const current = PREVIEW_ITEMS[selected];

  return (
    <MarketingLayout onStart={onStart} activeHome>
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-12 sm:px-6 sm:py-16">
        {/* Hero */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
          <div className="flex flex-col items-start gap-5 text-left">
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-brand-200 bg-surface px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-brand-fg shadow-[0_2px_0_var(--brand-100)]">
              <SparkleIcon className="size-3.5 text-brand-500" />
              26 chữ cái A–Z · Số 0–10 · Realtime
            </div>

            <h1 className="text-4xl font-black leading-[1.12] tracking-tight text-text sm:text-5xl lg:text-6xl">
              <span className="sr-only">{t.hero}: </span>
              Học ngôn ngữ ký hiệu vui như chơi game cùng{' '}
              <span className="text-brand-fg">{vi.appName}</span>
            </h1>

            <p className="max-w-xl text-lg font-bold leading-relaxed text-text-muted">
              {t.tagline} {t.scope}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-3.5">
              <Button size="lg" onClick={onStart}>
                <PlayIcon className="size-4" />
                {t.start}
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link to="/features">Khám phá tính năng →</Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-sm font-bold text-text-muted">
              <span>✓ Không cần tài khoản</span>
              <span>✓ Không gửi ảnh lên máy chủ</span>
              <Link to="/lab" className="font-extrabold text-brand-fg underline underline-offset-4 hover:text-brand-700">
                {t.lab}
              </Link>
            </div>
          </div>

          {/* Interactive Live App Preview Mockup */}
          <div className="relative">
            <div className="rounded-[2rem] border-2 border-brand-200 bg-surface p-5 shadow-(--card-shadow-hover) sm:p-6">
              {/* Mock app top bar */}
              <div className="flex items-center justify-between gap-3 border-b-2 border-border pb-4">
                <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-surface-2 p-0.5">
                  <div className="progress-fill h-full w-3/4 rounded-full" />
                </div>
                <div className="flex items-center gap-2 text-xs font-extrabold tabular-nums">
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-bg/70 px-2.5 py-1 text-warning-fg">
                    <FlameIcon className="size-3.5 text-streak" />7
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-heart">
                    <HeartIcon className="size-3.5" />5
                  </span>
                </div>
              </div>

              {/* Interactive letter stage */}
              <div className="mt-5 flex flex-col items-center gap-4 text-center">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-brand-50 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-brand-fg">
                    Xem thử thao tác {current.isNumber ? `số ${current.symbol}` : `chữ ${current.symbol}`}
                  </span>
                  {current.kind === 'Động' && (
                    <span className="btn-pink rounded-full px-2.5 py-0.5 text-[11px] font-extrabold text-ink-on-pink shadow-none">
                      Động
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center gap-5">
                  <div className="unit-banner flex size-28 items-center justify-center rounded-3xl text-6xl font-black text-ink-on-pink sm:size-32">
                    {current.symbol}
                  </div>
                  <div className="flex size-28 items-center justify-center rounded-3xl border-2 border-brand-200 bg-brand-50 p-3 sm:size-32">
                    <img
                      src={current.isNumber ? `/media/numbers/asl_number_${current.symbol}.svg` : `/media/letters/${current.symbol}.svg`}
                      alt={`Minh họa bàn tay ${current.isNumber ? `số ${current.symbol}` : `chữ ${current.symbol}`}`}
                      className="size-full object-contain"
                    />
                  </div>
                </div>

                <p className="min-h-10 max-w-xs text-sm font-bold text-text-muted">{current.tip}</p>

                {/* Clickable symbol selector pills */}
                <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Chọn ký hiệu xem thử">
                  {PREVIEW_ITEMS.map((item, idx) => (
                    <button
                      key={item.symbol}
                      type="button"
                      onClick={() => setSelected(idx)}
                      aria-pressed={selected === idx}
                      className={`inline-flex size-11 cursor-pointer items-center justify-center rounded-2xl border-2 text-base font-black transition-[transform,background-color,border-color] duration-(--motion-fast) hover:-translate-y-0.5 ${
                        selected === idx
                          ? 'btn-pink border-brand-500 text-ink-on-pink shadow-none'
                          : 'border-border bg-surface text-text-muted hover:border-brand-300 hover:bg-brand-50 hover:text-brand-fg'
                      }`}
                    >
                      {item.symbol}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Core Highlights */}
        <section aria-labelledby="highlights-heading" className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 id="highlights-heading" className="text-2xl font-black tracking-tight text-text sm:text-3xl">
              Vì sao học ASL với {vi.appName} dễ duy trì mỗi ngày?
            </h2>
            <p className="max-w-xl text-text-muted">{t.cameraNote}</p>
          </div>
          <ul className="grid w-full gap-5 text-left sm:grid-cols-3">
            {t.points.map((p, i) => {
              const Icon = POINT_ICONS[i] ?? HandIcon;
              return (
                <li key={p.title}>
                  <Card className="flex h-full flex-col gap-3 p-6">
                    <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-fg">
                      <Icon className="size-6" />
                    </span>
                    <h3 className="text-lg font-black text-text">{p.title}</h3>
                    <p className="text-sm leading-relaxed text-text-muted">{p.text}</p>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Bottom Navigation Bridge to Page 2 & Page 3 */}
        <section className="unit-banner flex flex-col items-center justify-between gap-6 rounded-[2rem] px-6 py-8 text-center text-ink-on-pink sm:flex-row sm:px-10 sm:text-left">
          <div className="flex flex-col gap-1.5">
            <p className="inline-flex w-fit items-center gap-1.5 self-center rounded-full bg-surface/80 px-3 py-0.5 text-xs font-extrabold uppercase tracking-wider sm:self-start">
              <BoltIcon className="size-3.5 text-xp" />
              Sẵn sàng trong 10 giây
            </p>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Bắt đầu bài học chữ cái đầu tiên ngay hôm nay</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" variant="secondary" onClick={onStart}>
              <PlayIcon className="size-4" />
              Vào học ngay
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/how-it-works">Cách hoạt động →</Link>
            </Button>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
