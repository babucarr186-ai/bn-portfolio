import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Dynamic base:
  // - For custom domains: default '/'
  // - For GitHub Pages repo path: set env VITE_BASE="/bn-portfolio/" in the workflow
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  build: {
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
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
})
