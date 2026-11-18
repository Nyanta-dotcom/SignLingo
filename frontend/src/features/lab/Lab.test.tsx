import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExperimentIndex } from '@/app/staticData';
import { Lab } from './Lab';
import { benchmarkRows, bestBaseline, parseRuns } from './selectors';

const index = JSON.parse(readFileSync(resolve(process.cwd(), 'public/data/experiments/index.json'), 'utf-8')) as ExperimentIndex;
const load = () => Promise.resolve(index);

describe('Lab', () => {
  it('shows a loading note, then the Benchmark table built from the published experiments', async () => {
    render(<Lab load={load} />);
    expect(screen.getByText('Đang tải kết quả thí nghiệm…')).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: /So sánh mô hình/ });
    const rows = within(table).getAllByRole('row');
    const expected = benchmarkRows(parseRuns(index.runs), 'sign_mnist');
    expect(rows).toHaveLength(expected.length + 1);
    expect(within(table).getByText('Majority class (floor)')).toBeInTheDocument();
    expect(within(table).getByText(/tốt nhất/)).toBeInTheDocument();
  });

  it('gives every row a distinct label even when two configurations share a model name', async () => {
    render(<Lab load={load} />);
    const table = await screen.findByRole('table', { name: /So sánh mô hình/ });
    const labels = within(table).getAllByRole('rowheader').map((h) => h.textContent?.replace('★ tốt nhất', '').trim());
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('names the best baseline in the chart caption and draws the dashed line', async () => {
    render(<Lab load={load} />);
    await screen.findByRole('table');
    const best = bestBaseline(benchmarkRows(parseRuns(index.runs), 'sign_mnist'));
    expect(screen.getByText(new RegExp(`Vạch đứt: baseline tốt nhất \\(${best?.model_name.replace(/[()]/g, '\\$&')}`))).toBeInTheDocument();
    expect(screen.getByTestId('baseline-line')).toBeInTheDocument();
  });

  it('switches dataset and says plainly that the landmark split is not by signer', async () => {
    render(<Lab load={load} />);
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Bộ dữ liệu'), { target: { value: 'landmarks' } });
    expect(screen.getAllByText(/chưa phải theo người ra dấu/).length).toBeGreaterThan(0);
  });

  it('shows the leakage tab with random vs group split', async () => {
    render(<Lab load={load} />);
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('tab', { name: 'Data Leakage' }));
    expect(screen.getByRole('tab', { name: 'Data Leakage' })).toHaveAttribute('aria-selected', 'true');
    const table = screen.getByRole('table', { name: /theo cách chia/ });
    expect(within(table).getByText('Chia ngẫu nhiên')).toBeInTheDocument();
    expect(within(table).getByText(/Chia theo nhóm ảnh/)).toBeInTheDocument();
  });

  it('reports a load failure in an alert', async () => {
    render(<Lab load={vi.fn().mockRejectedValue(new Error('x'))} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được kết quả thí nghiệm.');
  });
});

describe('Lab error analysis', () => {
  const fromDisk = (id: string) =>
    Promise.resolve(JSON.parse(readFileSync(resolve(process.cwd(), `public/data/experiments/${id}.json`), 'utf-8')));

  it('draws the 24x24 matrix and lists the worst confusions of the selected model', async () => {
    const loadRun = vi.fn(fromDisk);
    render(<Lab load={load} loadRun={loadRun} />);
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('tab', { name: 'Phân tích lỗi' }));
    const matrix = await screen.findByRole('img', { name: /Ma trận nhầm 24×24/ });
    expect(matrix.querySelectorAll('rect')).toHaveLength(24 * 24);
    expect(loadRun).toHaveBeenCalledWith('cnn_ens_wide_e30_n5');
    const real = await fromDisk('cnn_ens_wide_e30_n5');
    const top = real.top_confusions[0];
    const table = screen.getByRole('table', { name: 'Cặp chữ bị nhầm nhiều nhất' });
    expect(within(table).getByText(`${top.true} → ${top.pred}`)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /F1 của từng chữ/ })).toBeInTheDocument();
  });

  it('shows an alert when a run cannot be loaded', async () => {
    render(<Lab load={load} loadRun={vi.fn().mockRejectedValue(new Error('x'))} />);
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('tab', { name: 'Phân tích lỗi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được kết quả của mô hình này.');
  });
});
