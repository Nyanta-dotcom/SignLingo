import type { CSSProperties } from 'react';

type Variant = 'marketing' | 'app';

const HAND_BONES: readonly [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

const HAND_JOINTS: readonly [number, number][] = [
  [120, 210],
  [88, 188], [64, 162], [48, 134], [38, 108],
  [92, 142], [86, 102], [82, 68], [78, 38],
  [116, 134], [116, 90], [116, 54], [116, 22],
  [140, 140], [146, 98], [150, 64], [154, 34],
  [160, 154], [172, 122], [180, 96], [186, 72],
];

const FLOATING_BADGES = [
  { symbol: 'A', pos: 'left-[3%] top-28', motion: 'float-slow' },
  { symbol: 'J', pos: 'right-[4%] top-44', motion: 'float-slow-reverse' },
  { symbol: 'Z', pos: 'left-[4%] top-[34rem]', motion: 'float-slow-reverse' },
  { symbol: '5', pos: 'right-[5%] top-[38rem]', motion: 'float-slow' },
] as const;

function HandConstellationSvg({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 230 240" fill="none" className={className} aria-hidden="true">
      {/* Dynamic J/Z gesture luminous flow arc */}
      <path
        d="M28 52 C70 18, 154 14, 196 58 C222 86, 206 140, 176 168"
        stroke="var(--brand-300)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="6 10"
        className="trail-dash opacity-65"
      />
      {HAND_BONES.map(([a, b], i) => (
        <line
          key={i}
          x1={HAND_JOINTS[a][0]}
          y1={HAND_JOINTS[a][1]}
          x2={HAND_JOINTS[b][0]}
          y2={HAND_JOINTS[b][1]}
          stroke="var(--brand-300)"
          strokeWidth="2.2"
          strokeLinecap="round"
          className="opacity-55"
        />
      ))}
      {HAND_JOINTS.map(([cx, cy], i) => (
        <g key={i}>
          {(i === 4 || i === 8 || i === 12 || i === 16 || i === 20 || i === 0) && (
            <circle
              cx={cx}
              cy={cy}
              r="7.5"
              fill="var(--brand-200)"
              className="keypoint-ping"
              style={{ '--kp-d': i % 6 } as CSSProperties}
            />
          )}
          <circle
            cx={cx}
            cy={cy}
            r={i === 0 ? 4.5 : 3.4}
            fill="var(--brand-500)"
            className="opacity-75"
          />
        </g>
      ))}
    </svg>
  );
}

/** SignLingo-themed decorative backdrop: landmark dot-grid, drifting rose orbs, and animated 21-keypoint hand constellations. */
export function AmbientBackdrop({ variant = 'marketing' }: { variant?: Variant }) {
  const isMarketing = variant === 'marketing';

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
      {/* Subtle computer-vision landmark calibration dot-grid */}
      <div className={`bg-landmark-grid absolute inset-0 ${isMarketing ? 'opacity-80' : 'opacity-45'}`} />

      {/* Drifting luminous rose-pink & warm blush aurora orbs */}
      <div
        className={`bg-orb-pink orb-float-1 absolute -top-28 right-[-8rem] rounded-full blur-2xl ${
          isMarketing ? 'size-[34rem] opacity-95' : 'size-[24rem] opacity-55'
        }`}
      />
      <div
        className={`bg-orb-rose orb-float-2 absolute left-[-10rem] top-[28%] rounded-full blur-2xl ${
          isMarketing ? 'size-[30rem] opacity-85' : 'size-[22rem] opacity-40'
        }`}
      />
      <div
        className={`bg-orb-warm orb-float-3 absolute bottom-[-8rem] right-[18%] rounded-full blur-2xl ${
          isMarketing ? 'size-[28rem] opacity-85' : 'size-[20rem] opacity-45'
        }`}
      />

      {/* Animated 21-keypoint ASL hand constellation watermarks */}
      <HandConstellationSvg
        className={`float-slow absolute right-2 top-16 rotate-12 ${
          isMarketing ? 'w-56 opacity-45 sm:w-72' : 'w-44 opacity-20 md:w-56'
        }`}
      />
      {isMarketing && (
        <HandConstellationSvg className="float-slow-reverse absolute bottom-10 left-2 hidden w-56 -rotate-12 opacity-35 lg:block" />
      )}

      {/* Floating translucent ASL letter/number badges on wide marketing screens */}
      {isMarketing &&
        FLOATING_BADGES.map((b) => (
          <div
            key={b.symbol}
            className={`${b.pos} ${b.motion} absolute hidden size-14 items-center justify-center rounded-2xl border-2 border-brand-200/75 bg-surface/75 text-xl font-black text-brand-fg/55 shadow-(--card-shadow) backdrop-blur-xs 2xl:flex`}
          >
            {b.symbol}
          </div>
        ))}
    </div>
  );
}
