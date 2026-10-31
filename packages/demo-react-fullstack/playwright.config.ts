import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  use: { browserName: 'chromium', trace: 'retain-on-failure' },
  projects: [
    { name: 'development', use: { baseURL: 'http://127.0.0.1:5174' } },
    { name: 'production', use: { baseURL: 'http://127.0.0.1:5175' } },
  ],
  webServer: [
    { command: 'yarn dev', env: { PORT: '5174', NODE_ENV: 'development' }, url: 'http://127.0.0.1:5174', reuseExistingServer: false },
    { command: 'yarn start', env: { PORT: '5175' }, url: 'http://127.0.0.1:5175', reuseExistingServer: false },
  ],
});
