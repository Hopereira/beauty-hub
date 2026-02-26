import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // SPA fallback: all routes serve index.html
  appType: 'spa',
});
