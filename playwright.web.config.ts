import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/web',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:5174', ...devices['Desktop Chrome'] },
  webServer: { command: 'yarn dev', url: 'http://127.0.0.1:5174', reuseExistingServer: true },
});