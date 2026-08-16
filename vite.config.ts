import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base './' + hash routing means the build runs anywhere:
// GitHub Pages, a local folder server, or wrapped in Capacitor later.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Southwing · Birding Ōtautahi',
        short_name: 'Southwing',
        description: 'A field guide, life list and birding log for Christchurch, New Zealand',
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
            urlPattern: /^https:\/\/(upload\.wikimedia\.org|en\.wikipedia\.org)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bird-photos',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 90 }
            }
          },
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      }
    })
  ]
})
