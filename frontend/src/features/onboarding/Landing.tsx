import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BrandMark, HandIcon, LabIcon, PlayIcon, ShieldLockIcon } from '@/components/ui/Icons';
import { vi } from '@/i18n/vi';

const POINT_ICONS = [HandIcon, ShieldLockIcon, LabIcon] as const;

/** First-visit welcome: clean white & luminous rose-pink hero with privacy promise and START CTA. */
export function Landing({ onStart }: { onStart: () => void }) {
  const t = vi.landing;
  return (
    <div className="hero-backdrop min-h-dvh bg-bg text-text">
      <main className="mx-auto flex max-w-4xl flex-col items-center gap-10 px-4 py-14 text-center sm:py-20">
        <div className="flex flex-col items-center gap-5">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-brand-200 bg-surface/90 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-brand-fg shadow-[0_2px_0_var(--brand-100)]">
            <span className="size-2 rounded-full bg-brand-500" aria-hidden="true" />
            ASL · AI Realtime
          </div>

          <div className="flex items-center justify-center gap-3.5">
            <BrandMark className="size-14 rounded-3xl" />
            <h1 className="text-4xl font-black tracking-tight text-text sm:text-6xl">
              <span className="sr-only">{t.hero}: </span>
              <span className="text-brand-fg">{vi.appName}</span>
            </h1>
          </div>

          <p className="max-w-xl text-lg font-bold leading-relaxed text-text-muted sm:text-xl">{t.tagline}</p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3.5">
            <Button size="lg" onClick={onStart}>
              <PlayIcon className="size-4" />
              {t.start}
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/lab">{t.lab}</Link>
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t.cameraNote}</p>
        </div>

        <ul className="grid w-full gap-4 text-left sm:grid-cols-3">
          {t.points.map((p, i) => {
            const Icon = POINT_ICONS[i] ?? HandIcon;
            return (
              <li key={p.title}>
                <Card className="flex h-full flex-col gap-3 p-6">
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-fg">
                    <Icon className="size-6" />
                  </span>
                  <h2 className="text-lg font-extrabold text-text">{p.title}</h2>
                  <p className="text-sm leading-relaxed text-text-muted">{p.text}</p>
                </Card>
              </li>
            );
          })}
        </ul>

        <p className="max-w-xl rounded-full border-2 border-border bg-surface px-5 py-2.5 text-sm font-bold text-text-muted shadow-[0_2px_0_var(--border)]">
          {t.scope}
        </p>
      </main>
    </div>
  );
}
