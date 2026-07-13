import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.js'],
    setupFiles: ['./tests/setup.js']
  }
});
