import { HAND_LETTERS } from '@/features/lesson/handArt';
import { HandIllustration } from '@/features/lesson/HandIllustration';

export function HandSheet() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, padding: 12, background: '#ffffff' }}>
      {HAND_LETTERS.map((l) => (
        <div key={l} style={{ textAlign: 'center', font: '700 20px sans-serif', color: '#111' }}>
          {l}
          <HandIllustration letter={l} />
        </div>
      ))}
    </div>
  );
}
