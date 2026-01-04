import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  base: '/osteopo/', // GitHub Pages base path
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    // Optimize build output
    minify: 'esbuild',
    target: 'es2020',
    sourcemap: false, // Disable source maps for production (smaller bundle)
    rollupOptions: {
      output: {
        // Optimize chunk splitting
        manualChunks: {
          'vendor': ['solid-js'],
        },
      },
    },
    // Reduce bundle size
    chunkSizeWarningLimit: 1000,
  },
});


