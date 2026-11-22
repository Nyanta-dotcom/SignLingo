import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initLearner } from '@/storage/useLearner';
import { Settings } from './Settings';

let store: ReturnType<typeof initLearner>;
beforeAll(() => {
  store = initLearner({ heartThreshold: 0.6, appVersion: 'test' });
});
beforeEach(() => {
  store.getState().backup.clearAll();
  store.getState().refresh();
  vi.stubGlobal('navigator', { mediaDevices: { enumerateDevices: vi.fn().mockResolvedValue([
    { kind: 'videoinput', deviceId: 'cam-a', label: 'Webcam A' },
    { kind: 'audioinput', deviceId: 'mic', label: 'Mic' },
    { kind: 'videoinput', deviceId: 'cam-b', label: '' },
  ]) }, userAgent: 'test' });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const fileOf = (content: string) => new File([content], 'x.json', { type: 'application/json' });

describe('Settings', () => {
  it('changes the daily XP goal and keeps it', () => {
    render(<MemoryRouter><Settings /></MemoryRouter>);
    fireEvent.click(screen.getByRole('radio', { name: '30 XP' }));
    expect(store.getState().settings.daily_xp_goal).toBe(30);
    expect(screen.getByRole('radio', { name: '30 XP' })).toBeChecked();
  });

  it('turns the lesson sounds off and on', () => {
    render(<MemoryRouter><Settings /></MemoryRouter>);
    const box = screen.getByRole('checkbox', { name: /Bật âm báo/ });
    expect(box).toBeChecked();
    fireEvent.click(box);
    expect(store.getState().settings.sound_on).toBe(false);
    fireEvent.click(box);
    expect(store.getState().settings.sound_on).toBe(true);
  });

  it('saves the display name when the field loses focus', () => {
    render(<MemoryRouter><Settings /></MemoryRouter>);
    const input = screen.getByLabelText(/Tên hiển thị/);
    fireEvent.change(input, { target: { value: ' Lan ' } });
    fireEvent.blur(input);
    expect(store.getState().profile.display_name).toBe('Lan');
  });

  it('lists only video devices and stores the chosen camera', async () => {
    render(<MemoryRouter><Settings /></MemoryRouter>);
    await screen.findByRole('option', { name: 'Webcam A' });
    expect(screen.getByRole('option', { name: 'Camera 2' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Mic' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Camera'), { target: { value: 'cam-a' } });
    expect(store.getState().settings.camera_device_id).toBe('cam-a');
    fireEvent.change(screen.getByLabelText('Camera'), { target: { value: '' } });
    expect(store.getState().settings.camera_device_id).toBeUndefined();
  });

  it('links to the about & contact page', () => {
    render(<MemoryRouter><Settings /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Giới thiệu & Liên hệ' })).toHaveAttribute('href', '/about');
  });

  it('offers no export of the learner data', () => {
    render(<MemoryRouter><Settings /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Xuất tiến độ' })).toBeNull();
  });

  it('asks before overwriting on import, and cancelling changes nothing', async () => {
    store.getState().updateSettings({ daily_xp_goal: 50 });
    const file = JSON.stringify(store.getState().backup.exportBackup());
    store.getState().updateSettings({ daily_xp_goal: 10 });
    render(<MemoryRouter><Settings /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Nhập tiến độ'), { target: { files: [fileOf(file)] } });
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('ghi đè');
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(store.getState().settings.daily_xp_goal).toBe(10);
  });

  it('imports after confirmation', async () => {
    store.getState().updateSettings({ daily_xp_goal: 50 });
    const file = JSON.stringify(store.getState().backup.exportBackup());
    store.getState().updateSettings({ daily_xp_goal: 10 });
    render(<MemoryRouter><Settings /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Nhập tiến độ'), { target: { files: [fileOf(file)] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Ghi đè và nhập' }));
    expect(screen.getByRole('status')).toHaveTextContent('Đã nhập tiến độ.');
    expect(store.getState().settings.daily_xp_goal).toBe(50);
  });

  it('rejects a file that is not a valid backup and leaves the data alone', async () => {
    store.getState().updateSettings({ daily_xp_goal: 30 });
    render(<MemoryRouter><Settings /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Nhập tiến độ'), { target: { files: [fileOf('not json')] } });
    expect(await screen.findByRole('status')).toHaveTextContent('File không hợp lệ');
    fireEvent.change(screen.getByLabelText('Nhập tiến độ'), { target: { files: [fileOf('{"schema_version":1}')] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Ghi đè và nhập' }));
    expect(screen.getByRole('status')).toHaveTextContent('File không hợp lệ');
    expect(store.getState().settings.daily_xp_goal).toBe(30);
  });

  it('clears everything only after a second confirmation', async () => {
    store.getState().updateSettings({ daily_xp_goal: 50 });
    render(<MemoryRouter><Settings /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Xóa toàn bộ dữ liệu' }));
    expect(store.getState().settings.daily_xp_goal).toBe(50);
    expect(screen.getByRole('alertdialog')).toHaveTextContent('không thể hoàn tác');
    fireEvent.click(screen.getByRole('button', { name: 'Xóa vĩnh viễn' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đã xóa toàn bộ dữ liệu.'));
    expect(store.getState().settings.daily_xp_goal).toBe(20);
  });
});
