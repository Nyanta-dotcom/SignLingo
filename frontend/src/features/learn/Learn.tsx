import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useLearner } from '@/storage/useLearner';

const units = [
  { title: 'Bảng chữ cái', subtitle: 'Bắt đầu từ những dấu tay cơ bản', letters: ['A', 'B', 'C', 'D', 'E'], icon: '✋', tone: 'from-brand-600 to-sky-500', lesson: 'alphabet' },
  { title: 'Ghép chữ thành từ', subtitle: 'Luyện đánh vần tên và từ ngắn', letters: ['HELLO', 'NAME', 'YES'], icon: '🔤', tone: 'from-sky-500 to-brand-700', lesson: 'spelling', locked: true },
  { title: 'Từ vựng hàng ngày', subtitle: 'Những cụm từ thường dùng', letters: ['HELLO', 'THANK YOU', 'PLEASE'], icon: '💬', tone: 'from-brand-800 to-brand-600', lesson: 'vocabulary', locked: true },
];

export function Learn() {
  const xp = useLearner((s) => s.stats.total_xp);
  const goal = useLearner((s) => s.settings.daily_xp_goal);
  const progress = useLearner((s) => s.progress);
  const daily = useLearner((s) => s.daily);
  const today = new Date().toLocaleDateString('en-CA');
  const earned = daily[today]?.xp_earned ?? 0;
  return <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="font-extrabold uppercase tracking-widest text-brand-fg">Lộ trình của bạn</p><h1 className="mt-1 text-4xl font-extrabold">Học ký hiệu từng bước</h1><p className="mt-2 text-text-muted">Chọn một bài học và luyện cùng webcam.</p></div>
        <Link to="/dictionary" className="font-extrabold text-brand-fg underline">Tra cứu bảng chữ cái →</Link>
      </header>
      {units.map((unit, index) => {
        const done = progress[`unit-${index + 1}`]?.status === 'completed';
        return <section key={unit.lesson} aria-label={`Cấp ${index + 1}`}>
          <div className={`rounded-2xl bg-gradient-to-r ${unit.tone} p-5 text-white`}>
            <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-extrabold uppercase tracking-widest opacity-80">Cấp {index + 1} · {index === 0 ? 'Unit 1' : 'Unit '+(index+1)}</p><h2 className="text-2xl font-extrabold">{unit.title}</h2><p className="mt-1 opacity-90">{unit.subtitle}</p></div><span className="text-5xl" aria-hidden="true">{unit.icon}</span></div>
          </div>
          <Card className="mt-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-extrabold">{unit.letters.join(' · ')}</h3><p className="text-sm text-text-muted">{unit.locked ? 'Hoàn thành bài trước để mở khóa' : '5 dấu · khoảng 3 phút · +10 XP'}</p></div>
              {unit.locked ? <span className="rounded-full bg-surface-2 px-4 py-2 font-extrabold text-text-muted">🔒 Sắp mở</span> : <Button asChild><Link to={`/lesson/${unit.lesson}`}>{done ? 'Học lại' : 'Bắt đầu bài học'}</Link></Button>}
            </div>
            <div className="mt-5 flex flex-wrap gap-3" aria-label="Các chữ trong bài">{unit.letters.map((letter, i) => <div key={letter} className={`flex h-14 min-w-14 items-center justify-center rounded-2xl border-2 px-3 text-xl font-extrabold ${done || i < 2 ? 'border-success-fg bg-success-bg text-success-fg' : 'border-border bg-surface-2'}`} title={done || i < 2 ? 'Đã làm quen' : 'Chưa học'}>{letter}</div>)}</div>
          </Card>
        </section>;
      })}
    </div>
    <aside className="space-y-4">
      <Card><h2 className="text-lg font-extrabold">Mục tiêu hôm nay</h2><p className="mt-1 text-sm text-text-muted">Mỗi ngày một chút là tiến bộ.</p><div className="mt-4"><ProgressBar value={Math.min(100, Math.round(earned / goal * 100))} label={`${earned}/${goal} XP`} /></div><p className="mt-2 font-extrabold">{earned} / {goal} XP</p><p className="mt-3 text-sm text-text-muted">Tổng cộng {xp} XP</p></Card>
      <Card><h2 className="text-lg font-extrabold">Ôn lại bảng chữ cái</h2><p className="mt-1 text-sm text-text-muted">Luyện nhận diện tự do, không mất tim.</p><Link to="/practice" className="mt-4 inline-flex font-extrabold text-brand-fg underline">Mở luyện tự do →</Link></Card>
      <Card className="bg-brand-50 dark:bg-surface-2"><p className="text-2xl" aria-hidden="true">💡</p><h2 className="mt-2 font-extrabold">Mẹo nhỏ</h2><p className="mt-1 text-sm text-text-muted">Đưa cả bàn tay vào khung hình và giữ dấu ổn định để AI nhận diện chính xác hơn.</p></Card>
    </aside>
  </div>;
}
