import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/'
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      // Include project source paths for meaningful coverage
      include: [
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'utils/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'contexts/**/*.{ts,tsx}',
        'services/**/*.{ts,tsx}',
        'pages/**/*.{ts,tsx}',
        'src/**/*.{ts,tsx}'
      ],
      // Exclude coverage directory from coverage reports
      exclude: ['node_modules/', '**/*.test.{ts,tsx}', '**/__tests__/**', 'coverage/**'],
      // Thresholds
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60
    }
  }
});
