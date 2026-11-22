import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
};

export function BrandMark({ className = 'size-9' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`btn-pink inline-flex shrink-0 items-center justify-center rounded-2xl text-ink-on-pink shadow-[0_3px_0_var(--btn-pink-lip)] ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-[62%]" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 11V6a2 2 0 0 0-4 0v4" />
        <path d="M14 10V4a2 2 0 0 0-4 0v6" />
        <path d="M10 10.5V5a2 2 0 0 0-4 0v8" />
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.3L3.3 17a2 2 0 0 1 2.8-2.8L8 16" />
      </svg>
    </span>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9.5" />
      <path d="M9.5 21v-6a2.5 2.5 0 0 1 5 0v6" />
    </svg>
  );
}

export function HandIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M18 11V6a2 2 0 0 0-4 0v4" />
      <path d="M14 10V4a2 2 0 0 0-4 0v6" />
      <path d="M10 10.5V5a2 2 0 0 0-4 0v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.3L3.3 17a2 2 0 0 1 2.8-2.8L8 16" />
    </svg>
  );
}

export function AlphabetIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="4" />
      <path d="M8.5 15.5 12 8l3.5 7.5" />
      <path d="M9.8 13h4.4" />
    </svg>
  );
}

export function LabIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 3h6" />
      <path d="M10 3v5.5L5.2 17a2.5 2.5 0 0 0 2.2 3.7h9.2a2.5 2.5 0 0 0 2.2-3.7L14 8.5V3" />
      <path d="M8.5 14.5h7" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function FlameIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.7 2.4c.5 3.1-1.3 5-2.6 6.4-1.3 1.4-2.1 2.6-2.1 4.4a4 4 0 0 0 8 0c0-1.6-.7-2.8-1.4-3.7-.3 1.3-1.1 2.1-2.2 2.4.7-1.9.8-4.7.3-9.5Z" />
      <path d="M12 22a7 7 0 0 1-7-7c0-3.4 2.1-5.8 4-7.8 1.4-1.5 2.6-2.9 2.7-5.2a.8.8 0 0 1 1.4-.5c2.2 2.4 3.4 4.8 3.6 7.4a6.4 6.4 0 0 1 2.3 5.2A7 7 0 0 1 12 22Z" opacity="0.22" />
    </svg>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.2 2.5 4.8 13h6l-1 8.5 9.4-11h-6l0-8Z" />
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 20.6s-7.5-4.7-9.2-9.2C1.6 8.3 3.7 5 7 5c1.9 0 3.5 1 5 2.7C13.5 6 15.1 5 17 5c3.3 0 5.4 3.3 4.2 6.4-1.7 4.5-9.2 9.2-9.2 9.2Z" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7.5 5.4a1.5 1.5 0 0 1 2.26-1.29l10 6.1a1.5 1.5 0 0 1 0 2.58l-10 6.1A1.5 1.5 0 0 1 7.5 17.6V5.4Z" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="11" width="14" height="10" rx="3" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="m12 2.6 2.84 5.75 6.35.92-4.6 4.48 1.09 6.32L12 17.08l-5.68 2.99 1.09-6.32-4.6-4.48 6.35-.92L12 2.6Z" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2.5 14.3 9.7 21.5 12l-7.2 2.3L12 21.5l-2.3-7.2L2.5 12l7.2-2.3L12 2.5Z" />
    </svg>
  );
}

export function ShieldLockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 5 6v6c0 4.6 3 7.8 7 9 4-1.2 7-4.4 7-9V6l-7-3Z" />
      <path d="M9.5 12.2 11.2 14l3.6-3.8" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.5C3.6 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.5 4.5-1.2" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </svg>
  );
}
