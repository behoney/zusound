/**
 * Middleware package for Zustand state tracking with sound feedback.
 *
 * This package provides optimized APIs that implement best practices for the core functionality:
 * - Exposes a refined interface over the core tracing capabilities
 * - Allows configuration of sonification parameters and thresholds
 * - Maintains consistent behavior while providing tuning capabilities
 *
 * The middleware serves as the recommended entry point for most applications,
 * with sensible defaults and a streamlined API surface.
 */

import { trace } from '../core/index'
import type { TraceOptions, ZusoundMutator, DiffResult, TraceData } from '../core/types' // Import necessary types
import type { StateCreator, StoreMutatorIdentifier } from 'zustand/vanilla' // Import Zustand types
import { isProduction } from './utils'

// Augment ImportMeta to support Vite's environment variables
declare global {
  interface ImportMeta {
    env?: {
      PROD?: boolean
      DEV?: boolean
    }
  }
}

/**
 * Interface for zusound middleware options
 */
interface ZusoundOptions<T> extends TraceOptions<T> {
  /** Enable/disable sound feedback (default: true in dev, false in prod) */
  enabled?: boolean
  /** Log state diffs to console (default: false) */
  logDiffs?: boolean
  /** Allow in production (default: false) */
  allowInProduction?: boolean
  /** Optional custom diffing function */
  diffFn?: (prevState: T, nextState: T) => DiffResult<T>
}

/**
 * zusound middleware for Zustand
 * Extends the core trace middleware with additional user-friendly options
 * and correctly handles middleware composition.
 */
export const zusound = <
  T extends object,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  // Initializer type now includes the middleware generics
  initializer: StateCreator<T, [...Mps, ZusoundMutator], Mcs>,
  options: ZusoundOptions<T> = {}
  // Return type reflects the application of this middleware
): StateCreator<T, Mps, [ZusoundMutator, ...Mcs]> => {
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
    // If disabled, remove the ZusoundMutator type from Mps and return
    // We need to cast because the original initializer expects ZusoundMutator
    // Assert the type to match the function's declared return signature
    return initializer as unknown as StateCreator<T, Mps, [ZusoundMutator, ...Mcs]>
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
