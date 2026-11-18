// Runs before first paint (loaded synchronously from <head>) so the page never flashes the wrong
// theme. A separate same-origin file because the CSP forbids inline scripts. Keep in sync with
// src/styles/theme.ts and the settings key written by src/storage/.
(function () {
  var theme = 'system';
  try {
    var raw = localStorage.getItem('signlingo:v1:settings');
    var saved = raw && JSON.parse(raw).theme;
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch {
    /* storage blocked: follow the system */
  }
  var dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
})();
