import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'Expense Manager',
        short_name: 'ExpenseMgr',
        description: 'Track and split expenses with your groups',
        theme_color: '#1e3a5f',
        background_color: '#f8faff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ],
        screenshots: [
          {
            src: 'icons/screenshot-wide.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Expense Manager Dashboard'
          }
        ],
        categories: ['finance', 'productivity'],
        shortcuts: [
          {
            name: 'Dashboard',
            url: '/dashboard',
            description: 'Go to your dashboard'
          }
        ]
      },
      workbox: {
        // Cache shell assets (JS, CSS, fonts, images)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/node_modules/**/*'],

        runtimeCaching: [
          // ── API: Group list — NetworkFirst (fresh on online, fallback cache) ──
          {
            urlPattern: /\/api\/groups$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-groups',
              expiration: { maxEntries: 10, maxAgeSeconds: 5 * 60 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // ── API: Group details / expenses / balances — NetworkFirst ──────────
          {
            urlPattern: /\/api\/groups\/[^/]+\/(expenses|balances|settlements)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-group-data',
              expiration: { maxEntries: 50, maxAgeSeconds: 2 * 60 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // ── API: Analytics — StaleWhileRevalidate (OK to show slightly older) ─
          {
            urlPattern: /\/api\/groups\/[^/]+\/analytics/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-analytics',
              expiration: { maxEntries: 30, maxAgeSeconds: 10 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // ── API: Dashboard stats — NetworkFirst ───────────────────────────────
          {
            urlPattern: /\/api\/dashboard/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-dashboard',
              expiration: { maxEntries: 5, maxAgeSeconds: 3 * 60 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // ── Fonts & CDN assets — CacheFirst (very stable) ──────────────────
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ],
        // Offline fallback — all SPA routes should be handled by the SW
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^(?!\/__).*/], // Allow all navigation requests to fallback to index.html
        navigateFallbackDenylist: [/^\/api\//, /\/icons\//, /\/assets\//, /\.js$/, /\.css$/, /\.svg$/, /\.png$/, /\.ico$/, /workbox/]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
})
