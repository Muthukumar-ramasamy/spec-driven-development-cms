import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        name: 'unit',
        include: ['src/modules/**/*.test.ts'],
        exclude: ['src/modules/**/*.integration.test.ts'],
        environment: 'node',
      },
      {
        name: 'integration',
        include: ['src/modules/**/*.integration.test.ts'],
        environment: 'node',
        setupFiles: ['src/test/setup.ts'],
        pool: 'forks',
        poolOptions: { forks: { singleFork: true } },
      },
    ],
  },
})
