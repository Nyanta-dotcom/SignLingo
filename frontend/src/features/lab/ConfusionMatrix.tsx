import { vi } from '@/i18n/vi';

const CELL = 22;
const PAD = 28;

/** Row-normalised confusion matrix as SVG: rows = true letter, columns = predicted. Darker = a larger share of that row. */
export function ConfusionMatrix({ labels, matrix }: { labels: string[]; matrix: number[][] }) {
  const n = labels.length;
  const size = PAD + n * CELL;
  return (
    <svg role="img" aria-label={vi.lab.errors.matrixLabel} viewBox={`0 0 ${size} ${size}`} className="h-auto w-full max-w-[34rem]">
      {labels.map((l, i) => (
        <g key={l} className="fill-text-muted text-[10px] font-bold">
          <text x={PAD + i * CELL + CELL / 2} y={PAD - 8} textAnchor="middle">{l}</text>
          <text x={PAD - 8} y={PAD + i * CELL + CELL / 2 + 3} textAnchor="end">{l}</text>
        </g>
      ))}
      {matrix.map((row, i) =>
        row.map((v, j) => (
          <rect
            key={`${i}-${j}`} x={PAD + j * CELL} y={PAD + i * CELL} width={CELL - 1} height={CELL - 1} rx={2}
            fill={i === j ? 'var(--brand-500)' : 'var(--danger-fg)'} fillOpacity={Math.max(v, 0.04)}
            data-true={labels[i]} data-pred={labels[j]}
          >
            <title>{vi.lab.errors.cell(labels[i], labels[j], Math.round(v * 100))}</title>
          </rect>
        )),
      )}
    </svg>
  );
}
