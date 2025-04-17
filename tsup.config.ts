import { defineConfig } from 'tsup'

// Determine environment
const isProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  entry: ['packages/index.ts'],
  format: ['esm', 'cjs'], // ESM for import, CJS for require
  dts: true, // Generate declaration files
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  external: ['zustand'],
  outDir: 'dist',
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.es.js' : '.umd.js',
    }
  },
  // Define environment variables that would normally be provided by Vite
  define: {
    'import.meta.env.PROD': isProduction ? 'true' : 'false',
    'import.meta.env.DEV': isProduction ? 'false' : 'true',
    'process.env.NODE_ENV': isProduction ? '"production"' : '"development"',
  },
  // Include shims for browser APIs when targeting Node.js
  shims: true,
  // Set this to handle browser/node environments properly
  platform: 'neutral',
  // Explicitly specify the tsconfig file for the build
  tsconfig: 'tsconfig.build.json', // <--- Explicitly use the build tsconfig
})
