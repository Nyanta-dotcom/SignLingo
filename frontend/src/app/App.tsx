import { useEffect, useMemo, useRef } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Alphabet } from '@/features/alphabet/Alphabet';
import { LessonPlayer } from '@/features/lesson/LessonPlayer';
import { HandSheet } from '@/dev/HandSheet';
import { Banners } from '@/features/onboarding/Banners';
import { FeaturesPage } from '@/features/onboarding/FeaturesPage';
import { HowItWorksPage } from '@/features/onboarding/HowItWorksPage';
import { Landing } from '@/features/onboarding/Landing';
import { Lab } from '@/features/lab/Lab';
import { Profile } from '@/features/profile/Profile';
import { Settings } from '@/features/settings/Settings';
import { SkillTree } from '@/features/skill-tree/SkillTree';
import { Collect } from '@/features/collect/Collect';
import { Practice } from '@/features/practice/Practice';
import { vi } from '@/i18n/vi';
import { createSound } from '@/lib/sound';
import { attachUiSound } from '@/lib/uiSound';
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

/** Pre-app 3-page marketing routes. First visit to `/` shows Home; returning visits go straight to `/learn`. */
function useStartApp() {
  const complete = useLearner((s) => s.completeOnboarding);
  const navigate = useNavigate();
  return () => {
    complete();
    navigate('/learn');
  };
}

function Home() {
  const onboarded = useLearner((s) => s.onboarded);
  return <Landing onStart={useStartApp()} returning={onboarded} />;
}

function WelcomeRoute() {
  const onboarded = useLearner((s) => s.onboarded);
  return <Landing onStart={useStartApp()} returning={onboarded} />;
}

function FeaturesRoute() {
  return <FeaturesPage onStart={useStartApp()} />;
}

function HowItWorksRoute() {
  return <HowItWorksPage onStart={useStartApp()} />;
}

/** Plays subtle Duolingo-style pop/tick sounds on interactive clicks while sound is enabled. */
function useGlobalUiSound() {
  const soundOn = useLearner((s) => s.settings.sound_on);
  const enabledRef = useRef(soundOn);
  enabledRef.current = soundOn;
  const sound = useMemo(() => createSound({ enabled: () => enabledRef.current }), []);
  useEffect(() => attachUiSound((kind) => sound.play(kind)), [sound]);
}

export function AppRoutes() {
  useGlobalUiSound();
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="welcome" element={<WelcomeRoute />} />
      <Route path="features" element={<FeaturesRoute />} />
      <Route path="how-it-works" element={<HowItWorksRoute />} />
      {import.meta.env.DEV && <Route path="dev/hands" element={<HandSheet />} />}
      <Route path="lesson/:code" element={<LessonPlayer />} />
      <Route element={<ConnectedShell />}>
        <Route path="learn" element={<SkillTree />} />
        <Route path="practice" element={<Practice />} />
        <Route path="collect" element={<Collect />} />
        <Route path="alphabet" element={<Alphabet />} />
        <Route path="alphabet/:letter" element={<Alphabet />} />
        <Route path="dictionary" element={<Navigate to="/alphabet" replace />} />
        <Route path="lab" element={<Lab />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Placeholder title={vi.common.notFound} />} />
      </Route>
    </Routes>
  );
}
