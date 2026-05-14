import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir:    './e2e',
  timeout:    30_000,
  retries:    1,
  workers:    1,
  reporter:   [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],

  use: {
    baseURL:          'http://localhost:5173',
    headless:         true,
    screenshot:       'only-on-failure',
    video:            'retain-on-failure',
    trace:            'on-first-retry',
  },

  projects: [
    {
      name:  'chromium',
      use:   { ...devices['Desktop Chrome'] },
    },
  ],

  // Start the Vite dev server before running E2E tests
  webServer: {
    command:            'npm run dev',
    url:                'http://localhost:5173',
    reuseExistingServer: true,
    timeout:            30_000,
  },
})
