import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CameraFrame } from './CameraFrame';

describe('CameraFrame states (docs/05 §5.2)', () => {
  it('loading: announces progress with a progressbar', () => {
    render(<CameraFrame state="loading" progress={0.4} />);
    expect(screen.getByText('Đang tải AI…')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
  });

  it('no-permission: explains how to allow the camera and offers the grant button', () => {
    const onGrant = vi.fn();
    render(<CameraFrame state="no_permission" onGrant={onGrant} />);
    expect(screen.getByText('Chưa có quyền dùng camera')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cấp quyền camera' }));
    expect(onGrant).toHaveBeenCalledOnce();
  });

  it('no-hand: tells the learner to put the hand in the frame, with a text cue (not only colour)', () => {
    render(<CameraFrame state="no_hand" />);
    expect(screen.getByText('Đưa tay vào khung')).toBeInTheDocument();
  });

  it('tracking: shows the mirrored video and the overlay canvas, no message', () => {
    const video = createRef<HTMLVideoElement>();
    const canvas = createRef<HTMLCanvasElement>();
    const { container } = render(<CameraFrame state="tracking" videoRef={video} canvasRef={canvas} />);
    expect(video.current).toBeInstanceOf(HTMLVideoElement);
    expect(canvas.current).toBeInstanceOf(HTMLCanvasElement);
    expect(video.current).toHaveClass('-scale-x-100');
    expect(canvas.current).toHaveClass('-scale-x-100');
    expect(container.querySelector('[data-state="tracking"]')).not.toBeNull();
    expect(screen.queryByText('Đưa tay vào khung')).toBeNull();
  });

  it('can be unmirrored for left-handed learners', () => {
    const video = createRef<HTMLVideoElement>();
    render(<CameraFrame state="tracking" mirror={false} videoRef={video} />);
    expect(video.current).not.toHaveClass('-scale-x-100');
  });

  it('verified: success message and state marker', () => {
    const { container } = render(<CameraFrame state="verified" />);
    expect(screen.getByText('Chính xác!')).toBeInTheDocument();
    expect(container.querySelector('[data-state="verified"]')).not.toBeNull();
  });

  it('error: shows the message in an alert with a retry button', () => {
    const onRetry = vi.fn();
    render(<CameraFrame state="error" message="Không tìm thấy camera." onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Không tìm thấy camera.');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('puts the recognised letter in a polite live region for screen readers', () => {
    render(<CameraFrame state="tracking" announcement="Đã nhận chữ C, độ tin cậy 84%" />);
    const live = screen.getByText('Đã nhận chữ C, độ tin cậy 84%');
    expect(live).toHaveAttribute('aria-live', 'polite');
  });

  it('is a labelled region', () => {
    render(<CameraFrame state="tracking" />);
    expect(screen.getByRole('region', { name: 'Khung camera' })).toBeInTheDocument();
  });
});
