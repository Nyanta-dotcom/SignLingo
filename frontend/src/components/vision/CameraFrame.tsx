import { useEffect, type Ref } from 'react';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { vi } from '@/i18n/vi';

export type CameraFrameState = 'loading' | 'no_permission' | 'no_hand' | 'tracking' | 'verified' | 'error';

type Props = {
  state: CameraFrameState;
  stream?: MediaStream | null;
  progress?: number;
  message?: string;
  mirror?: boolean;
  announcement?: string;
  videoRef?: Ref<HTMLVideoElement>;
  canvasRef?: Ref<HTMLCanvasElement>;
  onGrant?: () => void;
  onRetry?: () => void;
};

const BORDER: Record<CameraFrameState, string> = {
  loading: 'border-border',
  no_permission: 'border-border',
  no_hand: 'border-warning-fg animate-pulse',
  tracking: 'border-brand-500',
  verified: 'border-success-fg',
  error: 'border-danger-fg',
};

/** Webcam view with overlay canvas and the six states of docs/05 §5.2. Every state also has a text cue. */
export function CameraFrame({
  state, stream = null, progress = 0, message, mirror = true, announcement = '', videoRef, canvasRef, onGrant, onRetry,
}: Props) {
  const flip = mirror ? '-scale-x-100' : '';
  const showVideo = state === 'tracking' || state === 'no_hand' || state === 'verified';

  useEffect(() => {
    if (!stream || typeof videoRef !== 'object' || !videoRef?.current) return;
    videoRef.current.srcObject = stream;
  }, [stream, videoRef]);

  return (
    <section
      role="region"
      aria-label={vi.camera.label}
      data-state={state}
      className={`relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-2xl)] border-4 bg-surface-2 ${BORDER[state]}`}
    >
      {showVideo && (
        <>
          <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 h-full w-full object-cover ${flip}`} />
          <canvas ref={canvasRef} width={640} height={480} className={`absolute inset-0 h-full w-full ${flip}`} />
        </>
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
        {state === 'loading' && (
          <>
            <p className="font-extrabold">{vi.camera.loading}</p>
            <ProgressBar value={Math.round(progress * 100)} label={vi.camera.loading} className="max-w-xs" />
          </>
        )}
        {state === 'no_permission' && (
          <>
            <p className="text-lg font-extrabold">{vi.camera.deniedTitle}</p>
            <p className="max-w-sm text-text-muted">{vi.camera.deniedHelp}</p>
            <Button onClick={onGrant}>{vi.camera.grant}</Button>
          </>
        )}
        {state === 'no_hand' && (
          <p className="rounded-full bg-surface px-4 py-2 font-extrabold text-warning-fg">
            <span aria-hidden="true">⚠ </span>
            <span>{vi.camera.noHand}</span>
          </p>
        )}
        {state === 'verified' && (
          <p className="rounded-full bg-success-bg px-4 py-2 font-extrabold text-success-fg">
            <span aria-hidden="true">✓ </span>
            <span>{vi.camera.verified}</span>
          </p>
        )}
        {state === 'error' && (
          <div role="alert" className="flex flex-col items-center gap-3">
            <p className="font-extrabold text-danger-fg">{message}</p>
            <Button variant="secondary" onClick={onRetry}>{vi.camera.retry}</Button>
          </div>
        )}
      </div>
      <p aria-live="polite" className="sr-only">{announcement}</p>
    </section>
  );
}
