import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Same-origin /api in local dev so httpOnly admin cookies work on both
  // localhost and 127.0.0.1 (cross-host cookies are blocked with SameSite=Lax).
  server: {
    proxy: {
      // Only proxy API. Uploads live in frontend/public/images/uploads and
      // must be served by Vite itself (backend has no /images static route in local dev).
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
})
