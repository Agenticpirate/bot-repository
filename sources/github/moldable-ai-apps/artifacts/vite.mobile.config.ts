import react from '@vitejs/plugin-react'
import { createMoldableMobileWebConfig } from '@moldable-ai/ui/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig(
  createMoldableMobileWebConfig({ plugins: [tailwindcss(), react()] }),
)
