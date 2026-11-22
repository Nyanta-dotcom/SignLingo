import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import curriculum from '@/content/curriculum.json';
import { loadCurriculum } from '@/content/loader';
import type { LearnData } from '@/features/skill-tree/SkillTree';
import { Alphabet } from './Alphabet';

const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'public/models/landmark-mlp-ens5-1.0.0.manifest.json'), 'utf-8'));
const data: LearnData = { curriculum: loadCurriculum(curriculum, manifest.labels), model: { model_id: manifest.model_id, version: manifest.version } };
const load = () => Promise.resolve(data);

const at = (path: string, loader: () => Promise<LearnData> = load) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="alphabet" element={<Alphabet load={loader} />} />
        <Route path="alphabet/:letter" element={<Alphabet load={loader} />} />
        <Route path="practice" element={<h1>Luyện tự do</h1>} />
      </Routes>
    </MemoryRouter>,
  );

describe('Alphabet', () => {
  it('lists all 26 ASL letters in order (24 static + dynamic J and Z)', async () => {
    at('/alphabet');
    expect(screen.getByRole('heading', { level: 1, name: 'Bảng chữ cái' })).toBeInTheDocument();
    const links = await screen.findAllByRole('link', { name: /^Xem thao tác chữ / });
    expect(links.map((l) => l.getAttribute('href')?.slice(-1)).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    expect(screen.getByText(/J và Z/)).toBeInTheDocument();
  });

  it('opens the standard handshape of a static letter, with its source and the neighbours', async () => {
    at('/alphabet');
    fireEvent.click(await screen.findByRole('link', { name: 'Xem thao tác chữ B' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Chữ B' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /chữ B/ })).toHaveAttribute('src', '/media/letters/B.svg');
    expect(screen.getByText(/Public domain/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Chữ sau: C' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Chữ C' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Chữ trước: B' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Chữ B' })).toBeInTheDocument();
  });

  it('opens dynamic letters J and Z with motion instructions and matching wpclipart SVG art', async () => {
    at('/alphabet/J');
    expect(await screen.findByRole('heading', { level: 1, name: 'Chữ J' })).toBeInTheDocument();
    expect(screen.getByText(/ngón út/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /chữ J/ })).toHaveAttribute('src', '/media/letters/J.svg');
    expect(screen.getByText(/Public domain/)).toBeInTheDocument();
  });

  it('has no previous link on the first letter and no next link on the last', async () => {
    at('/alphabet/A');
    await screen.findByRole('heading', { level: 1, name: 'Chữ A' });
    expect(screen.queryByRole('link', { name: /^Chữ trước/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Luyện với camera' })).toHaveAttribute('href', '/practice');
  });

  it('accepts a lower-case letter', async () => {
    at('/alphabet/z');
    expect(await screen.findByRole('heading', { level: 1, name: 'Chữ Z' })).toBeInTheDocument();
  });

  it('explains a character the app does not teach', async () => {
    at('/alphabet/9');
    expect(await screen.findByRole('alert')).toHaveTextContent('Không có chữ 9');
  });

  it('says so when the alphabet cannot be loaded', async () => {
    at('/alphabet', vi.fn().mockRejectedValue(new Error('x')));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được bảng chữ cái.');
  });
});
