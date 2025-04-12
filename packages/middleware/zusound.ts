import type { StoreMutatorIdentifier, StateCreator } from 'zustand'
import { type TraceOptions, type TraceData, trace } from '../core'
import { Zusound, ZusoundOptions } from './types'
import { isProduction } from './utils'

/**
 * zusound middleware for Zustand
 * Extends the core trace middleware with additional user-friendly options
 * and correctly handles middleware composition.
 */

export const zusound: Zusound = <
  T extends object,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  initializer: StateCreator<T, [...Mps], Mcs>,
  options: ZusoundOptions<T> = {}
) => {
  const {
    enabled = !isProduction(), // Default to enabled in dev, disabled in prod
    logDiffs = false,
    allowInProduction = false,
    onTrace: userOnTrace, // Rename original onTrace to avoid conflict
    diffFn,
    ...restOptions
  } = options

  // Check if we should run
  const inProduction = isProduction()
  const disable = enabled === false || (inProduction && !allowInProduction)

  if (disable) {
    // If disabled, remove the  type from Mps and return
    // We need to cast because the original initializer expects
    // Assert the type to match the function's declared return signature
    return initializer as unknown as StateCreator<T, Mps, [...Mcs]>
  }

  // --- Prepare TraceOptions ---
  const traceOptions: TraceOptions<T> = {
    ...restOptions,
    diffFn, // Pass the diff function if provided
  }

  // --- Setup Logging ---
  if (logDiffs) {
    // Initialize logger if it doesn't exist
    if (typeof window !== 'undefined' && !window['__zusound_logger__']) {
      window['__zusound_logger__'] = []
    }

    traceOptions.onTrace = (traceData: TraceData<T>) => {
      if (typeof window !== 'undefined' && window['__zusound_logger__']) {
        window['__zusound_logger__'].push(traceData)
      }
      // Call the user's original onTrace if it exists
      if (userOnTrace) {
        try {
          userOnTrace(traceData)
        } catch (error) {
          console.error("Error in user-provided 'onTrace' callback:", error)
        }
      }
    }
  } else if (userOnTrace) {
    // If only userOnTrace is provided (no logDiffs)
    traceOptions.onTrace = userOnTrace
  }

  // Call the core trace function with the initializer and options
  // The 'trace' function now has the correct public signature
  return trace(initializer, traceOptions)
}
