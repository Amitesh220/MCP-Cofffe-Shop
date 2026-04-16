import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/menu': 'http://localhost:3000',
      '/order': 'http://localhost:3000',
      '/owner-command': 'http://localhost:3000',
      '/health': 'http://localhost:3000'
    }
  }
});
