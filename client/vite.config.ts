import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // reachable from your phone on the same Wi-Fi during dev
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
