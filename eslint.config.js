import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'cache/**', 'dev-dist/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
  {
    // The science boundary: compute code must stay pure. No DOM, no network, no clock.
    files: ['src/compute/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', 'window', 'document', 'fetch', 'localStorage', 'navigator', 'XMLHttpRequest'],
      'no-restricted-properties': ['error', { object: 'Date', property: 'now', message: 'Science code takes time as input.' }, { object: 'Math', property: 'random', message: 'Use the seeded RNG in rng.ts.' }],
    },
  },
);
