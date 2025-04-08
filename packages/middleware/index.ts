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

import type { StateCreator, StoreMutatorIdentifier } from 'zustand/vanilla'
import { isProduction } from './utils'
import type { TraceOptions, ZusoundMutator } from '../core'
import { trace } from '../core'

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
interface zusoundOptions<T> extends Omit<TraceOptions<T>, 'enabled' | 'logDiffs'> {
  /** Enable/disable sound feedback (default: true in dev, false in prod) */
  enabled?: boolean
  /** Log state diffs to console (default: false) */
  logDiffs?: boolean
  /** Allow in production (default: false) */
  allowInProduction?: boolean
}

/**
 * zusound middleware for Zustand
 * Extends the core trace middleware with additional user-friendly options
 */
export const zusound = <
  T extends object,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  initializer: StateCreator<T, [...Mps, ZusoundMutator], Mcs>,
  options: zusoundOptions<T> = {}
): StateCreator<T, Mps, [ZusoundMutator, ...Mcs]> => {
  const { enabled = true, logDiffs = false, allowInProduction = false, ...restOptions } = options

  // Check if we should run in production
  const inProduction = isProduction()
  const disableInProduction = inProduction && !allowInProduction

  // If explicitly disabled or we're in production and not allowing it
  if (enabled === false || disableInProduction) {
    // Return the initializer without applying the middleware
    // Need to cast because the return type expects the ZusoundMutator
    return initializer as unknown as StateCreator<T, Mps, [ZusoundMutator, ...Mcs]>
  }

  // Create onTrace handler that logs diffs if requested
  const traceOptions: TraceOptions<T> = {
    ...restOptions,
  }

  // Add diff logging if requested
  if (logDiffs) {
    const originalOnTrace = traceOptions.onTrace

    // TODO(#10):: we need to find a better way to do this
    window['__zusound_logger__'] = []

    traceOptions.onTrace = traceData => {
      window['__zusound_logger__'].push(traceData)
      if (originalOnTrace) {
        originalOnTrace(traceData)
      }
    }
  }

  // Apply the trace middleware with proper type handling
  // We need to cast the result to match the expected return type signature
  return trace(initializer as StateCreator<T, [], []>) as StateCreator<
    T,
    Mps,
    [ZusoundMutator, ...Mcs]
  >
}
