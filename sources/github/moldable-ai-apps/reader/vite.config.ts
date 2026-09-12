import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

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
    alias: [{ find: '@', replacement: '/src' }],
  },
  server: {
    host: '127.0.0.1',
  },
})
