import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const webResolve = {
  alias: {
    '@': fileURLToPath(new URL('./src/web', import.meta.url)),
    '@/components': fileURLToPath(new URL('./src/web/components', import.meta.url)),
    '@/components/ui': fileURLToPath(new URL('./src/web/components/ui', import.meta.url)),
    '@/lib': fileURLToPath(new URL('./src/web/lib', import.meta.url)),
    '@/hooks': fileURLToPath(new URL('./src/web/hooks', import.meta.url)),
  },
};

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['tests/web/**/*.test.ts', 'tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    projects: [
      {
        resolve: webResolve,
        test: {
          name: 'node',
          include: ['tests/unit/web/design-system.test.ts', 'tests/unit/web/bundle-budget.test.ts'],
          environment: 'node',
        },
      },
      {
        plugins: [react()],
        resolve: webResolve,
        test: {
          name: 'browser',
          globals: true,
          include: ['tests/unit/web/**/*.test.ts', 'tests/unit/web/**/*.test.tsx', 'tests/web/**/*.test.ts'],
          exclude: ['tests/unit/web/design-system.test.ts', 'tests/unit/web/bundle-budget.test.ts'],
          environment: 'jsdom',
        },
      },
    ],
  },
  resolve: webResolve,
});