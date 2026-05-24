import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5264',
        changeOrigin: true,
        secure: false,
        timeout: 180000,
      },
    },
  },
})
