// packages/visualizer/src/factory.ts

import {
  VisualizerManager,
  type VisualizerOptions,
  type VisualizerInstance,
} from './visualizer-manager'

/**
 * Create or get the singleton visualizer instance with configuration options
 *
 * @param options Configuration options for the visualizer
 * @returns The visualizer instance
 *
 * @example
 * ```typescript
 * import { createVisualizer } from '@zusound/visualizer'
 *
 * const visualizer = createVisualizer({
 *   position: 'top-right',
 *   size: 'medium',
 *   draggable: true,
 *   autoShow: true
 * })
 *
 * // Event handling
 * visualizer.on('show', () => console.log('Visualizer shown!'))
 * visualizer.on('hide', () => console.log('Visualizer hidden!'))
 *
 * // Control methods
 * visualizer.show()
 * visualizer.hide()
 * visualizer.toggle()
 * ```
 */
export function createVisualizer(options: VisualizerOptions = {}): VisualizerInstance {
  return VisualizerManager.getInstance(options)
}

/**
 * Get the current visualizer instance (if exists)
 *
 * @returns The current visualizer instance or null if none exists
 */
export function getVisualizer(): VisualizerInstance | null {
  try {
    return VisualizerManager.getInstance()
  } catch {
    return null
  }
}

/**
 * Check if a visualizer instance currently exists
 *
 * @returns True if a visualizer instance exists
 */
export function hasVisualizer(): boolean {
  try {
    return !!VisualizerManager.getInstance()
  } catch {
    return false
  }
}

/**
 * Destroy the current visualizer instance
 * Useful for cleanup or resetting the visualizer state
 */
export function destroyVisualizer(): void {
  VisualizerManager.reset()
}
