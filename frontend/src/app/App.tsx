import { Navigate, Route, Routes } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Lab } from '@/features/lab/Lab';
import { Profile } from '@/features/profile/Profile';
import { Settings } from '@/features/settings/Settings';
import { Collect } from '@/features/collect/Collect';
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
        <Route path="collect" element={<Collect />} />
        <Route path="dictionary" element={<Placeholder title={vi.nav.dictionary} />} />
        <Route path="lab" element={<Lab />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Placeholder title={vi.common.notFound} />} />
      </Route>
    </Routes>
  );
}
