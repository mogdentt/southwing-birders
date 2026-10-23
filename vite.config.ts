import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base './' + hash routing means the build runs anywhere:
// GitHub Pages, a local folder server, or wrapped in Capacitor later.
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep audited photo metadata, map code and framework independently cacheable.
          if (id.includes('/src/data/photos.json')) return 'photo-catalogue'
          if (id.includes('/node_modules/leaflet/')) return 'map-engine'
          if (id.includes('/node_modules/')) return 'vendor'
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Southwing · Birding Aotearoa',
        short_name: 'Southwing',
        description: 'A field guide, life list and birding log for Aotearoa New Zealand',
        theme_color: '#123B2D',
        background_color: '#F7F5EF',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // cache bird photos from Wikipedia/Wikimedia for offline field use
            urlPattern: /^https:\/\/(upload\.wikimedia\.org|thumb\.wikimedia\.org)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bird-photos',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ]
})
