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

// Export middleware (recommended entry point for Zustand enhancement)
export * from './middleware/index'

// Export sonification utilities (for initialization and advanced use)
export * from './sonification/index'

// Export diff utilities (primarily for custom diff functions)
export * from './diff/index'

// Export visualizer controls (for manual UI management)
export {
  showPersistentVisualizer,
  hidePersistentVisualizer,
  visualizeSonicChunk,
  ensureVisualizerReady,
} from './visualizer/index'

// Export core types that might be needed (e.g., for custom onTrace)
export type { TraceData, ZusoundTraceEventDetail } from './core/index'
