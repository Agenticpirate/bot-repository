import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    rollupOptions: {
      input: {
        app: 'index.html',
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: '127.0.0.1',
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/**'],
    fileParallelism: false,
    testTimeout: 15_000,
  },
})
