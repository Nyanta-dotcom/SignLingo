import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCamera } from './useCamera';

const track = () => ({ stop: vi.fn() });
const streamOf = (t: ReturnType<typeof track>) => ({ getTracks: () => [t] });
const stub = (gum: unknown) => {
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: gum } });
  vi.stubGlobal('isSecureContext', true);
};

afterEach(() => vi.unstubAllGlobals());

describe('useCamera', () => {
  it('goes idle -> ready with the stream after start()', async () => {
    const t = track();
    stub(vi.fn().mockResolvedValue(streamOf(t)));
    const { result } = renderHook(() => useCamera());
    expect(result.current.status).toBe('idle');
    await act(() => result.current.start());
    expect(result.current.status).toBe('ready');
    expect(result.current.stream).not.toBeNull();
  });

  it('exposes the error code when permission is denied', async () => {
    stub(vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' })));
    const { result } = renderHook(() => useCamera());
    await act(() => result.current.start());
    expect(result.current.status).toBe('error');
    expect(result.current.error?.code).toBe('CAMERA_DENIED');
  });

  it('stops the tracks on stop() and on unmount', async () => {
    const t = track();
    stub(vi.fn().mockResolvedValue(streamOf(t)));
    const { result, unmount } = renderHook(() => useCamera());
    await act(() => result.current.start());
    act(() => result.current.stop());
    expect(t.stop).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('idle');

    const t2 = track();
    stub(vi.fn().mockResolvedValue(streamOf(t2)));
    const second = renderHook(() => useCamera());
    await act(() => second.result.current.start());
    second.unmount();
    expect(t2.stop).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('a stream that arrives after unmount is stopped immediately', async () => {
    const t = track();
    let resolve!: (s: unknown) => void;
    stub(vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    const { result, unmount } = renderHook(() => useCamera());
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.start();
    });
    unmount();
    resolve(streamOf(t));
    await waitFor(() => expect(t.stop).toHaveBeenCalled());
    await pending;
  });
});
