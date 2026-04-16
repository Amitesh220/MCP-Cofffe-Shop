import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',    // allow external connections
    port: 5173,
    strictPort: true,
    cors: true,        // allow cross-origin
    allowedHosts: 'all', // VERY IMPORTANT
    proxy: {
      '/menu': 'http://backend:3000',
      '/order': 'http://backend:3000',
      '/owner-command': 'http://backend:3000',
      '/health': 'http://backend:3000'
    }
  }
});
