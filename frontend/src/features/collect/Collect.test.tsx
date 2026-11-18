import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validateLandmarkCapture } from '@/storage/validate';
import type { HandFrame } from '@/vision/types';
import type { EngineFactory } from '../practice/useRecognition';
import { Collect } from './Collect';

const hand = (): HandFrame => ({
  landmarks: Array.from({ length: 21 }, (_, i) => ({ x: 0.2 + i * 0.01, y: 0.3 + i * 0.01, z: 0 })),
  handedness: 'Right', score: 0.9, timestampMs: 0,
});

function setup() {
  let push: (f: HandFrame | null) => void = () => {};
  const engine = { start: vi.fn(async (video: HTMLVideoElement) => { void video; }), stop: vi.fn(), subscribe: vi.fn(() => () => {}) };
  const factory: EngineFactory = async ({ onFrame }) => {
    push = onFrame;
    return { engine, recommended: { threshold: 0.6, hold_ms: 1000, smoothing_window: 5 }, model: { model_id: 'm', version: '1' } };
  };
  return { factory, frame: (f: HandFrame | null) => act(() => push(f)) };
}

let now = 0;
beforeEach(() => {
  now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('isSecureContext', true);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) }, userAgent: 'test' });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const labels = ['A', 'B', 'C'];
const startCamera = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Bật camera' }));
  await screen.findByRole('button', { name: 'Tắt camera' });
};

describe('Collect', () => {
  it('states the privacy promise and starts with nothing to download', () => {
    render(<Collect factory={setup().factory} labels={labels} />);
    expect(screen.getByText(/không lưu ảnh hay video/)).toBeInTheDocument();
    expect(screen.getByText('Chưa ghi chữ nào')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải file JSON' })).toBeDisabled();
  });

  it('rejects a signer code that is not S01, S02, …', () => {
    render(<Collect factory={setup().factory} labels={labels} />);
    fireEvent.change(screen.getByLabelText(/Mã người ra dấu/), { target: { value: 'Nguyen' } });
    expect(screen.getByRole('alert')).toHaveTextContent('S01');
    fireEvent.change(screen.getByLabelText(/Mã người ra dấu/), { target: { value: 'S01' } });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('counts down, records 40 frames with a hand, and downloads a file that matches the schema', async () => {
    const s = setup();
    render(<Collect factory={s.factory} labels={labels} />);
    fireEvent.change(screen.getByLabelText(/Mã người ra dấu/), { target: { value: 'S02' } });
    await startCamera();
    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    now = 0;
    fireEvent.click(screen.getByRole('button', { name: 'Ghi chữ B' }));
    await waitFor(() => expect(screen.getByText(/Chuẩn bị… 3/)).toBeInTheDocument());

    now = 1000;
    await s.frame(hand());
    expect(screen.getByText(/Chuẩn bị… 2/)).toBeInTheDocument();
    now = 3000;
    await s.frame(null);
    expect(screen.getByText(/Đang ghi 0\/40 khung/)).toBeInTheDocument();
    for (let i = 0; i < 40; i += 1) {
      now = 3100 + i;
      await s.frame(hand());
    }
    expect(screen.getByLabelText('40 khung')).toBeInTheDocument();
    expect(screen.getByText('Đã ghi 1/3 chữ, 40 khung')).toBeInTheDocument();

    let blob: Blob | null = null;
    vi.stubGlobal('URL', { createObjectURL: (b: Blob) => { blob = b; return 'blob:x'; }, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: 'Tải file JSON' }));
    expect(click).toHaveBeenCalledOnce();
    const text = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsText(blob as unknown as Blob);
    });
    const doc = JSON.parse(text);
    expect(validateLandmarkCapture(doc)).toEqual({ ok: true });
    expect(doc.signer_id).toBe('S02');
    expect(doc.samples).toHaveLength(1);
    expect(doc.samples[0].sign_code).toBe('LETTER_B');
    expect(doc.samples[0].frames).toHaveLength(40);
  });

  it('cancelling a take records nothing', async () => {
    const s = setup();
    render(<Collect factory={s.factory} labels={labels} />);
    fireEvent.change(screen.getByLabelText(/Mã người ra dấu/), { target: { value: 'S01' } });
    await startCamera();
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ghi chữ A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hủy lần ghi' }));
    now = 5000;
    await s.frame(hand());
    expect(screen.getByText('Chưa ghi chữ nào')).toBeInTheDocument();
  });
});
