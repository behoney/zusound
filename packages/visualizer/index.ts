// Public API for the zusound visualizer package

import { SonicChunk } from '../sonification'
import { Visualizer } from './src/visualizer-core' // Import the core singleton class
import type { ZusoundEventDetail } from './types' // Import event detail type

// Re-export UI control functions from dialog.ts
export { showPersistentVisualizer, hidePersistentVisualizer } from './dialog'

export { Visualizer } from './src/visualizer-core'

/**
 * Ensures the visualizer singleton is initialized and listening for events.
 * Useful for pre-warming the visualizer if needed.
 */
export function ensureVisualizerReady(): void {
  Visualizer.getInstance() // Accessing getInstance handles initialization
}

/**
 * Manually triggers the visualization for a given SonicChunk.
 * This dispatches the 'zusound' custom event, which the visualizer listens for.
 * Useful for testing or custom visualization triggers.
 *
 * @param chunk - The SonicChunk data to visualize.
 */
export function visualizeSonicChunk(chunk: SonicChunk): void {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent<ZusoundEventDetail>('zusound', { detail: { chunk } })
    window.dispatchEvent(event)
  } else {
    console.warn('Cannot visualizeSonicChunk outside of a browser environment.')
  }
}

// Optional: Export the Visualizer class itself for advanced use cases,
// though typically interacting via the functions is preferred.
// export { Visualizer };

// Re-export relevant types
export type { ZusoundEvent, ZusoundEventDetail } from './types'
