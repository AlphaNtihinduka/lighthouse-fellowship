import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // userEvent-driven tests can take a couple of seconds on a busy CI runner.
    testTimeout: 15_000,
    // The real API URL is irrelevant in tests: fetch is mocked.
    env: { VITE_API_URL: 'http://api.test' },
  },
})
