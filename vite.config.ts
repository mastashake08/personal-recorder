import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'; // Import the plugin
import tailwindcss from "@tailwindcss/vite";
// Replace '<REPOSITORY_NAME>' with the actual name of your GitHub repository
const repositoryName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : '';
export default defineConfig({
  plugins: [
        tailwindcss(),
        vue(),
        VitePWA({
      // Service Worker Registration Strategy
      registerType: 'autoUpdate', // Automatically update the service worker without prompting the user.
                                  // Other option: 'prompt' (requires a custom UI component for updates)

      // Caching Strategy (using generateSW for simplicity)
      // This will automatically generate a service worker that precaches your app's assets.
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,vue,woff,woff2}'], // Files to precache
        runtimeCaching: [ // Example: Cache API calls (if any)
          // {
          //   urlPattern: /^https:\/\/api\.example\.com\/.*/,
          //   handler: 'NetworkFirst', // Or 'CacheFirst', 'StaleWhileRevalidate', etc.
          //   options: {
          //     cacheName: 'api-cache',
          //     expiration: {
          //       maxEntries: 10,
          //       maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
          //     },
          //     cacheableResponse: {
          //       statuses: [0, 200]
          //     }
          //   }
          // }
        ]
      },

      // Web App Manifest Configuration
      manifest: {
        name: 'Mastashake Personal Recorder', // Your app's full name
        short_name: 'Recorder', // Your app's short name (for home screens)
        description: 'A Vue.js application for recording video with filters. Capture screen and camera/microphone.', // App description
        theme_color: '#1d4ed8', // Main theme color (Tailwind blue-700)
        background_color: '#111827', // Background color for splash screen (Tailwind gray-900)
        display: 'standalone', // How the app is displayed (standalone, fullscreen, minimal-ui)
        scope: process.env.NODE_ENV === 'production' && repositoryName ? `/${repositoryName}/` : '/', // PWA scope
        start_url: process.env.NODE_ENV === 'production' && repositoryName ? `/${repositoryName}/` : '/', // Start URL
        icons: [
          {
            src: 'pwa-icons/icon-192x192.png', // Path relative to your `public` folder
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-icons/icon-512x512.png', // Path relative to your `public` folder
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },

      // Development options (optional, for easier debugging)
      devOptions: {
        enabled: true, // Enable PWA features in development
        type: 'module', // Use module type for service worker in dev for HMR
      },
    }),
  ],
  base: process.env.NODE_ENV === 'production' && repositoryName ? `/${repositoryName}/` : '/personal-recorder',
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  optimizeDeps: { // May be needed for some versions of ffmpeg.wasm
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
});