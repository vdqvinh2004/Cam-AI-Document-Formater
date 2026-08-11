import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  { ignores: ['dist/**', 'release/**', 'node_modules/**'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: { allowDefaultProject: ['vite.config.ts', 'vite.web.config.ts', 'vitest.config.ts', 'playwright.config.ts', 'tests/*/*.ts', 'tests/*/*.tsx', 'tests/*/*/*.ts', 'tests/*/*/*.tsx'], maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 100 },
      },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: { '@typescript-eslint/no-explicit-any': 'error', 'no-console': 'warn' },
  },
];
