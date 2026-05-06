import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.CI ? '/slo-scroller/' : '/',
  server: {
    open: false,
  },
});