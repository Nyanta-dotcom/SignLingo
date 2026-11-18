import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Banners } from './Banners';

const state = vi.hoisted(() => ({
  storageAvailable: true,
  stats: { total_xp: 0 },
  profile: { created_at: '2026-03-01T00:00:00Z' },
  reminder: {} as { last_export_at?: string; dismissed_at?: string },
  backup: { exportBackup: vi.fn(() => ({ schema_version: 1, exported_at: '', app_version: '', data: {} })) },
  dismissBackupReminder: vi.fn(),
}));
vi.mock('@/storage/useLearner', () => ({ useLearner: (sel: (s: typeof state) => unknown) => sel(state) }));
vi.mock('@/lib/downloadBackup', () => ({ downloadBackup: vi.fn() }));

const DAY8 = () => new Date('2026-03-09T00:00:00Z');
beforeEach(() => {
  state.storageAvailable = true;
  state.stats.total_xp = 0;
  state.reminder = {};
  vi.clearAllMocks();
});

describe('Banners', () => {
  it('shows nothing for a new learner', () => {
    const { container } = render(<Banners now={DAY8} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('warns that progress will not be saved when storage is blocked', () => {
    state.storageAvailable = false;
    render(<Banners now={DAY8} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Tiến độ sẽ không được lưu');
  });

  it('nudges a backup after a week with some XP, exports on request and can be closed', async () => {
    state.stats.total_xp = 40;
    render(<Banners now={DAY8} />);
    expect(screen.getByText('Tiến độ chỉ lưu trên trình duyệt này.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xuất bản sao lưu' }));
    expect(state.backup.exportBackup).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng nhắc sao lưu' }));
    expect(state.dismissBackupReminder).toHaveBeenCalledOnce();
  });

  it('does not nudge when storage is blocked (nothing is being kept anyway)', () => {
    state.storageAvailable = false;
    state.stats.total_xp = 500;
    render(<Banners now={DAY8} />);
    expect(screen.queryByRole('region')).toBeNull();
  });
});
