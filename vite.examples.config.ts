import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Configure for GitHub Pages
  base: '/zusound/', // Replace with your repo name

  // Use examples/main.tsx as the entry point
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'examples/index.html'),
      },
    },
  },

  // Ensure we can resolve all the necessary paths
  resolve: {
    alias: {
      packages: resolve(__dirname, 'packages'),
    },
  },
})
