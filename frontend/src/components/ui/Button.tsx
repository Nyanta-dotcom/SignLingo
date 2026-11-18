import { Slot } from '@radix-ui/react-slot';
import type { ButtonHTMLAttributes } from 'react';
import { vi } from '@/i18n/vi';

const VARIANTS = {
  primary: 'bg-brand-600 text-text-on-brand shadow-[0_4px_0_var(--brand-700)]',
  secondary: 'bg-surface text-brand-fg border-2 border-border shadow-[0_4px_0_var(--border)]',
  success: 'bg-success-fg text-bg shadow-[0_4px_0_var(--border)]',
  danger: 'bg-danger-fg text-bg shadow-[0_4px_0_var(--border)]',
  ghost: 'bg-transparent text-brand-fg shadow-none active:translate-y-0',
} as const;

const SIZES = { sm: 'min-h-11 px-4 text-sm', md: 'min-h-12 px-6 text-base', lg: 'min-h-14 px-8 text-lg' } as const;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
  asChild?: boolean;
};

/** 3D game-style button (docs/05 §2.5, §3). Labels are upper-case via CSS so the DOM text stays readable. */
export function Button({ variant = 'primary', size = 'md', loading = false, asChild = false, disabled, className = '', children, ...rest }: Props) {
  const Comp = asChild ? Slot : 'button';
  const blocked = disabled || loading;
  return (
    <Comp
      {...rest}
      {...(asChild ? {} : { type: rest.type ?? 'button', disabled: blocked })}
      aria-busy={loading || undefined}
      aria-disabled={blocked || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold uppercase tracking-wide transition-transform duration-(--motion-fast) active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading ? <span role="status">{vi.common.loading}</span> : children}
    </Comp>
  );
}
