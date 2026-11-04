import { defineConfig, devices } from '@playwright/test';

// Interface tests against the production build (`npm run test:e2e` builds first).
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure' },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'movil', use: { ...devices['Pixel 7'] } },
  ],
  webServer: { command: 'npx next start -p 3100', url: 'http://localhost:3100', reuseExistingServer: !process.env.CI, timeout: 60_000 },
});
