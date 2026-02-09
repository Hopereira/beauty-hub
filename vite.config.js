import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'src/pages/auth/login.html'),
        register: resolve(__dirname, 'src/pages/auth/register.html'),
        dashboard: resolve(__dirname, 'src/pages/dashboard/index.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true
  }
});
