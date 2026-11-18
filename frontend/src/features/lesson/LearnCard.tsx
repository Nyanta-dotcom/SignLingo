import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Sign } from '@/content/types';
import { vi } from '@/i18n/vi';
import { HandIllustration } from './HandIllustration';

const TILE = 'flex size-52 items-center justify-center rounded-[var(--radius-2xl)] sm:size-60';

/** Introduces a letter: the letter and the hand that makes it, as two tiles of the same size, with the picture's source. */
export function LearnCard({ letter, sign, onNext }: { letter: string; sign?: Sign; onNext: () => void }) {
  const t = vi.lesson;
  const image = sign?.media?.find((m) => m.type === 'image');
  return (
    <Card className="col-span-full flex flex-col items-center gap-6 px-4 py-10 text-center sm:py-12">
      <h1 className="rounded-full bg-brand-50 px-5 py-1.5 text-sm font-extrabold uppercase tracking-widest text-brand-700">{t.cardTitle(letter)}</h1>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-8">
        <p aria-label={t.cardLetter} className={`${TILE} bg-brand-600 text-9xl font-extrabold leading-none text-text-on-brand shadow-[0_6px_0_var(--brand-700)] sm:text-[8rem]`}>
          {letter}
        </p>
        <span aria-hidden="true" className="flex items-center text-4xl font-extrabold text-text-muted sm:h-60">=</span>
        <figure className="flex flex-col items-center gap-3">
          <div className={`${TILE} border-2 border-brand-200 bg-brand-50 p-4`}>
            {image ? (
              <img src={image.src} alt={t.cardImageAlt(letter)} className="size-full object-contain" />
            ) : (
              <HandIllustration letter={letter} className="size-full" />
            )}
          </div>
          <figcaption className="max-w-60 text-xs text-text-muted">
            {image ? t.cardImageCredit(image.attribution, image.license) : t.cardArtCredit}
          </figcaption>
        </figure>
      </div>

      <p className="max-w-md text-lg text-text-muted">{t.cardText}</p>
      <Button size="lg" onClick={onNext}>{t.next}</Button>
    </Card>
  );
}
