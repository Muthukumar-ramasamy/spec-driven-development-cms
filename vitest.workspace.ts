import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name: 'unit',
      include: ['backend/src/modules/**/__tests__/*.service.test.ts'],
      environment: 'node',
      globals: true,
    },
  },
  {
    test: {
      name: 'integration',
      include: ['backend/src/modules/**/__tests__/*.repository.test.ts'],
      environment: 'node',
      globals: true,
      setupFiles: ['backend/src/test/setup.ts'],
      pool: 'forks',
      poolOptions: {
        forks: { singleFork: true },
      },
    },
  },
])
