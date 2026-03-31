import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHtmlPlugin } from 'vite-plugin-html'
import config from './src/config/config.json'

export default defineConfig({
  plugins: [
    react(),
    createHtmlPlugin({
      inject: {
        data: {
          jsonLd: JSON.stringify(config.seo, null, 2),
        },
      },
    }),
  ],
  base: '/forceViz/',
})
