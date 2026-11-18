import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Sign } from '@/content/types';
import { vi } from '@/i18n/vi';

/** Introduces a letter: the big letter and, when the curriculum has one, a picture of the hand with its source. */
export function LearnCard({ letter, sign, onNext }: { letter: string; sign?: Sign; onNext: () => void }) {
  const t = vi.lesson;
  const image = sign?.media?.find((m) => m.type === 'image');
  return (
    <Card className="col-span-full flex flex-col items-center gap-4 py-10 text-center">
      <h1 className="text-2xl font-extrabold">{t.cardTitle(letter)}</h1>
      <div className="flex flex-wrap items-center justify-center gap-8">
        <p aria-label={t.cardLetter} className="text-9xl font-extrabold text-brand-fg">{letter}</p>
        {image && (
          <figure className="flex flex-col items-center gap-2">
            <img src={image.src} alt={t.cardImageAlt(letter)} className="h-56 w-auto rounded-[var(--radius-xl)] bg-white p-2" />
            <figcaption className="text-xs text-text-muted">{t.cardImageCredit(image.attribution, image.license)}</figcaption>
          </figure>
        )}
      </div>
      <p className="text-text-muted">{t.cardText}</p>
      <Button size="lg" onClick={onNext}>{t.next}</Button>
    </Card>
  );
}
