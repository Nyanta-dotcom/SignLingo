import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initLearner } from '@/storage/useLearner';
import type { PerfRecord } from '@/storage/types';
import type { RecognitionEvent } from '@/vision/engine';
import type { EngineFactory } from '../practice/useRecognition';
import { LiveMonitor } from './LiveMonitor';

beforeAll(() => {
  initLearner({ heartThreshold: 0.6, appVersion: 'test' });
});

const LABELS = 'ABCDEFGHIKLMNOPQRSTUVWXY'.split('');
const perf = { processingFps: 29.5, frameMsP50: 12.3, frameMsP95: 20.1, mpMsP50: 8, clsMsP50: 0.8, backend: 'wasm', delegate: 'CPU', worker: false };
const record = (id: string): PerfRecord => ({
  id, recorded_at: '2026-01-01T00:00:00.000Z', duration_s: 60, model: { model_id: 'm', version: '1' }, backend: 'wasm', delegate: 'CPU',
  worker: false, camera: { width: 640, height: 480, fps_reported: 30 }, frame_ms: { p50: 12.3, p95: 20.1, max: 40 },
  mp_ms: { p50: 8, p95: 12 }, cls_ms: { p50: 0.8, p95: 1.2 }, processing_fps_avg: 29.5, dropped_frames: 0, user_agent: 't',
});

function setup() {
  let cb: ((e: RecognitionEvent) => void) | null = null;
  let finish: (r: PerfRecord) => void = () => {};
  const engine = {
    start: vi.fn(async (video: HTMLVideoElement) => { void video; }),
    stop: vi.fn(),
    subscribe: vi.fn((fn: (e: RecognitionEvent) => void) => { cb = fn; return () => { cb = null; }; }),
    getPerf: vi.fn(() => perf),
    recordBenchmark: vi.fn(() => new Promise<PerfRecord>((r) => { finish = r; })),
  };
  const factory: EngineFactory = async () => ({
    engine, recommended: { threshold: 0.6, hold_ms: 1000, smoothing_window: 5 }, model: { model_id: 'm', version: '1' },
  });
  const prediction = (): RecognitionEvent => ({
    type: 'prediction', label: 'C', confidence: 0.5,
    topK: LABELS.map((label, i) => ({ label, p: label === 'C' ? 0.5 : 0.5 / 23 + i * 0 })),
    hold: { state: 'idle', progress: 0 }, fingers: [], confusedWith: null,
  });
  return {
    engine, factory, finish: (r: PerfRecord) => act(() => finish(r)),
    emit: (e: RecognitionEvent) => act(() => cb?.(e)), prediction,
  };
}

let now = 0;
beforeEach(() => {
  now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) }, userAgent: 'test' });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const open = async (s: ReturnType<typeof setup>) => {
  render(<LiveMonitor factory={s.factory} />);
  fireEvent.click(screen.getByRole('button', { name: 'Bật camera' }));
  await screen.findByRole('button', { name: 'Tắt camera' });
  await waitFor(() => expect(s.engine.start).toHaveBeenCalled());
};

describe('LiveMonitor', () => {
  it('lists all 24 letters and shows the frame timings as text', async () => {
    const s = setup();
    await open(s);
    expect(screen.getByText('Chưa có số đo, hãy đưa tay vào khung.')).toBeInTheDocument();
    await s.emit(s.prediction());
    expect(within(screen.getByRole('list', { name: 'Xác suất của 24 chữ' })).getAllByRole('listitem')).toHaveLength(24);
    expect(screen.getByText('12.3 / 20.1 ms')).toBeInTheDocument();
    expect(screen.getByText('29.5')).toBeInTheDocument();
    expect(screen.getByText('wasm')).toBeInTheDocument();
    expect(screen.getByText(/CPU \(chạy trên luồng chính\)/)).toBeInTheDocument();
    expect(screen.getByText('Mốc 33 ms mỗi khung (≈ 30 FPS)')).toBeInTheDocument();
  });

  it('records 60 s, saves to history and offers the JSON file', async () => {
    const s = setup();
    await open(s);
    expect(screen.getByRole('button', { name: 'Ghi 60 giây' })).toBeDisabled();
    await s.emit({ type: 'ready', backend: 'wasm', delegate: 'CPU' });
    now = 1000;
    fireEvent.click(screen.getByRole('button', { name: 'Ghi 60 giây' }));
    expect(s.engine.recordBenchmark).toHaveBeenCalledWith(60);
    now = 21000;
    await s.emit(s.prediction());
    expect(screen.getByText('Đang ghi… còn 40 giây')).toBeInTheDocument();

    await s.finish(record('r-live-1'));
    expect(await screen.findByRole('status')).toHaveTextContent('Đã lưu lần đo');
    expect(screen.getByText(/29\.5 FPS, khung p50 12\.3 ms, p95 20\.1 ms, wasm\/CPU/)).toBeInTheDocument();

    let blob: Blob | null = null;
    vi.stubGlobal('URL', { createObjectURL: (b: Blob) => { blob = b; return 'blob:x'; }, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: 'Tải file JSON' }));
    expect(click).toHaveBeenCalledOnce();
    expect(blob).not.toBeNull();
  });

  it('discards a recording when the camera is turned off before it finishes', async () => {
    const s = setup();
    await open(s);
    await s.emit({ type: 'ready', backend: 'wasm', delegate: 'CPU' });
    fireEvent.click(screen.getByRole('button', { name: 'Ghi 60 giây' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tắt camera' }));
    await s.finish(record('r-live-2'));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText(/Đã lưu lần đo/)).toBeNull();
  });
});
