import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Global test settings
    globals: true,
    environment: 'node',

    // Test file patterns
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],

    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/lib/**/*.ts'],
      exclude: [
        'src/lib/data/**', // Static data files
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },

    // Timeout for async tests (LLM calls can be slow in integration tests)
    testTimeout: 30000,

    // Setup files (for mocks, env, etc.)
    setupFiles: ['./src/test/setup.ts'],
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
