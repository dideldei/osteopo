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
});


