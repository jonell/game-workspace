import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.service.ts'],
    },
  },
  resolve: {
    alias: {
      '@chunlv/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
