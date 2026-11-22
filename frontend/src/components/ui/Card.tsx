import type { HTMLAttributes } from 'react';

const VARIANTS = {
  default: '',
  interactive: 'cursor-pointer hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/40 hover:shadow-(--card-shadow-hover)',
  selected: 'border-brand-400 bg-brand-50 shadow-(--card-shadow-hover)',
} as const;

type Props = HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof VARIANTS };

/** Clean white Duolingo-style elevated card with soft rose border. */
export function Card({ variant = 'default', className = '', ...rest }: Props) {
  return (
    <div
      {...rest}
      data-variant={variant}
      className={`rounded-3xl border-2 border-border bg-surface p-5 shadow-(--card-shadow) transition-[transform,box-shadow,border-color,background-color] duration-(--motion-fast) ${VARIANTS[variant]} ${className}`}
    />
  );
}
