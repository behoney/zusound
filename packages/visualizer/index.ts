// Core visualizer functionality
export { createVisualizer, getVisualizer, hasVisualizer, destroyVisualizer } from './src/factory'

// Developer tools
export {
  debugVisualizer,
  checkPerformance,
  getDebugInfo,
  exportDebugData,
  downloadDebugData,
} from './src/dev-tools'

// Types and interfaces
export type {
  VisualizerInstance,
  VisualizerOptions,
  VisualizerPosition,
  VisualizerSize,
  VisualizerTheme,
  VisualizerEventType,
  VisualizerEventListener,
} from './src/visualizer-manager'

export type { VisualizerPerformanceMetrics, VisualizerDebugInfo } from './src/dev-tools'

// Core classes (for advanced usage)
export { VisualizerManager } from './src/visualizer-manager'
