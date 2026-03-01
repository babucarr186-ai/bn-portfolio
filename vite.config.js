import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  // Dynamic base:
  // - Use a relative base by default so the same build works on:
  //   - GitHub Pages project sites (served under /<repo>/)
  //   - Custom domains (served at /)
  // - Can still be overridden via env VITE_BASE if needed
  base: process.env.VITE_BASE || './',
  plugins: [react()],
  build: {
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      input: {
        index: resolve(projectRoot, 'index.html'),
        ipads: resolve(projectRoot, 'ipads.html'),
        macbook: resolve(projectRoot, 'macbook.html'),
        appleWatch: resolve(projectRoot, 'apple-watch.html'),
        airpods: resolve(projectRoot, 'airpods.html'),
        giftCards: resolve(projectRoot, 'gift-cards.html'),
        accessories: resolve(projectRoot, 'accessories.html'),
        appleTvHome: resolve(projectRoot, 'apple-tv-home.html'),
        premium: resolve(projectRoot, 'uncle-apple-premium.html'),
      },
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: false,
    css: true,
  },
})
