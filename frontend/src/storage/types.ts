/** Shapes of everything the app stores in the browser (docs/03 §3.2-3.4). Keep in sync with backup.schema.json. */

export type ModelRef = { model_id: string; version: string };
export type Backend = 'webgpu' | 'wasm';

export type Profile = { display_name?: string; created_at: string; timezone: string };

export type Settings = {
  theme: 'system' | 'light' | 'dark';
  handedness: 'right' | 'left';
  sound_on: boolean;
  reduced_motion: 'system' | 'on' | 'off';
  daily_xp_goal: 10 | 20 | 30 | 50;
  camera_device_id?: string;
};

export type Stats = {
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  /** Local date 'YYYY-MM-DD' of the last day the daily goal was met. */
  last_goal_date: string | null;
  hearts: 0 | 1 | 2 | 3 | 4 | 5;
  hearts_updated_at: string;
};

export type LessonProgress = {
  status: 'completed' | 'in_progress';
  best_accuracy_pct: number;
  times_completed: number;
  last_completed_at: string | null;
};

export type DailyActivity = { xp_earned: number; lessons_completed: number; goal_met: boolean };

export type SignStat = { attempts: number; correct: number; avg_time_to_verify_ms: number };

export type Attempt = {
  item_order: number;
  position: number | null;
  expected: string;
  predicted: string | null;
  confidence: number | null;
  result: 'correct' | 'timed_out' | 'skipped';
  time_to_verify_ms: number | null;
  retries: number;
  confused_with: string | null;
};

export type SessionRecord = {
  id: string;
  mode: 'lesson' | 'free_practice' | 'review';
  lesson_code: string | null;
  model: ModelRef;
  started_at: string;
  completed_at: string | null;
  status: 'completed' | 'abandoned' | 'failed_no_hearts';
  accuracy_pct: number | null;
  xp_awarded: number;
  attempts: Attempt[];
  perf: {
    fps_avg: number;
    frame_ms_p95: number;
    mp_ms_p50: number;
    cls_ms_p50: number;
    backend: Backend;
  } | null;
};

export type PerfRecord = {
  id: string;
  recorded_at: string;
  duration_s: 60;
  model: ModelRef;
  backend: Backend;
  delegate: 'GPU' | 'CPU';
  worker: boolean;
  camera: { width: number; height: number; fps_reported: number };
  frame_ms: { p50: number; p95: number; max: number };
  mp_ms: { p50: number; p95: number };
  cls_ms: { p50: number; p95: number };
  processing_fps_avg: number;
  dropped_frames: number;
  user_agent: string;
};

export type Meta = { schema_version: number; app_version: string; model_version_seen: string | null };
