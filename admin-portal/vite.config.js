import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  build: {
    chunkSizeWarningLimit: 1000,
    // Optimize chunk splitting for faster loads
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-editor': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-link',
            '@tiptap/extension-image',
            '@tiptap/extension-youtube',
          ],
          'vendor-utils': ['axios', 'lucide-react'],
        },
      },
    },
    // Enable minification (esbuild is built-in and faster than terser)
    minify: 'esbuild',
    // Target modern browsers for smaller bundles
    target: 'es2020',
  },
  server: {
    host: '127.0.0.1',
    port: 3005,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1',
      port: 3005,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:50001',
        changeOrigin: true,
      },
      // Uploaded files (KYC, docs, photos) are served by the backend under /uploads.
      '/uploads': {
        target: 'http://127.0.0.1:50001',
        changeOrigin: true,
      }
    }
  }
})
