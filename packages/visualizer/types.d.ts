import type { SonicChunk } from '../shared-types'

/**
 * Interface for the custom event detail payload
 * containing the sonic chunk data to be visualized.
 */
export interface ZusoundEventDetail {
  chunk: SonicChunk
}

/**
 * Type definition for the custom 'zusound' event dispatched
 * when a sonification event occurs, intended for the visualizer.
 */
export interface ZusoundEvent extends CustomEvent {
  detail: ZusoundEventDetail
}

// Update the global WindowEventMap to include the custom 'zusound' event
declare global {
  interface WindowEventMap {
    zusound: ZusoundEvent
  }
  // Remove the declaration for __VISUALIZER_SINGLETON__
  // var __VISUALIZER_SINGLETON__: unknown; // No longer needed
}

// Keep VisualizerEvent type here or move to visualizer-core.ts if only used there.
// Let's keep it in visualizer-core.ts as it's an internal implementation detail.
// export interface VisualizerEvent { ... }
