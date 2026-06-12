import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'favicon.ico',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'icons/*.png',
        'icons/icon.svg'
      ],
      manifest: {
        name: 'JalSaathi – Har Pyaas Ka Saathi',
        short_name: 'JalSaathi',
        description: 'Order fresh water cans delivered to your door. Fast, reliable, affordable — your local water delivery partner.',
        start_url: '/dashboard',
        scope: '/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        background_color: '#1e3a8a',
        theme_color: '#3b82f6',
        orientation: 'any',
        lang: 'en-IN',
        dir: 'ltr',
        categories: ['food', 'utilities', 'productivity', 'business'],
        iarc_rating_id: 'e84b072d-71b3-4d3e-86ae-31a8ce4e53b7',
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ],
        shortcuts: [
          {
            name: 'Order Water',
            short_name: 'Order',
            description: 'Place a new water can order',
            url: '/dashboard',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }]
          },
          {
            name: 'My Orders',
            short_name: 'Orders',
            description: 'Track your current orders',
            url: '/dashboard/my-orders',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }]
          }
        ],
        prefer_related_applications: false
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: {
        enabled: false,
      }
    })
  ],
  server: {
    port: 5174,
    open: true,
    host: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5174,
    },
  },
  build: {
    outDir: 'dist',
  },
  publicDir: 'public',
});
