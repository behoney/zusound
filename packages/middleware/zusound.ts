import type { StoreMutatorIdentifier, StateCreator } from 'zustand'
import type { TraceOptions, TraceData } from '../core' // Core trace functionality
import { trace } from '../core' // Core trace functionality
import type { Zusound, ZusoundOptions } from './types' // Middleware-specific types
import { isProduction } from './utils' // Utility functions
// REMOVE direct import of sonifyChanges
// import { sonifyChanges } from '../sonification'
import {
  ensureVisualizerReady, // Keep for ensuring visualizer is ready if needed
  showPersistentVisualizer as showVisualizerUI, // Rename import for clarity
} from '../visualizer' // Visualizer UI control

// Define a type for the event detail
export interface ZusoundTraceEventDetail<T = unknown> {
  traceData: TraceData<T>
}

// Define the custom event type
export type ZusoundTraceEvent<T = unknown> = CustomEvent<ZusoundTraceEventDetail<T>>

/**
 * Dispatches a trace event.
 */
function dispatchTraceEvent<T>(traceData: TraceData<T>): void {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent<ZusoundTraceEventDetail<T>>('zusound:trace', {
      detail: { traceData },
    })
    window.dispatchEvent(event)
  }
}

/**
 * zusound middleware for Zustand
 * Applies state change sonification and optional visualization via events.
 */
export const zusound: Zusound = <
  T extends object,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  initializer: StateCreator<T, [...Mps], Mcs>,
  options: ZusoundOptions<T> = {}
): StateCreator<T, Mps, [...Mcs]> => {
  const {
    enabled = !isProduction(),
    logDiffs = false,
    allowInProduction = false,
    onTrace: userOnTrace, // User-defined callback *after* event dispatch
    diffFn, // Custom diff function
    persistVisualizer = false, // Option to show persistent UI on init
    // Add options to control if default listeners should be initialized?
    // initSonificationListener = true,
    // initVisualizerListener = true,
    ...restOptions // Remaining options passed down to core trace
  } = options

  const inProduction = isProduction()
  const isDisabled = !enabled || (inProduction && !allowInProduction)

  // If middleware is disabled, return the original initializer
  if (isDisabled) {
    return initializer as StateCreator<T, Mps, [...Mcs]>
  }

  // Initialize visualizer UI if requested (runs once)
  // Visualizer Core initialization and its own 'zusound' event listener
  // are handled internally by the Visualizer singleton now.
  if (typeof window !== 'undefined') {
    // Use setTimeout to ensure DOM is ready and avoid blocking initial render
    setTimeout(() => {
      try {
        ensureVisualizerReady() // Ensures the visualizer singleton is initialized and listening
        if (persistVisualizer) {
          showVisualizerUI() // Show the persistent UI element
        }
      } catch (error) {
        console.error('Error initializing visualizer UI:', error)
      }
    }, 0)
  }

  // --- Custom trace processor (internal onTrace for core) ---
  const coreOnTrace = (traceData: TraceData<T>) => {
    // 1. Dispatch the trace event (instead of directly calling sonifyChanges)
    dispatchTraceEvent(traceData)

    // 2. Call user's onTrace callback if provided
    // This now runs *after* the event is dispatched
    if (userOnTrace) {
      try {
        userOnTrace(traceData)
      } catch (error) {
        console.error("Error in user-provided 'onTrace' callback:", error)
      }
    }
  }

  // --- Prepare TraceOptions for the core trace middleware ---
  const traceOptions: TraceOptions<T> = {
    ...restOptions, // Pass down any remaining compatible options
    diffFn, // Pass down custom diff function if provided
    onTrace: coreOnTrace, // Use the internal handler that dispatches the event
  }

  // --- Setup Logging ---
  // Wrap the coreOnTrace if logging is enabled
  if (logDiffs) {
    if (typeof window !== 'undefined' && !window['__zusound_logger__']) {
      window['__zusound_logger__'] = [] // Initialize logger array if needed
    }
    // Keep the original coreOnTrace to call it after logging
    const originalCoreOnTrace = traceOptions.onTrace as (traceData: TraceData<T>) => void
    traceOptions.onTrace = (traceData: TraceData<T>) => {
      if (typeof window !== 'undefined' && window['__zusound_logger__']) {
        // Push a copy to avoid mutation issues if traceData is modified later
        window['__zusound_logger__'].push({ ...traceData })
      }
      // Call the original handler (which dispatches event + user callback)
      originalCoreOnTrace(traceData)
    }
  }

  // Apply the core trace middleware with the prepared options
  // Note: Type assertion is needed because the generic constraints differ slightly
  // between the public Zusound type and the internal Trace type.
  return trace(initializer, traceOptions) as StateCreator<T, Mps, [...Mcs]>
}
