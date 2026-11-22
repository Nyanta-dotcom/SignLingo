import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Sign } from '@/content/types';
import { loadLearnData, type LearnData } from '@/features/skill-tree/SkillTree';
import { HandIllustration } from '@/features/lesson/HandIllustration';
import { vi } from '@/i18n/vi';

const imageOf = (sign: Sign) => sign.media?.find((m) => m.type === 'image');

function Hand({ sign, className }: { sign: Sign; className: string }) {
  const image = imageOf(sign);
  return image
    ? <img src={image.src} alt={vi.lesson.cardImageAlt(sign.gloss)} className={`${className} object-contain`} />
    : <HandIllustration letter={sign.gloss} className={className} />;
}

/** One letter: the letter, the standard handshape large, the picture's source, and links to its neighbours and to practice. */
function LetterDetail({ signs, letter }: { signs: Sign[]; letter: string }) {
  const t = vi.alphabet;
  const i = signs.findIndex((s) => s.gloss === letter);
  if (i < 0) return <p role="alert" className="font-bold">{t.unknown(letter)}</p>;
  const sign = signs[i];
  const image = imageOf(sign);
  const prev = signs[i - 1];
  const next = signs[i + 1];
  return (
    <Card className="flex flex-col items-center gap-6 px-4 py-8 text-center">
      <Link to="/alphabet" className="self-start text-sm font-bold text-brand-fg underline">← {t.back}</Link>
      <h1 className="rounded-full bg-brand-50 px-5 py-1.5 text-sm font-extrabold uppercase tracking-widest text-brand-700">{vi.lesson.cardTitle(letter)}</h1>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
        <p aria-hidden="true" className="flex size-40 items-center justify-center rounded-[var(--radius-2xl)] bg-brand-600 text-8xl font-extrabold text-text-on-brand shadow-[0_6px_0_var(--brand-700)]">{letter}</p>
        <figure className="flex flex-col items-center gap-2">
          <div className="flex size-64 items-center justify-center rounded-[var(--radius-2xl)] border-2 border-brand-200 bg-brand-50 p-4 sm:size-72">
            <Hand sign={sign} className="size-full" />
          </div>
          <figcaption className="max-w-72 text-xs text-text-muted">{image ? vi.lesson.cardImageCredit(image.attribution, image.license) : vi.lesson.cardArtCredit}</figcaption>
        </figure>
      </div>
      <p className="max-w-md text-text-muted">{t.howTo}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {prev && <Button variant="secondary" asChild><Link to={`/alphabet/${prev.gloss}`} aria-label={t.prev(prev.gloss)}>← {prev.gloss}</Link></Button>}
        <Button asChild><Link to="/practice">{t.practice}</Link></Button>
        {next && <Button variant="secondary" asChild><Link to={`/alphabet/${next.gloss}`} aria-label={t.next(next.gloss)}>{next.gloss} →</Link></Button>}
      </div>
    </Card>
  );
}

/** The alphabet: every letter the app teaches, each opening the standard handshape for that letter. */
export function Alphabet({ load = loadLearnData }: { load?: () => Promise<LearnData> }) {
  const t = vi.alphabet;
  const { letter } = useParams();
  const [signs, setSigns] = useState<Sign[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    load()
      .then((d) => live && setSigns([...d.curriculum.signs].filter((s) => s.kind === 'static').sort((a, b) => a.gloss.localeCompare(b.gloss))))
      .catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [load]);

  const status = failed
    ? <p role="alert" className="font-bold text-danger-on-bg">{t.loadError}</p>
    : !signs && <p>{vi.common.loading}</p>;
  if (letter && signs) return <section className="mx-auto max-w-3xl"><LetterDetail signs={signs} letter={letter.toUpperCase()} /></section>;

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-4">
      <h1 className="text-3xl font-extrabold">{t.title}</h1>
      <p className="text-text-muted">{t.intro}</p>
      {status}
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {(signs ?? []).map((s) => (
          <li key={s.code}>
            <Link
              to={`/alphabet/${s.gloss}`}
              aria-label={t.open(s.gloss)}
              className="flex flex-col items-center gap-1 rounded-[var(--radius-xl)] border-2 border-border bg-surface p-3 hover:border-brand-500 hover:bg-brand-50 focus-visible:border-brand-500"
            >
              <span aria-hidden="true" className="text-3xl font-extrabold">{s.gloss}</span>
              <Hand sign={s} className="size-20" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-text-muted">{t.notIncluded}</p>
    </section>
  );
}
