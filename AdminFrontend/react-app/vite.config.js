import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api-edu': {
        target: 'https://localhost:7033',
        changeOrigin: true,
        secure: false,
      },
      '/avatars': {
        target: 'https://localhost:7033',
        changeOrigin: true,
        secure: false,
      },
      '/notificationHub': {
        target: 'https://localhost:7033',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
