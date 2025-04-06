import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

// https://vite.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'packages/index.ts'),
      name: 'zusound',
      fileName: format => `zusound.${format}.js`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: ['zustand'],
      output: {
        globals: {
          zustand: 'zustand',
        },
      },
    },
    sourcemap: true,
    minify: true,
  },
  plugins: [
    dts({
      include: ['packages/**/*.ts'],
      exclude: ['**/node_modules/**', '**/examples/**', '**/__test__/**'],
      outDir: 'dist',
      staticImport: true,
      insertTypesEntry: true,
    }),
  ],
})
