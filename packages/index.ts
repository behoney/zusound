/**
 * Main entry point for the zusound library.
 *
 * Recommended usage is via the `zusound` middleware.
 * Other exports like `sonifyChanges` or visualizer controls are available
 * for advanced use cases.
 */

// Export middleware (recommended entry point)
export * from './middleware'

// Export sonification utilities (for advanced use)
export * from './sonification'

// Export diff utilities (primarily for custom diff functions)
export * from './diff'

// Export visualizer controls (for manual UI management)
// These are also exported from './middleware' for convenience
export {
  showPersistentVisualizer,
  hidePersistentVisualizer,
  visualizeSonicChunk, // Added export for manual visualization trigger
} from './visualizer'

// Export core types that might be needed (e.g., for custom onTrace)
export type { TraceData } from './core'
