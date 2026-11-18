import { describe, expect, it, vi } from 'vitest';
import { HAND_CONNECTIONS, drawSkeleton } from './overlay';

const hand = Array.from({ length: 21 }, (_, i) => ({ x: i / 21, y: i / 21, z: 0 }));
const ctx = () => ({
  clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), arc: vi.fn(), fill: vi.fn(),
  lineWidth: 0, strokeStyle: '', fillStyle: '',
});

describe('drawSkeleton', () => {
  it('has the 21 standard hand connections', () => {
    expect(HAND_CONNECTIONS).toHaveLength(21);
  });

  it('clears, then draws every bone and every joint scaled to the canvas', () => {
    const c = ctx();
    drawSkeleton(c as never, hand, { width: 200, height: 100, color: 'c', badColor: 'b' });
    expect(c.clearRect).toHaveBeenCalledWith(0, 0, 200, 100);
    expect(c.moveTo).toHaveBeenCalledTimes(21);
    expect(c.arc).toHaveBeenCalledTimes(21);
    expect(c.arc.mock.calls[2].slice(0, 2)).toEqual([hand[2].x * 200, hand[2].y * 100]);
  });

  it('colours the joints flagged as wrong differently', () => {
    const c = ctx();
    const fills: string[] = [];
    c.fill = vi.fn(() => fills.push(c.fillStyle));
    drawSkeleton(c as never, hand, { width: 100, height: 100, color: 'ok', badColor: 'bad', badJoints: [8] });
    expect(fills.filter((f) => f === 'bad')).toHaveLength(1);
    expect(fills.filter((f) => f === 'ok')).toHaveLength(20);
  });

  it('only clears when there is no hand', () => {
    const c = ctx();
    drawSkeleton(c as never, null, { width: 10, height: 10, color: 'c', badColor: 'b' });
    expect(c.clearRect).toHaveBeenCalled();
    expect(c.arc).not.toHaveBeenCalled();
  });
});
