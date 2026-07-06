import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Charge .env (DATABASE_URL) pour les tests d'intégration Prisma.
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }

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
