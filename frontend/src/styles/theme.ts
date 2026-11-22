/** Light-only theme helper: SignLingo runs exclusively in light mode. */

export type ThemeSetting = 'system' | 'light' | 'dark';

export function resolveTheme(_setting?: ThemeSetting, _systemPrefersDark?: boolean): 'light' {
  void _setting;
  void _systemPrefersDark;
  return 'light';
}

export function applyTheme(_setting?: ThemeSetting, root: HTMLElement = document.documentElement): 'light' {
  void _setting;
  root.setAttribute('data-theme', 'light');
  return 'light';
}
