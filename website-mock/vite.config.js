import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3005,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:50001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:50001',
        changeOrigin: true,
      },
      // The admin SPA + all portals (tenant/landlord/provider/register/sign) live
      // under /admin on the backend origin — proxy them so http://localhost:3005/admin
      // and the portal links work exactly as they do on :50001.
      '/admin': {
        target: 'http://127.0.0.1:50001',
        changeOrigin: true,
      }
    }
  }
});

