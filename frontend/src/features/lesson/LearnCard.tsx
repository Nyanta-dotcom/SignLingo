import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Sign } from '@/content/types';
import { vi } from '@/i18n/vi';
import { HandIllustration } from './HandIllustration';

const TILE = 'flex size-52 items-center justify-center rounded-[var(--radius-2xl)] sm:size-60';

/** Introduces a letter: the letter and the hand that makes it, as two tiles of the same size. */
export function LearnCard({ letter, sign, onNext }: { letter: string; sign?: Sign; onNext: () => void }) {
  const t = vi.lesson;
  const image = sign?.media?.find((m) => m.type === 'image');
  const isDynamic = sign?.kind === 'dynamic';
  return (
    <Card className="col-span-full flex flex-col items-center gap-6 px-5 py-10 text-center sm:py-12">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <h1 className="rounded-full border border-brand-200 bg-brand-50 px-5 py-1.5 text-sm font-extrabold uppercase tracking-widest text-brand-fg">
          {t.cardTitle(letter)}
        </h1>
        {isDynamic && (
          <span className="btn-pink rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-ink-on-pink shadow-none">
            {vi.alphabet.dynamicBadge}
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-8">
        <p aria-label={t.cardLetter} className={`${TILE} unit-banner text-9xl font-black leading-none text-ink-on-pink sm:text-[8rem]`}>
          {letter}
        </p>
        <span aria-hidden="true" className="flex items-center text-4xl font-black text-brand-400 sm:h-60">=</span>
        <div className={`${TILE} border-2 border-brand-200 bg-brand-50 p-4`}>
          {image ? (
            <img src={image.src} alt={t.cardImageAlt(letter)} className="size-full object-contain" />
          ) : (
            <HandIllustration letter={letter} className="size-full" />
          )}
        </div>
      </div>

      <p className="max-w-md text-lg text-text-muted">
        {isDynamic ? (t.dynamicHint[letter] ?? t.cardText) : t.cardText}
      </p>
      <Button size="lg" onClick={onNext}>{t.next}</Button>
    </Card>
  );
}
