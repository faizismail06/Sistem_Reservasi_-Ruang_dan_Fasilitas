import { defineConfig } from '@playwright/test'
export default defineConfig({
  timeout: 60000,
  expect: { timeout: 15000 },
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev -- --host localhost',
    url: 'http://localhost:3000/login',
    reuseExistingServer: !process.env.CI,
    timeout: 180000
  }
})
