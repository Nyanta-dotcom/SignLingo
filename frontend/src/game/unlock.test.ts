import { describe, expect, it } from 'vitest';
import { lessonStatus } from './unlock';

const progress = {
  a: { status: 'completed' },
  b: { status: 'in_progress' },
} as const;

describe('lessonStatus', () => {
  it('is available when nothing is required', () => {
    expect(lessonStatus({ code: 'x', requires: [] }, {})).toBe('available');
  });

  it('is locked until every required lesson is completed', () => {
    expect(lessonStatus({ code: 'x', requires: ['a', 'c'] }, progress)).toBe('locked');
    expect(lessonStatus({ code: 'x', requires: ['b'] }, progress)).toBe('locked');
    expect(lessonStatus({ code: 'x', requires: ['a'] }, progress)).toBe('available');
  });

  it('reports the stored status of the lesson itself', () => {
    expect(lessonStatus({ code: 'a', requires: [] }, progress)).toBe('completed');
    expect(lessonStatus({ code: 'b', requires: ['a'] }, progress)).toBe('in_progress');
  });

  it('a completed lesson stays completed even if its requirement is not', () => {
    expect(lessonStatus({ code: 'a', requires: ['zzz'] }, progress)).toBe('completed');
  });
});
