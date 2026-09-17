import { defineConfig } from '@playwright/test'
const production = process.env.LATTICE_PRODUCTION_TEST === '1'
const baseURL = production ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:5173'
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: {
    baseURL,
    viewport: { width: 1440, height: 1000 },
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: production ? 'npm run preview -- --port 4173' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30000,
  },
})
