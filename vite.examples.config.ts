import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'move-index-html',
      closeBundle: async () => {
        // After the build is complete, move the examples/index.html to the root
        const examplesIndexPath = path.resolve(__dirname, 'dist/examples/index.html')
        const rootIndexPath = path.resolve(__dirname, 'dist/index.html')

        if (fs.existsSync(examplesIndexPath)) {
          // Read the file content
          const content = fs.readFileSync(examplesIndexPath, 'utf-8')

          // Write it to the root directory
          fs.writeFileSync(rootIndexPath, content)

          // Delete the original file to avoid duplication
          fs.unlinkSync(examplesIndexPath)

          console.log('Successfully moved index.html to dist root')
        } else {
          console.error('Could not find examples/index.html')
        }
      },
    },
  ],

  // Configure for GitHub Pages
  base: '/zusound/', // Replace with your repo name

  // Use examples/main.tsx as the entry point but place index.html at root
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'examples/index.html'),
      },
      output: {
        // Ensure index.html goes to root instead of examples subdirectory
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
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
