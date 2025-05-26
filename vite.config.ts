import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Replace '<REPOSITORY_NAME>' with the actual name of your GitHub repository
const repositoryName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : '';
export default defineConfig({
  plugins: [vue()],
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