import type { StoreMutatorIdentifier, StateCreator } from 'zustand'
// Import TraceOptions and TraceData from core, DiffResult from diff
import type { TraceOptions, TraceData } from '../core'
import type { DiffResult } from '../diff'

/**
 * Interface for zusound middleware options.
 * Extends the core TraceOptions with middleware-specific settings.
 */
export interface ZusoundOptions<T> extends Omit<TraceOptions<T>, 'onTrace'> {
  /** Enable/disable sound feedback (default: true in dev, false in prod) */
  enabled?: boolean
  /** Log state diffs to window.__zusound_logger__ (default: false) */
  logDiffs?: boolean
  /** Allow in production (default: false) */
  allowInProduction?: boolean
  /**
   * Optional custom diffing function. Overrides the one in TraceOptions if provided.
   * Defaults to the `calculateDiff` function from the diff package.
   */
  diffFn?: (prevState: T, nextState: T) => DiffResult<T>
  /**
   * Optional callback executed after sonification for each state change.
   * Receives trace data (state, diff, duration, etc.). This is separate from
   * the internal onTrace used by the core trace middleware.
   */
  onTrace?: (traceData: TraceData<T>) => void
  /**
   * Show a persistent visualizer UI in the corner of the screen (default: false).
   * This simply shows/hides the UI element based on this flag initially.
   * Manual control is available via `showPersistentVisualizer` / `hidePersistentVisualizer`.
   */
  persistVisualizer?: boolean
  /**
   * Automatically initialize the sonification listener when middleware is used (default: true).
   * Set to false if you want to manually control when sonification starts using initSonificationListener.
   */
  initSonification?: boolean
}

/**
 * Type definition for the zusound middleware function.
 * This type captures the middleware's generic parameters and return type.
 */
export type Zusound = <
  T extends object,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  initializer: StateCreator<T, [...Mps] | [...Mps], Mcs>, // Adjusted Mps signature for compatibility
  options?: ZusoundOptions<T>
) => StateCreator<T, Mps, [...Mcs]>

// Note: We don't need to re-import ZusoundOptions from './types' as it's defined here.
