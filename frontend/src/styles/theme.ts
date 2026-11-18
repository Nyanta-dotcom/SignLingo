/** Theme resolution (docs/05 §2.3). `data-theme` on <html> is the single switch the CSS reads. */

export type ThemeSetting = 'system' | 'light' | 'dark';

export function resolveTheme(setting: ThemeSetting, systemPrefersDark: boolean): 'light' | 'dark' {
  if (setting === 'system') return systemPrefersDark ? 'dark' : 'light';
  return setting;
}

export function applyTheme(setting: ThemeSetting, root: HTMLElement = document.documentElement): 'light' | 'dark' {
  const dark = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const resolved = resolveTheme(setting, dark);
  root.setAttribute('data-theme', resolved);
  return resolved;
}
