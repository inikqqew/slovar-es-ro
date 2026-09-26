import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// GitHub Pages отдаёт проект по /<repo>/, а не с корня домена.
const GH_PAGES_BASE = '/slovar-es-ro/'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? GH_PAGES_BASE : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Словарь ES-RO',
        short_name: 'ES-RO',
        description: 'Испанско-румынский словарь с распознаванием слов по фото, квизами и AI-чат-ботом',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
}))
