import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
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
);
