import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { vi } from '@/i18n/vi';
import { useLearner } from '@/storage/useLearner';

/** First-visit welcome (docs/05 §4): what the app does, a privacy promise and a single START button. */
export function Landing({ onStart }: { onStart: () => void }) {
  const theme = useLearner((s) => s.settings.theme);
  const update = useLearner((s) => s.updateSettings);
  const t = vi.landing;
  return (
    <div className="min-h-dvh bg-bg text-text">
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-4 py-12 text-center">
        <div className="self-end"><ThemeToggle value={theme} onChange={(next) => update({ theme: next })} /></div>
        <h1 className="text-5xl font-extrabold text-brand-fg">
          <span className="sr-only">{t.hero}: </span>{vi.appName}
        </h1>
        <p className="max-w-xl text-xl text-text-muted">{t.tagline}</p>
        <ul className="grid w-full gap-4 text-left sm:grid-cols-3">
          {t.points.map((p) => (
            <li key={p.title}>
              <Card className="h-full">
                <p className="text-3xl" aria-hidden="true">{p.icon}</p>
                <h2 className="mt-2 font-extrabold">{p.title}</h2>
                <p className="mt-1 text-sm text-text-muted">{p.text}</p>
              </Card>
            </li>
          ))}
        </ul>
        <p className="max-w-xl text-text-muted">{t.scope}</p>
        <div className="flex flex-col items-center gap-3">
          <Button size="lg" onClick={onStart}>{t.start}</Button>
          <p className="text-sm text-text-muted">{t.cameraNote}</p>
          <Link to="/lab" className="font-bold text-brand-fg underline">{t.lab}</Link>
        </div>
      </main>
    </div>
  );
}
