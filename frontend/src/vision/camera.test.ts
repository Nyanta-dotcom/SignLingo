import { afterEach, describe, expect, it, vi } from 'vitest';
import { CameraError, listCameras, openCamera, stopStream } from './camera';

const stubMedia = (getUserMedia: unknown, enumerateDevices?: unknown, secure = true) => {
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia, enumerateDevices } });
  vi.stubGlobal('isSecureContext', secure);
};
const named = (name: string) => Object.assign(new Error(name), { name });

afterEach(() => vi.unstubAllGlobals());

describe('openCamera', () => {
  it('asks for a 640x480 video-only stream, with the chosen device when given', async () => {
    const stream = { getTracks: () => [] };
    const gum = vi.fn().mockResolvedValue(stream);
    stubMedia(gum);
    expect(await openCamera({ deviceId: 'cam-2' })).toBe(stream);
    expect(gum).toHaveBeenCalledWith({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, deviceId: { exact: 'cam-2' } },
      audio: false,
    });
  });

  it('does not constrain the device when none is chosen', async () => {
    const gum = vi.fn().mockResolvedValue({});
    stubMedia(gum);
    await openCamera();
    expect(gum.mock.calls[0][0].video).toEqual({ width: { ideal: 640 }, height: { ideal: 480 } });
  });

  it.each([
    ['NotAllowedError', 'CAMERA_DENIED'],
    ['SecurityError', 'CAMERA_DENIED'],
    ['NotFoundError', 'CAMERA_NOT_FOUND'],
    ['OverconstrainedError', 'CAMERA_NOT_FOUND'],
  ])('%s becomes %s', async (name, code) => {
    stubMedia(vi.fn().mockRejectedValue(named(name)));
    await expect(openCamera()).rejects.toMatchObject({ code });
    await expect(openCamera()).rejects.toBeInstanceOf(CameraError);
  });

  it('reports an insecure context (plain http) without even asking the browser', async () => {
    const gum = vi.fn();
    stubMedia(gum, undefined, false);
    await expect(openCamera()).rejects.toMatchObject({ code: 'INSECURE_CONTEXT' });
    expect(gum).not.toHaveBeenCalled();
  });

  it('reports a browser without mediaDevices as an insecure context', async () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('isSecureContext', true);
    await expect(openCamera()).rejects.toMatchObject({ code: 'INSECURE_CONTEXT' });
  });
});

describe('stopStream and listCameras', () => {
  it('stops every track', () => {
    const a = { stop: vi.fn() };
    const b = { stop: vi.fn() };
    stopStream({ getTracks: () => [a, b] } as unknown as MediaStream);
    expect(a.stop).toHaveBeenCalled();
    expect(b.stop).toHaveBeenCalled();
  });

  it('lists only video inputs', async () => {
    stubMedia(vi.fn(), vi.fn().mockResolvedValue([
      { kind: 'videoinput', deviceId: 'a', label: 'Cam A' },
      { kind: 'audioinput', deviceId: 'm', label: 'Mic' },
    ]));
    expect(await listCameras()).toEqual([{ deviceId: 'a', label: 'Cam A' }]);
  });
});
