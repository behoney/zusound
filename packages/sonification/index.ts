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
 * // With event-based architecture:
 * import { initSonificationListener } from "@zusound/sonification";
 * initSonificationListener(); // Start listening for trace events
 *
 * // For direct manual control (legacy):
 * import { sonifyChanges } from "@zusound/sonification";
 * sonifyChanges(stateChanges, 200); // Play sounds with 200ms duration
 * ```
 */

// Import types
import type { ZusoundTraceEvent } from '../middleware/zusound'
import type { TraceData } from '../core'

// Core sonification functions (internal)
import { sonifyChanges as internalSonifyChanges, playSonicChunk } from './sonification'

// Types
export type { SonicChunk } from './types'

// Utilities
export { AudioContextManager } from './utils'

// Constants (for advanced configuration)
export { AUDIO_CONFIG } from './constants'

// Flag to prevent multiple listener attachments
let isListenerAttached = false

/**
 * Handles the trace event and triggers sonification.
 */
function handleTraceEvent(event: Event): void {
  // Type guard
  const zusoundEvent = event as ZusoundTraceEvent<unknown>
  if (zusoundEvent.type === 'zusound:trace' && zusoundEvent.detail?.traceData) {
    // Extract the diff and duration from the trace data
    const traceData = zusoundEvent.detail.traceData as TraceData<unknown>
    const { diff, duration } = traceData
    
    // The diff property of TraceData is already of type DiffResult<T> which is compatible with Partial<T>
    // This is safe to use with sonifyChanges which expects Partial<T>
    internalSonifyChanges(diff as Partial<unknown>, duration)
  }
}

/**
 * Initializes the sonification module by attaching the event listener.
 * Ensures the listener is attached only once.
 */
export function initSonificationListener(): void {
  if (isListenerAttached || typeof window === 'undefined') {
    return
  }
  window.addEventListener('zusound:trace', handleTraceEvent)
  isListenerAttached = true
  console.log('Zusound Sonification listener attached.')
}

/**
 * Detaches the event listener. Useful for cleanup.
 */
export function cleanupSonificationListener(): void {
  if (!isListenerAttached || typeof window === 'undefined') {
    return
  }
  window.removeEventListener('zusound:trace', handleTraceEvent)
  isListenerAttached = false
  console.log('Zusound Sonification listener removed.')
}

// Expose the original sonifyChanges function for backwards compatibility and direct use
export { internalSonifyChanges as sonifyChanges, playSonicChunk }
