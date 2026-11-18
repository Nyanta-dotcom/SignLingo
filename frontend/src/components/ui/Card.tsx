import type { HTMLAttributes } from 'react';

const VARIANTS = {
  default: '',
  interactive: 'cursor-pointer hover:bg-brand-50 dark:hover:bg-surface-2',
  selected: 'border-brand-500 bg-brand-50 dark:bg-surface-2',
} as const;

type Props = HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof VARIANTS };

/** Flat game-style card (docs/05 §2.5). */
export function Card({ variant = 'default', className = '', ...rest }: Props) {
  return (
    <div
      {...rest}
      data-variant={variant}
      className={`rounded-xl border-2 border-border bg-surface p-4 shadow-(--card-shadow) ${VARIANTS[variant]} ${className}`}
    />
  );
}
