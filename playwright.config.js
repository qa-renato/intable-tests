const { defineConfig, devices } = require('playwright/test')

const BASE_URL = process.env.BASE_URL || 'https://intable.inbot.com.br'

module.exports = defineConfig({
  testDir: './tests',
  outputDir: './evidencias/test-results',

  fullyParallel: false,
  workers: 1,
  retries: 1,
  forbidOnly: !!process.env.CI,

  reporter: [
    ['html', { outputFolder: './evidencias/html', open: 'never' }],
    ['line'],
  ],

  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    headless: true,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'setup',
      testDir: '.',
      testMatch: '**/fixtures/global.setup.js',
    },
    {
      name: 'intable',
      testDir: './tests',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './fixtures/.auth/user.json',
      },
    },
  ],
})
