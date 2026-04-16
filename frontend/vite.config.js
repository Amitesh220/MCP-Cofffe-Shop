import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // allow external connections
    port: 5173,
    strictPort: true,
    cors: true,        // allow cross-origin
    allowedHosts: 'all', // VERY IMPORTANT
    proxy: {
      '/menu': 'http://localhost:3000',
      '/order': 'http://localhost:3000',
      '/owner-command': 'http://localhost:3000',
      '/health': 'http://localhost:3000'
    }
  }
});
