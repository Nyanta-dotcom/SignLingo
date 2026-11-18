import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Curriculum, Item, Lesson } from '@/content/types';
import { lessonStatus } from '@/game/unlock';
import { initLearner } from '@/storage/useLearner';
import type { RecognitionEvent } from '@/vision/engine';
import type { EngineFactory } from '../practice/useRecognition';
import type { LearnData } from '../skill-tree/SkillTree';
import { LessonPlayer } from './LessonPlayer';

let store: ReturnType<typeof initLearner>;
beforeAll(() => {
  store = initLearner({ heartThreshold: 0.6, appVersion: 'test' });
});
beforeEach(() => {
  store.getState().backup.clearAll();
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) }, userAgent: 'test' });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const item = (order: number, type: Item['type'], letter: string): Item => ({ order, type, sign_code: `LETTER_${letter}` });
const lesson = (code: string, items: Item[], requires: string[] = []): Lesson => ({ code, title: `Bài ${code}`, order: 1, xp_reward: 10, requires, items });
const dataFor = (...lessons: Lesson[]): LearnData => ({
  curriculum: { schema_version: 1, units: [{ code: 'U', level: 1, title: 'U', order: 1, lessons }], signs: [] } as Curriculum,
  model: { model_id: 'm', version: '1' },
});

function setup() {
  let cb: ((e: RecognitionEvent) => void) | null = null;
  const engine = {
    start: vi.fn(async (video: HTMLVideoElement) => { void video; }),
    stop: vi.fn(),
    subscribe: vi.fn((fn: (e: RecognitionEvent) => void) => { cb = fn; return () => { cb = null; }; }),
    setTarget: vi.fn(),
  };
  const factory: EngineFactory = async () => ({
    engine, recommended: { threshold: 0.6, hold_ms: 1000, smoothing_window: 5 }, model: { model_id: 'm', version: '1' },
  });
  return { engine, factory, emit: (e: RecognitionEvent) => act(() => cb?.(e)) };
}
const prediction = (label: string, progress = 0, confidence = 0.9): RecognitionEvent => ({
  type: 'prediction', label, confidence, topK: [{ label, p: confidence }, { label: 'B', p: 0.05 }, { label: 'C', p: 0.03 }],
  hold: { state: 'holding', progress }, fingers: [], confusedWith: null,
});
const verified = (label: string): RecognitionEvent => ({ type: 'verified', label, timeToVerifyMs: 1500 });
const timedOut = (target: string, lastConfidence: number | null = 0.9): RecognitionEvent => ({ type: 'timed_out', target, lastLabel: 'O', lastConfidence });

