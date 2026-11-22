import type { Sign } from '@/content/types';
import { vi } from '@/i18n/vi';
import { HandIllustration } from './HandIllustration';

/** A small picture of the hand for a letter, shown next to the letter while the camera is on. */
export function ReferenceHand({ letter, sign }: { letter: string; sign?: Sign }) {
  const t = vi.lesson;
  if (!letter) return null;
  const image = sign?.media?.find((m) => m.type === 'image');
  return (
    <figure className="flex flex-col items-center gap-1.5">
      <div className="flex size-36 items-center justify-center rounded-3xl border-2 border-brand-200 bg-brand-50 p-2.5 shadow-(--card-shadow) sm:size-44">
        {image ? (
          <img src={image.src} alt={t.cardImageAlt(letter)} className="size-full object-contain" />
        ) : (
          <HandIllustration letter={letter} className="size-full" />
        )}
      </div>
      <figcaption className="text-xs font-extrabold text-text-muted">{t.referenceCaption}</figcaption>
    </figure>
  );
}
