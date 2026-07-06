import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Charge .env (DATABASE_URL) pour les tests d'intégration Prisma.
function loadDotEnv() {
  const file = path.resolve(__dirname, '.env')
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/)
    if (match && process.env[match[1]!] === undefined) {
      process.env[match[1]!] = match[2]
    }
  }
}

export default defineConfig(() => {
  loadDotEnv()

  return {
    test: {
      include: ['src/**/*.test.ts'],
      environment: 'node',
      // Les tests d'intégration partagent la base locale : pas de parallélisme.
      fileParallelism: false,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        'server-only': path.resolve(__dirname, 'src/test/server-only-stub.ts'),
      },
    },
  }
})
