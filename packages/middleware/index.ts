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
import type { TraceOptions } from '../core/types'
import type { StateCreator } from 'zustand/vanilla'

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
 * Detect if running in production environment
 * This tries multiple common patterns for detecting production
 */
const isProduction = (): boolean => {
  // Check for common environment variables
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
    return true
  }

  // Check for Vite's import.meta.env (will be replaced at build time)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD === true) {
    return true
  }

  return false
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
export const zusound = <T extends object>(
  initializer: StateCreator<T>,
  options: zusoundOptions<T> = {}
) => {
  const { enabled = true, logDiffs = false, allowInProduction = false, ...restOptions } = options

  // Check if we should run in production
  const inProduction = isProduction()
  const disableInProduction = inProduction && !allowInProduction

  // If explicitly disabled or we're in production and not allowing it
  if (enabled === false || disableInProduction) {
    // In production, just return the original initializer without middleware
    return initializer
  }

  // Create onTrace handler that logs diffs if requested
  const traceOptions: TraceOptions<T> = {
    ...restOptions,
  }

  // Add diff logging if requested
  if (logDiffs) {
    const originalOnTrace = traceOptions.onTrace
    traceOptions.onTrace = traceData => {
      console.log('[zusound] State changes:', traceData.diff)
      if (originalOnTrace) {
        originalOnTrace(traceData)
      }
    }
  }

  return trace(initializer, traceOptions)
}
