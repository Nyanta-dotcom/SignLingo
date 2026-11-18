/** Webcam access (docs/04 §5, §7): 640x480 video only, typed errors, always stoppable. */

export type CameraErrorCode = 'CAMERA_DENIED' | 'CAMERA_NOT_FOUND' | 'INSECURE_CONTEXT';

export class CameraError extends Error {
  constructor(
    readonly code: CameraErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CameraError';
  }
}

export async function openCamera({ deviceId }: { deviceId?: string } = {}): Promise<MediaStream> {
  if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new CameraError('INSECURE_CONTEXT', 'The camera needs HTTPS or localhost');
  }
  const video: MediaTrackConstraints = { width: { ideal: 640 }, height: { ideal: 480 } };
  if (deviceId) video.deviceId = { exact: deviceId };
  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio: false });
  } catch (e) {
    const name = (e as { name?: string }).name;
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new CameraError('CAMERA_DENIED', 'Camera permission was denied');
    if (name === 'NotFoundError' || name === 'OverconstrainedError') throw new CameraError('CAMERA_NOT_FOUND', 'No matching camera found');
    throw e;
  }
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((t) => t.stop());
}

export async function listCameras(): Promise<Array<{ deviceId: string; label: string }>> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'videoinput').map((d) => ({ deviceId: d.deviceId, label: d.label }));
}
