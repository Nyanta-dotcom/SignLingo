import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import curriculum from '@/content/curriculum.json';
import { loadCurriculum } from '@/content/loader';
import { initLearner } from '@/storage/useLearner';
import { SkillTree, type LearnData } from './SkillTree';

const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'public/models/landmark-mlp-ens5-1.0.0.manifest.json'), 'utf-8'));
const data: LearnData = {
  curriculum: loadCurriculum(curriculum, manifest.labels),
  model: { model_id: manifest.model_id, version: manifest.version },
};
const load = () => Promise.resolve(data);
const lessons = data.curriculum.units.flatMap((u) => u.lessons);

let store: ReturnType<typeof initLearner>;
beforeAll(() => {
  store = initLearner({ heartThreshold: 0.6, appVersion: 'test' });
});
beforeEach(() => store.getState().backup.clearAll());

const show = async () => {
  render(<MemoryRouter><SkillTree load={load} /></MemoryRouter>);
  return screen.findByRole('heading', { level: 2, name: data.curriculum.units[0].title });
};
const node = (i: number) => screen.getByRole('button', { name: new RegExp(`^${lessons[i].title}:`) });
const finish = (code: string) => {
  const a = store.getState();
  const s = a.startSession({ mode: 'lesson', lesson_code: code, model: data.model });
  a.recordAttempt(s.id, { item_order: 1, position: null, expected: 'A', predicted: 'A', confidence: 0.9, result: 'correct', time_to_verify_ms: 900, retries: 0, confused_with: null });
  a.completeSession(s.id, { xpReward: 10 });
};

describe('SkillTree', () => {
  it('shows every lesson of the curriculum in order, opening lessons without prerequisites', async () => {
    await show();
    expect(screen.getAllByRole('listitem')).toHaveLength(lessons.length);
    lessons.forEach((l, i) => {
      expect(node(i)).toHaveAttribute('data-status', l.requires.length === 0 ? 'available' : 'locked');
    });
    expect(screen.getByRole('button', { name: `${lessons[0].title}: sẵn sàng` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `${lessons[1].title}: chưa mở` })).toBeInTheDocument();
  });

  it('opens the next lesson once the previous one is completed', async () => {
    finish(lessons[0].code);
    await show();
    expect(node(0)).toHaveAttribute('data-status', 'completed');
    expect(node(1)).toHaveAttribute('data-status', 'available');
    expect(node(2)).toHaveAttribute('data-status', 'locked');
  });

  it('shows details and a start link for an open lesson, closes with Escape', async () => {
    await show();
    fireEvent.click(node(0));
    const card = screen.getByRole('group', { name: `Chi tiết ${lessons[0].title}` });
    expect(card).toHaveTextContent(`${lessons[0].items.length} bài tập`);
    expect(card).toHaveTextContent(`+${lessons[0].xp_reward} XP`);
    expect(within(card).getByRole('link', { name: 'Bắt đầu' })).toHaveAttribute('href', `/lesson/${lessons[0].code}`);
    expect(node(0)).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(card, { key: 'Escape' });
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('explains a locked lesson instead of offering to start it', async () => {
    await show();
    fireEvent.click(node(3));
    const card = screen.getByRole('group', { name: `Chi tiết ${lessons[3].title}` });
    expect(card).toHaveTextContent('Hoàn thành bài trước để mở bài này.');
    expect(within(card).queryByRole('link')).toBeNull();
  });

  it('offers to redo a completed lesson', async () => {
    finish(lessons[0].code);
    await show();
    fireEvent.click(node(0));
    expect(screen.getByRole('link', { name: 'Học lại' })).toBeInTheDocument();
  });

  it('shows the daily goal progress and the model in use', async () => {
    await show();
    expect(screen.getByRole('progressbar', { name: 'Mục tiêu hôm nay' })).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText(`${manifest.model_id} ${manifest.version}`)).toBeInTheDocument();
    finish(lessons[0].code);
    const xp = Object.values(store.getState().daily)[0]?.xp_earned ?? 0;
    expect(xp).toBeGreaterThan(0);
  });

  it('reports a load failure in an alert', async () => {
    render(<MemoryRouter><SkillTree load={vi.fn().mockRejectedValue(new Error('x'))} /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được lộ trình học.');
  });
});
