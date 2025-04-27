/**
 * Main entry point for the zusound library.
 *
 * Recommended usage pattern:
 * 1. Import and apply the `zusound` middleware to your Zustand store
 *    - Sonification is automatically initialized by default
 *    - Use { initSonification: false } to disable automatic initialization
 * 2. For advanced control, manually initialize sonification and visualization
 */

// Export shared types used across packages
export * from './shared-types/index'

// Export middleware
export * from './middleware/index'

export { visualizeSonicChunk, ensureVisualizerReady } from './visualizer/index'

