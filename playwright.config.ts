import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  // Les parcours écrivent dans la même base locale : exécution séquentielle.
  fullyParallel: false,
  workers: 1,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3400',
    locale: 'fr-CH',
  },
  webServer: {
    command: 'pnpm dev --port 3400',
    url: 'http://localhost:3400/fr',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
