/** Lesson status is derived from `requires` and stored progress, never stored itself (docs/03 §3.2). */

export type LessonStatus = 'locked' | 'available' | 'in_progress' | 'completed';

type StoredStatus = 'completed' | 'in_progress';
export type ProgressMap = Readonly<Record<string, { readonly status: StoredStatus }>>;

export function lessonStatus(
  lesson: { code: string; requires: readonly string[] },
  progress: ProgressMap,
): LessonStatus {
  const own = progress[lesson.code]?.status;
  if (own === 'completed') return 'completed';
  const unlocked = lesson.requires.every((code) => progress[code]?.status === 'completed');
  if (!unlocked) return 'locked';
  return own === 'in_progress' ? 'in_progress' : 'available';
}