const open = (d: LearnData, code: string, s = setup()) => {
  render(
    <MemoryRouter initialEntries={[`/lesson/${code}`]}>
      <Routes>
        <Route path="/lesson/:code" element={<LessonPlayer load={() => Promise.resolve(d)} factory={s.factory} />} />
        <Route path="/learn" element={<p>Lộ trình</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return s;
};
const startCamera = async (s: ReturnType<typeof setup>) => {
  fireEvent.click(await screen.findByRole('button', { name: 'Bật camera' }));
  await waitFor(() => expect(s.engine.start).toHaveBeenCalled());
  await s.emit({ type: 'ready', backend: 'wasm', delegate: 'CPU' });
};

describe('LessonPlayer', () => {
  it('shows a learn card, then asks for the camera before the first sign', async () => {
    const d = dataFor(lesson('L1', [item(1, 'learn_card', 'A'), item(2, 'perform_sign', 'A')]));
    open(d, 'L1');
    expect(await screen.findByLabelText('Chữ cái cần học')).toHaveTextContent('A');
    expect(screen.getByRole('progressbar', { name: 'Tiến độ bài học' })).toHaveAttribute('aria-valuenow', '0');
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    expect(screen.getByText('Bật camera để ra dấu')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Tiến độ bài học' })).toHaveAttribute('aria-valuenow', '1');
  });

  it('plays a lesson: verified sign, a timed-out sign that costs a heart, then the result screen', async () => {
    const d = dataFor(lesson('L1', [item(1, 'perform_sign', 'A'), item(2, 'perform_sign', 'B')]));
    const s = open(d, 'L1');
    await startCamera(s);
    await waitFor(() => expect(s.engine.setTarget).toHaveBeenCalledWith('A', { holdMs: 1000, threshold: 0.6, timeLimitMs: 15000 }));
    await s.emit(prediction('A', 0.5));
    expect(screen.getByRole('progressbar', { name: 'Tiến độ giữ chữ' })).toHaveAttribute('aria-valuenow', '50');

    await s.emit(verified('A'));
    expect(screen.getByRole('status')).toHaveTextContent('Chính xác!');
    expect(store.getState().stats.hearts).toBe(5);
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await waitFor(() => expect(s.engine.setTarget).toHaveBeenCalledWith('B', expect.any(Object)));

    await s.emit(timedOut('B', 0.9));
    expect(screen.getByRole('status')).toHaveTextContent('Chưa đúng');
    expect(screen.getByRole('status')).toHaveTextContent('Mất 1 tim');
    expect(store.getState().stats.hearts).toBe(4);
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));

    expect(await screen.findByRole('heading', { name: 'Hoàn thành bài học!' })).toBeInTheDocument();
    const rec = store.getState().progress.L1;
    expect(rec.status).toBe('completed');
    expect(rec.best_accuracy_pct).toBe(50);
    expect(screen.getByText('Chính xác').nextElementSibling).toHaveTextContent('50%');
    expect(screen.getByText('XP').nextElementSibling).toHaveAttribute('aria-label', String(Object.values(store.getState().daily)[0].xp_earned));
    expect(screen.getByText(/B \(1 lần\)/)).toBeInTheDocument();
    expect(lessonStatus(d.curriculum.units[0].lessons[0], store.getState().progress)).toBe('completed');
  });

  it('does not take a heart when the model was unsure (low confidence at the timeout)', async () => {
    const d = dataFor(lesson('L1', [item(1, 'perform_sign', 'A'), item(2, 'learn_card', 'B')]));
    const s = open(d, 'L1');
    await startCamera(s);
    await s.emit(timedOut('A', 0.3));
    expect(screen.getByRole('status')).toHaveTextContent('Chưa đúng');
    expect(screen.getByRole('status')).not.toHaveTextContent('Mất 1 tim');
    expect(store.getState().stats.hearts).toBe(5);
  });

  it('skips a sign without a verification and keeps going', async () => {
    const d = dataFor(lesson('L1', [item(1, 'perform_sign', 'A'), item(2, 'perform_sign', 'B')]));
    const s = open(d, 'L1');
    await startCamera(s);
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua' }));
    expect(screen.getByRole('status')).toHaveTextContent('Đã bỏ qua');
    expect(s.engine.setTarget).toHaveBeenLastCalledWith(null);
    expect(store.getState().stats.hearts).toBe(5);
  });

  it('ends the lesson when the hearts run out', async () => {
    const d = dataFor(lesson('L1', Array.from({ length: 6 }, (_, i) => item(i + 1, 'perform_sign', 'A'))));
    const s = open(d, 'L1');
    await startCamera(s);
    for (let i = 0; i < 4; i += 1) {
      await s.emit(timedOut('A', 0.9));
      fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
      await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    }
    await s.emit(timedOut('A', 0.9));
    expect(await screen.findByText(/Hết tim!/)).toBeInTheDocument();
    expect(store.getState().stats.hearts).toBe(0);
    expect(store.getState().progress.L1).toBeUndefined();
  });

  it('asks before leaving and abandons the lesson without XP or progress', async () => {
    const d = dataFor(lesson('L1', [item(1, 'perform_sign', 'A'), item(2, 'perform_sign', 'B')]));
    const s = open(d, 'L1');
    await startCamera(s);
    await s.emit(verified('A'));
    fireEvent.click(screen.getByRole('button', { name: 'Thoát bài học' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('không được lưu');
    fireEvent.click(screen.getByRole('button', { name: 'Ở lại' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Thoát bài học' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thoát' }));
    expect(await screen.findByText('Lộ trình')).toBeInTheDocument();
    expect(store.getState().progress.L1).toBeUndefined();
    expect(store.getState().stats.total_xp).toBe(0);
  });

  it('leaving before any attempt leaves no session behind', async () => {
    const d = dataFor(lesson('L1', [item(1, 'learn_card', 'A'), item(2, 'perform_sign', 'A')]));
    open(d, 'L1');
    await screen.findByLabelText('Chữ cái cần học');
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Thoát' }));
    expect(await screen.findByText('Lộ trình')).toBeInTheDocument();
    expect(Object.keys(store.getState().progress)).toEqual([]);
  });

  it('refuses a locked lesson', async () => {
    const locked = dataFor(lesson('L1', [item(1, 'learn_card', 'A')]), lesson('L2', [item(1, 'learn_card', 'B')], ['L1']));
    open(locked, 'L2');
    expect(await screen.findByText(/chưa mở/)).toBeInTheDocument();
  });

  it('reports an unknown lesson', async () => {
    open(dataFor(lesson('L1', [item(1, 'learn_card', 'A')])), 'NOPE');
    expect(await screen.findByText('Không tìm thấy bài học này.')).toBeInTheDocument();
  });

  it('does not let a lesson start with no hearts, but points to free practice', async () => {
    const d = dataFor(lesson('L1', Array.from({ length: 5 }, (_, i) => item(i + 1, 'perform_sign', 'A'))));
    const first = open(d, 'L1');
    await startCamera(first);
    for (let i = 0; i < 4; i += 1) {
      await first.emit(timedOut('A', 0.9));
      fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    }
    await first.emit(timedOut('A', 0.9));
    await screen.findByText(/Hết tim!/);
    cleanup();
    open(d, 'L1');
    expect(await screen.findByText(/Bạn hết tim rồi/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Luyện tự do' })).toHaveAttribute('href', '/practice');
  });
});
