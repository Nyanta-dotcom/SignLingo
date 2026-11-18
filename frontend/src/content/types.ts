/** Curriculum shapes (docs/03 §2). The content itself is supplied by the user, never invented. */

export type ItemType = 'learn_card' | 'perform_sign' | 'choose_sign' | 'spell_word' | 'perform_dynamic';

export type Item = {
  order: number;
  type: ItemType;
  /** Required for every type except spell_word. */
  sign_code?: string;
  /** Required for spell_word; only letters present in the active model's labels. */
  word?: string;
  config?: { hold_ms?: number; threshold?: number; time_limit_ms?: number };
};

export type Lesson = {
  code: string;
  title: string;
  order: number;
  xp_reward: number;
  requires: string[];
  items: Item[];
};

export type Unit = { code: string; level: 1 | 2 | 3; title: string; order: number; lessons: Lesson[] };

export type Media = { type: 'image' | 'video'; src: string; license: string; attribution: string };

export type Sign = {
  code: string;
  gloss: string;
  kind: 'static' | 'dynamic';
  model_task: string;
  model_class_index: number;
  hints?: Record<string, string>;
  media?: Media[];
};

export type Curriculum = { schema_version: 1; units: Unit[]; signs: Sign[] };
