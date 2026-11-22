import { Slot } from '@radix-ui/react-slot';
import type { ButtonHTMLAttributes } from 'react';
import { vi } from '@/i18n/vi';

const VARIANTS = {
  primary: 'btn-pink border border-brand-500/25 text-ink-on-pink hover:-translate-y-0.5',
  secondary: 'border-2 border-border bg-surface text-text shadow-[0_3px_0_var(--border)] hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-fg',
  success: 'bg-success-fg text-text-on-brand shadow-[0_4px_0_var(--success-lip)] hover:-translate-y-0.5 hover:brightness-105',
  danger: 'bg-danger-fg text-text-on-brand shadow-[0_4px_0_var(--danger-lip)] hover:-translate-y-0.5 hover:brightness-105',
  ghost: 'bg-transparent text-brand-fg shadow-none hover:bg-brand-50 active:translate-y-0',
} as const;

const SIZES = {
  sm: 'min-h-11 px-4 text-sm',
  md: 'min-h-12 px-6 text-base',
  lg: 'min-h-14 px-8 text-base sm:text-lg',
} as const;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
  asChild?: boolean;
};

/** Pill-shaped 3D tactile button inspired by Duolingo and the luminous rose-pink CTA. */
export function Button({ variant = 'primary', size = 'md', loading = false, asChild = false, disabled, className = '', children, ...rest }: Props) {
  const Comp = asChild ? Slot : 'button';
  const blocked = disabled || loading;
  return (
    <Comp
      {...rest}
      {...(asChild ? {} : { type: rest.type ?? 'button', disabled: blocked })}
      aria-busy={loading || undefined}
      aria-disabled={blocked || undefined}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-extrabold tracking-wide transition-[transform,box-shadow,background-color,border-color,color,filter] duration-(--motion-fast) active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading ? <span role="status">{vi.common.loading}</span> : children}
    </Comp>
  );
}
