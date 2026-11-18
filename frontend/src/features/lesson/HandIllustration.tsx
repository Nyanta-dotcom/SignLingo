import { vi } from '@/i18n/vi';
import { CUFF, HAND_ART, type Layer } from './handArt';

const LINE = 'var(--skin-line)';
const SKIN = 'var(--skin)';
const OUTLINE = 6;

const path = (pts: ReadonlyArray<readonly [number, number]>) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

/** A shape drawn as a thick dark stroke with a thinner skin-coloured stroke on top: the cartoon outline. */
function Outlined({ d, w, fill = 'none', cuffColour = false }: { d: string; w: number; fill?: string; cuffColour?: boolean }) {
  const common = { fill, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <>
      <path d={d} {...common} stroke={LINE} strokeWidth={w + OUTLINE} />
      <path d={d} {...common} stroke={cuffColour ? 'var(--brand-600)' : SKIN} strokeWidth={w} />
    </>
  );
}

function Piece({ layer }: { layer: Layer }) {
  if (layer.kind === 'palm') return <rect x="58" y="118" width="84" height="98" rx="30" fill={SKIN} stroke={LINE} strokeWidth={OUTLINE} />;
  if (layer.kind === 'ring') return <ellipse cx={layer.cx} cy={layer.cy} rx={layer.rx} ry={layer.ry} fill="none" stroke={LINE} strokeWidth={layer.w + OUTLINE} />;
  if (layer.kind === 'arc') return <Outlined d={layer.d} w={layer.w} />;
  return <Outlined d={path(layer.pts)} w={layer.w ?? 20} />;
}

/** Cartoon drawing of the hand for a letter (original art, see handArt.ts). Renders nothing for an unknown letter. */
export function HandIllustration({ letter, className = '' }: { letter: string; className?: string }) {
  const art = HAND_ART[letter];
  if (!art) return null;
  return (
    <svg role="img" aria-label={vi.lesson.cardImageAlt(letter)} viewBox="0 0 200 260" className={`hand-illustration ${className}`}>
      <g transform={`translate(100 150) rotate(${art.rotate ?? 0}) scale(${art.scale ?? 1}) translate(-100 -150)`}>
        <Outlined d={path(CUFF.pts)} w={CUFF.w} cuffColour />
        {art.layers.map((layer, i) => (
          <Piece key={i} layer={layer} />
        ))}
        {art.layers.filter((l) => l.kind === 'ring').map((l, i) => (
          l.kind === 'ring' && <ellipse key={`r${i}`} cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry} fill="none" stroke={SKIN} strokeWidth={l.w} />
        ))}
      </g>
    </svg>
  );
}
