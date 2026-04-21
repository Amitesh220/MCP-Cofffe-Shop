import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Generate hashed filenames for cache busting
    rollupOptions: {
      output: {
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Output sourcemaps for debugging in production
    sourcemap: false,
    // Emit manifest for build validation
    manifest: true
  },
  server: {
    host: '0.0.0.0',    // allow external connections
    port: 5173,
    strictPort: true,
    cors: true,        // allow cross-origin
    allowedHosts: 'all',
    proxy: {
      // Development proxy only — production uses VITE_API_URL from docker-compose.yml
      '/menu': 'http://backend:3000',
      '/order': 'http://backend:3000',
      '/owner-command': 'http://backend:3000',
      '/health': 'http://backend:3000'
    }
  }
});
