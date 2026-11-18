import { applyTheme, type ThemeSetting } from '@/styles/theme';
import { vi } from '@/i18n/vi';

const OPTIONS: ThemeSetting[] = ['system', 'light', 'dark'];

/** System / light / dark (docs/05 §3). Applies the theme immediately; persisting is the caller's job. */
export function ThemeToggle({ value, onChange }: { value: ThemeSetting; onChange: (t: ThemeSetting) => void }) {
  return (
    <div role="radiogroup" aria-label={vi.theme.label} className="inline-flex rounded-full border border-border bg-surface-2 p-1">
      {OPTIONS.map((option) => (
        <label
          key={option}
          className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full px-4 text-sm font-bold text-text-muted has-[:checked]:bg-brand-600 has-[:checked]:text-text-on-brand has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus-ring"
        >
          <input
            type="radio"
            name="theme"
            className="sr-only"
            checked={value === option}
            onChange={() => {
              applyTheme(option);
              onChange(option);
            }}
          />
          {vi.theme[option]}
        </label>
      ))}
    </div>
  );
}
