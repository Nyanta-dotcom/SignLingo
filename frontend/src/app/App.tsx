import { Navigate, Route, Routes } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Practice } from '@/features/practice/Practice';
import { vi } from '@/i18n/vi';
import { useLearner } from '@/storage/useLearner';

function Placeholder({ title }: { title: string }) {
  return (
    <section>
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="mt-2 text-text-muted">{vi.common.comingSoon}</p>
    </section>
  );
}

function Settings() {
  const theme = useLearner((s) => s.settings.theme);
  const update = useLearner((s) => s.updateSettings);
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">{vi.nav.settings}</h1>
      <ThemeToggle value={theme} onChange={(t) => update({ theme: t })} />
    </section>
  );
}

function ConnectedShell() {
  const stats = useLearner((s) => s.stats);
  return <AppShell stats={{ streak: stats.current_streak, xp: stats.total_xp, hearts: stats.hearts }} />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<ConnectedShell />}>
        <Route index element={<Navigate to="/learn" replace />} />
        <Route path="learn" element={<Placeholder title={vi.nav.learn} />} />
        <Route path="practice" element={<Practice />} />
        <Route path="dictionary" element={<Placeholder title={vi.nav.dictionary} />} />
        <Route path="lab" element={<Placeholder title={vi.nav.lab} />} />
        <Route path="profile" element={<Placeholder title={vi.nav.profile} />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Placeholder title={vi.common.notFound} />} />
      </Route>
    </Routes>
  );
}
