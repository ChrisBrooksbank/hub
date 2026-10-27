import { defineConfig } from 'vite'
import { sitesPlugin } from './scripts/vite-plugin-sites.ts'

export default defineConfig({
  plugins: [
    sitesPlugin({
      generatedPath: 'data/sites.generated.json',
      overridesPath: 'data/sites.overrides.json',
    }),
  ],
})
