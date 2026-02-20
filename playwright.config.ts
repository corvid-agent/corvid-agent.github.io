import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: 'http://localhost:4180',
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'npx serve -l 4180 -s .',
    url: 'http://localhost:4180',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
