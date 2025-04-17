import type { StoreMutatorIdentifier, StateCreator } from 'zustand'
import type { TraceOptions, TraceData, ZusoundTraceEventDetail } from '../core' // Import ZusoundTraceEventDetail from core
import { trace } from '../core' // Core trace functionality
import type { Zusound, ZusoundOptions } from './types' // Middleware-specific types
import { isProduction } from './utils' // Utility functions
import { initSonificationListener } from '../sonification' // Import for initialization but not direct calls

// Define the custom event type using the detail from core
export type ZusoundTraceEvent<T = unknown> = CustomEvent<ZusoundTraceEventDetail<T>>

/**
 * Dispatches a trace event containing the trace data.
 * Visualizer and sonification components can listen for this event.
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
 * Applies state change sonification and optional visualization.
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
    initSonification = true, // Default to true for backward compatibility
    ...restOptions // Remaining options passed down to core trace
  } = options

  const inProduction = isProduction()
  const isDisabled = !enabled || (inProduction && !allowInProduction)

  // If middleware is disabled, return the original initializer
  if (isDisabled) {
    return initializer as StateCreator<T, Mps, [...Mcs]>
  }

  // Initialize sonification listener if requested (runs once)
  if (typeof window !== 'undefined' && initSonification) {
    // Use setTimeout to ensure DOM is ready and avoid blocking initial render
    setTimeout(() => {
      try {
        initSonificationListener() // Initialize sonification listener
      } catch (error) {
        console.error('Error initializing sonification:', error)
      }
    }, 0)
  }

  // --- Custom trace processor (internal onTrace for core) ---
  const coreOnTrace = (traceData: TraceData<T>) => {
    // 1. Dispatch the trace event for sonification and visualization
    dispatchTraceEvent(traceData)

    // 2. Call user's onTrace callback if provided
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
    onTrace: coreOnTrace, // Use the internal handler that dispatches events & calls user callback
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
      // Call the original handler (which dispatches events + user callback)
      originalCoreOnTrace(traceData)
    }
  }

  // Apply the core trace middleware with the prepared options
  // Note: Type assertion is needed because the generic constraints differ slightly
  // between the public Zusound type and the internal Trace type.
  return trace(initializer, traceOptions) as StateCreator<T, Mps, [...Mcs]>
}
