/**
 * zusound Sonification Module
 *
 * This module provides tools to convert state changes in a Zustand store
 * into auditory feedback through the Web Audio API.
 *
 * Key features:
 * - Converts state changes (diffs) into sonic representations
 * - Maps different data types to different sound characteristics
 * - Provides utilities for playing these sounds with proper timing
 *
 * Basic usage:
 * ```
 * // Automatically initialized when using the middleware (default behavior)
 * import { zusound } from "zusound";
 * 
 * // For manual initialization:
 * import { initSonificationListener } from "zusound";
 * initSonificationListener();
 * ```
 */

import type { ZusoundTraceEventDetail } from '../core'
import { sonifyChanges as internalSonifyChanges } from './sonification'

// Core sonification functions
export { sonifyChanges, playSonicChunk } from './sonification'

// Types
export type { SonicChunk } from './types'

// Utilities
export { AudioContextManager } from './utils'

// Constants (for advanced configuration)
export { AUDIO_CONFIG } from './constants'

/**
 * Handles the trace event and triggers sonification.
 */
function handleTraceEvent(event: Event): void {
  // Type guard using CustomEvent and detail structure
  if (event instanceof CustomEvent && event.type === 'zusound:trace' && event.detail?.traceData) {
    // Cast detail to the imported type
    const detail = event.detail as ZusoundTraceEventDetail<unknown>
    const traceData = detail.traceData
    const { diff, duration } = traceData

    // Based on DiffResult type definition in packages/diff/types.d.ts,
    // for object types it's Partial<T>
    if (diff && typeof diff === 'object') {
      internalSonifyChanges(diff as Partial<unknown>, duration)
    }
  }
}

/**
 * Initializes the sonification event listener.
 * Call this function during app setup to start listening for state change events.
 *
 * Note: This is automatically called by the middleware unless
 * { initSonification: false } is specified in the options.
 */
export function initSonificationListener(): void {
  if (typeof window !== 'undefined') {
    // Remove any existing listener to prevent duplicates
    window.removeEventListener('zusound:trace', handleTraceEvent)
    // Add the listener
    window.addEventListener('zusound:trace', handleTraceEvent)
  }
}

/**
 * Removes the sonification event listener.
 * Call this function to stop listening for state change events.
 */
export function removeSonificationListener(): void {
  if (typeof window !== 'undefined') {
    window.removeEventListener('zusound:trace', handleTraceEvent)
  }
}
