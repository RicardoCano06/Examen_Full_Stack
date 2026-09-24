import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy /api y /uploads -> backend (puerto 3000) para evitar CORS en desarrollo.
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
