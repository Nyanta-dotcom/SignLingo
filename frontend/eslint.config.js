import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public/mediapipe', 'public/ort'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    // C1: frontend must not import backend/ml source
    rules: {
      'no-restricted-imports': ['error', { patterns: ['**/backend/**', '**/ml/**'] }],
    },
  },
  {
    // C3: vision/* is framework-free TypeScript
    files: ['src/vision/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['react', 'react-dom', 'react/*', '**/backend/**', '**/ml/**'] }] },
  },
  {
    // C3: game/* is framework-free TypeScript (pure rules, injectable clock)
    files: ['src/game/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['react', 'react-dom', 'react/*', '**/backend/**', '**/ml/**'] }] },
  },
  {
    // C4: browser storage only through src/storage/*
    files: ['src/**'],
    ignores: ['src/storage/**', '**/*.test.*'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Use src/storage/ (docs/03 §3.1).' },
        { name: 'sessionStorage', message: 'Use src/storage/ (docs/03 §3.1).' },
        { name: 'indexedDB', message: 'Use src/storage/ (docs/03 §3.1).' },
      ],
    },
  },
  {
    // C5: colours come from design tokens, never loose hex values in components
    files: ['src/components/**', 'src/features/**', 'src/app/**'],
    ignores: ['**/*.test.*'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/#[0-9a-fA-F]{6}/]",
          message: 'Use a design token (docs/05 §2), not a hex colour.',
        },
        {
          selector: 'TemplateElement[value.raw=/#[0-9a-fA-F]{6}/]',
          message: 'Use a design token (docs/05 §2), not a hex colour.',
        },
      ],
    },
  },
);
