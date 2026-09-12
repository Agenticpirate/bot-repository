import react from '@vitejs/plugin-react'
import { createMoldableMobileWebConfig } from '@moldable-ai/ui/vite'
import tailwindcss from '@tailwindcss/vite'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { type Plugin, defineConfig } from 'vite'

function mobileLauncherIcon(): Plugin {
  let source = ''
  let destination = ''
  return {
    name: 'podcasts-mobile-launcher-icon',
    apply: 'build',
    configResolved(config) {
      source = path.join(config.publicDir, 'icon.png')
      destination = path.resolve(config.root, config.build.outDir, 'icon.png')
    },
    async closeBundle() {
      // iOS reads icon.png from the verified bundle, with a 1 MiB limit.
      // Keep the original desktop artwork; size only the bundled launcher copy.
      const icon = await sharp(source)
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 9 })
        .toBuffer()
      if (icon.length > 1024 * 1024)
        throw new Error("The mobile launcher icon exceeds iOS's 1 MiB limit.")
      await writeFile(destination, icon)
    },
  }
}

export default defineConfig(
  createMoldableMobileWebConfig({
    plugins: [tailwindcss(), react(), mobileLauncherIcon()],
  }),
)
