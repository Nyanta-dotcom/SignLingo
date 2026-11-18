import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraError, openCamera, stopStream } from '@/vision/camera';

type Status = 'idle' | 'loading' | 'ready' | 'error';

/** Owns one camera stream; tracks are always stopped on stop() and on unmount (docs/05 §5.2). */
export function useCamera(deviceId?: string) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<CameraError | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const current = useRef<MediaStream | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopStream(current.current);
      current.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    stopStream(current.current);
    current.current = null;
    setStream(null);
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const s = await openCamera({ deviceId });
      if (!mounted.current) {
        stopStream(s);
        return;
      }
      stopStream(current.current);
      current.current = s;
      setStream(s);
      setStatus('ready');
    } catch (e) {
      if (!mounted.current) return;
      setError(e instanceof CameraError ? e : new CameraError('CAMERA_NOT_FOUND', (e as Error).message));
      setStatus('error');
    }
  }, [deviceId]);

  return { status, error, stream, start, stop };
}
