import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';

const letters = ['A', 'B', 'C', 'D', 'E'];
export function Lesson() {
  const { id = 'alphabet' } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const current = letters[step];
  const finish = () => navigate(`/lesson/${id}/done`, { state: { xp: (step + 1) * 2, accuracy: 80 + step * 4 } });
  return <section className="mx-auto max-w-6xl space-y-5">
    <header className="flex items-center gap-4"><Link to="/learn" aria-label="Thoát bài học" className="rounded-xl border-2 border-border bg-surface px-4 py-2 font-extrabold">✕</Link><div className="flex-1"><ProgressBar value={Math.round(step / letters.length * 100)} label={`Tiến độ bài học: ${step}/${letters.length}`} /></div><span className="font-extrabold text-heart">♥ 5</span></header>
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <Card className="flex flex-col items-center justify-center text-center lg:min-h-[30rem]"><p className="font-extrabold uppercase tracking-widest text-brand-fg">Chữ {step + 1} / {letters.length}</p><div className="my-5 flex h-40 w-40 items-center justify-center rounded-full border-[10px] border-brand-200 bg-brand-50 text-8xl font-extrabold text-brand-900 dark:bg-surface-2 dark:text-brand-300">{current}</div><h1 className="text-2xl font-extrabold">Hãy ra dấu chữ {current}</h1><p className="mt-2 max-w-sm text-text-muted">Đưa bàn tay vào khung camera và giữ dấu ổn định để AI nhận diện.</p><button onClick={() => setShowHint(!showHint)} className="mt-5 font-extrabold text-brand-fg underline">{showHint ? 'Ẩn gợi ý' : 'Xem gợi ý'}</button>{showHint && <p className="mt-2 rounded-xl bg-surface-2 p-3 text-sm">💡 Để bàn tay thoải mái, các ngón rõ ràng và không bị cắt khỏi khung hình.</p>}</Card>
      <div className="space-y-4"><div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[28px] border-4 border-brand-500 bg-gradient-to-br from-slate-800 via-slate-900 to-brand-900 text-center text-white"><div className="absolute inset-5 rounded-[22px] border border-white/20"/><div className="relative"><div className="text-6xl">📷</div><h2 className="mt-3 text-xl font-extrabold">Khung camera</h2><p className="mt-1 text-sm text-white/75">Cho phép camera để nhận diện dấu tay</p><Button className="mt-4" onClick={() => navigate('/practice')}>Mở camera luyện tập</Button></div><span className="absolute bottom-4 right-4 rounded-full bg-surface px-3 py-2 font-extrabold text-text">AI đang chờ bàn tay</span></div>
        <Card><div className="flex items-center justify-between"><h2 className="font-extrabold">AI đang thấy chữ gì?</h2><span className="rounded-full bg-warning-fg/10 px-3 py-1 text-sm font-extrabold text-warning-fg">Chưa nhận diện</span></div><div className="mt-4 flex gap-2">{letters.slice(0, 3).map((l, i) => <div key={l} className="flex-1 rounded-xl bg-surface-2 p-3 text-center"><p className="font-extrabold">{l}</p><div className="mt-2 h-2 rounded-full bg-border"><div className="h-full rounded-full bg-brand-500" style={{ width: `${[12, 7, 4][i]}%` }}/></div><p className="mt-1 text-xs text-text-muted">{[12, 7, 4][i]}%</p></div>)}</div></Card></div>
    </div>
    <footer className="flex justify-between"><Button variant="secondary" onClick={() => step > 0 ? setStep(step - 1) : navigate('/learn')}>Quay lại</Button>{step < letters.length - 1 ? <Button onClick={() => setStep(step + 1)}>Tiếp theo</Button> : <Button variant="success" onClick={finish}>Hoàn thành</Button>}</footer>
  </section>;
}

export function LessonDone() {
  const { id = 'alphabet' } = useParams();
  const navigate = useNavigate();
  return <section className="mx-auto max-w-3xl py-8"><Card className="space-y-6 p-8 text-center"><div className="text-6xl" aria-hidden="true">🎉</div><p className="font-extrabold uppercase tracking-widest text-brand-fg">Bài học hoàn thành</p><h1 className="text-4xl font-extrabold">Tuyệt lắm! Bạn đã tiến bộ rồi</h1><p className="text-text-muted">Mỗi lần luyện tập giúp bạn nhớ dấu lâu hơn.</p><div className="grid grid-cols-3 gap-3">{[['⚡', '+10', 'XP nhận được'], ['🎯', '92%', 'Độ chính xác'], ['⏱', '02:40', 'Thời gian']].map(([icon, value, label]) => <div key={label} className="rounded-2xl bg-surface-2 p-4"><div className="text-2xl">{icon}</div><p className="text-2xl font-extrabold">{value}</p><p className="text-xs text-text-muted">{label}</p></div>)}</div><p className="rounded-xl bg-success-bg p-4 font-extrabold text-success-fg">🔥 Bạn đã hoàn thành mục tiêu học hôm nay!</p><div className="flex flex-wrap justify-center gap-3"><Button variant="secondary" onClick={() => navigate('/learn')}>Về lộ trình</Button><Button onClick={() => navigate(`/lesson/${id}`)}>Học lại</Button></div></Card></section>;
}
