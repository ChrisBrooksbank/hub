import { defineConfig } from 'vite'
import { pwaPlugin } from './scripts/vite-plugin-pwa.ts'
import { sitesPlugin } from './scripts/vite-plugin-sites.ts'

export default defineConfig({
  plugins: [
    pwaPlugin(),
    sitesPlugin({
      generatedPath: 'data/sites.generated.json',
      overridesPath: 'data/sites.overrides.json',
    }),
  ],
})
