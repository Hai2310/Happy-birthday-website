import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 420_000,
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
      // optional: point at an already-installed Chromium
      ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
    },
  },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
  projects: [
    { name: 'phone-se', use: { viewport: { width: 375, height: 667 }, hasTouch: true } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: 'phone-max', use: { viewport: { width: 430, height: 932 }, hasTouch: true } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 }, hasTouch: true } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
})
