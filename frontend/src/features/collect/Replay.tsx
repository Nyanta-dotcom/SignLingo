import { useEffect, useRef } from 'react';
import { drawSkeleton, tokenColor } from '@/components/vision/overlay';
import type { HandFrame } from '@/vision/types';

const FPS = 15;

/** Loops a recorded take as a skeleton, mirrored like the camera, so the person can check it before keeping it. */
export function Replay({ frames, label }: { frames: HandFrame[]; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || frames.length === 0) return;
    const color = tokenColor('overlay-skeleton');
    let i = 0;
    const id = setInterval(() => {
      drawSkeleton(ctx, frames[i % frames.length].landmarks, { width: 320, height: 240, color, badColor: color });
      i += 1;
    }, 1000 / FPS);
    return () => clearInterval(id);
  }, [frames]);
  return <canvas ref={canvas} role="img" aria-label={label} width={320} height={240} className="aspect-[4/3] w-full max-w-xs -scale-x-100 rounded-[var(--radius-xl)] bg-surface-2" />;
}
