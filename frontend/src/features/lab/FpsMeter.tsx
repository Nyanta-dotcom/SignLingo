import { vi } from '@/i18n/vi';
import type { PerfSnapshot } from '../practice/useRecognition';

const TARGET_MS = 33;
const SCALE_MS = 66;

const num = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '—');

/** Frame processing time with the 33 ms line (docs/05 §5.5). Every figure is also text. */
export function FpsMeter({ perf }: { perf: PerfSnapshot | null }) {
  const t = vi.lab.live;
  if (!perf) return <p className="text-text-muted">{t.waiting}</p>;
  const bar = (ms: number, color: string) => (
    <div className="relative h-3 rounded-full bg-surface-2" aria-hidden="true">
      <div className={`h-3 rounded-full ${color}`} style={{ width: `${Math.min(ms / SCALE_MS, 1) * 100}%` }} />
      <div className="absolute inset-y-0 border-l-2 border-dashed border-warning-fg" style={{ left: `${(TARGET_MS / SCALE_MS) * 100}%` }} />
    </div>
  );
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-extrabold">{t.meterTitle}</h3>
      <div>
        <p>{t.frame}: <strong>{num(perf.frameMsP50)} / {num(perf.frameMsP95)} ms</strong></p>
        {bar(perf.frameMsP95, perf.frameMsP95 <= 40 ? 'bg-success-fg' : 'bg-danger-fg')}
        <p className="mt-1 text-xs text-text-muted">{t.target}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-text-muted">{t.fps}</dt><dd className="font-bold">{num(perf.processingFps)}</dd>
        <dt className="text-text-muted">{t.mediapipe}</dt><dd className="font-bold">{num(perf.mpMsP50)} ms</dd>
        <dt className="text-text-muted">{t.classifier}</dt><dd className="font-bold">{num(perf.clsMsP50, 2)} ms</dd>
        <dt className="text-text-muted">{t.backend}</dt><dd className="font-bold">{perf.backend}</dd>
        <dt className="text-text-muted">{t.delegate}</dt><dd className="font-bold">{perf.delegate}{perf.worker ? '' : ` (${t.main})`}</dd>
      </dl>
    </div>
  );
}
