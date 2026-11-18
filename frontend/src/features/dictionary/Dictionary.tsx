import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';

const letters = 'ABCDEFGHIKLMNOPQRSTUVWXY'.split('');
export function Dictionary() {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => letters.filter((l) => l.includes(query.trim().toUpperCase())), [query]);
  return <section className="mx-auto max-w-6xl space-y-6">
    <header><p className="font-extrabold uppercase tracking-widest text-brand-fg">Tra cứu nhanh</p><h1 className="mt-1 text-4xl font-extrabold">Từ điển ký hiệu</h1><p className="mt-2 text-text-muted">Bảng chữ cái tĩnh ASL. J và Z cần chuyển động nên chưa nằm trong bộ nhận diện hiện tại.</p></header>
    <label className="block max-w-md"><span className="mb-2 block font-extrabold">Tìm chữ cái</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ví dụ: A" maxLength={1} className="min-h-12 w-full rounded-xl border-2 border-border bg-surface px-4 text-lg outline-none focus:border-brand-500" /></label>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{visible.map((letter, i) => <Card key={letter} className="flex min-h-48 flex-col items-center justify-center text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-4xl font-extrabold text-brand-900 dark:bg-surface-2 dark:text-brand-300">{letter}</div><h2 className="mt-3 text-lg font-extrabold">Chữ {letter}</h2><p className="text-sm text-text-muted">{i % 3 === 0 ? 'Giữ bàn tay ổn định trước camera' : i % 3 === 1 ? 'Đưa ngón cái và lòng bàn tay rõ vào khung' : 'Giữ dấu khoảng 1 giây để nhận diện'}</p></Card>)}</div>
    {visible.length === 0 && <Card className="text-center text-text-muted">Không tìm thấy chữ này trong bộ 24 chữ hiện hỗ trợ.</Card>}
    <Card className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-extrabold">Thử ra dấu ngay</h2><p className="text-sm text-text-muted">Luyện tự do với camera và xem AI dự đoán chữ nào.</p></div><Link to="/practice" className="rounded-2xl bg-brand-600 px-5 py-3 font-extrabold text-white shadow-[0_4px_0_var(--brand-700)]">Bắt đầu luyện</Link></Card>
  </section>;
}
