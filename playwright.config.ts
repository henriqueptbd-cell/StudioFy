import { defineConfig } from '@playwright/test';

process.env.NODE_ENV ??= 'test';

const apiUrl = 'http://127.0.0.1:3334';
const appUrl = 'http://127.0.0.1:5174';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL: appUrl,
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev --prefix backend',
      url: `${apiUrl}/health`,
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'test',
        PORT: '3334',
        FRONTEND_URL: appUrl,
      },
    },
    {
      command: 'npm run dev --prefix frontend -- --host 127.0.0.1 --port 5174',
      url: appUrl,
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'test',
        VITE_API_URL: '/api/v1',
        VITE_PROXY_TARGET: apiUrl,
      },
    },
  ],
});
