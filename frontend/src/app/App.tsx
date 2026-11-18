import { Navigate, Route, Routes, useNavigate } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Banners } from '@/features/onboarding/Banners';
import { Landing } from '@/features/onboarding/Landing';
import { Lab } from '@/features/lab/Lab';
import { Profile } from '@/features/profile/Profile';
import { Settings } from '@/features/settings/Settings';
import { Collect } from '@/features/collect/Collect';
import { Practice } from '@/features/practice/Practice';
import { Learn } from '@/features/learn/Learn';
import { Lesson, LessonDone } from '@/features/learn/Lesson';
import { Dictionary } from '@/features/dictionary/Dictionary';
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
  return <AppShell stats={{ streak: stats.current_streak, xp: stats.total_xp, hearts: stats.hearts }} banner={<Banners />} />;
}

/** First visit shows the welcome page; every later visit goes straight to the learning path. */
function Home() {
  const onboarded = useLearner((s) => s.onboarded);
  const complete = useLearner((s) => s.completeOnboarding);
  const navigate = useNavigate();
  if (onboarded) return <Navigate to="/learn" replace />;
  return <Landing onStart={() => { complete(); navigate('/learn'); }} />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route element={<ConnectedShell />}>
        <Route path="learn" element={<Learn />} />
        <Route path="lesson/:id" element={<Lesson />} />
        <Route path="lesson/:id/done" element={<LessonDone />} />
        <Route path="practice" element={<Practice />} />
        <Route path="collect" element={<Collect />} />
        <Route path="dictionary" element={<Dictionary />} />
        <Route path="lab" element={<Lab />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Placeholder title={vi.common.notFound} />} />
      </Route>
    </Routes>
  );
}
