import type { StoreMutatorIdentifier, StateCreator } from 'zustand'
import type { TraceOptions, DiffResult, TraceData } from '../core'
import { ZusoundOptions } from './types'

/**
 * Interface for zusound middleware options
 */
export interface ZusoundOptions<T> extends Omit<TraceOptions<T>, 'onTrace'> {
  /** Enable/disable sound feedback (default: true in dev, false in prod) */
  enabled?: boolean
  /** Log state diffs to window.__zusound_logger__ (default: false) */
  logDiffs?: boolean
  /** Allow in production (default: false) */
  allowInProduction?: boolean
  /** Optional custom diffing function */
  diffFn?: (prevState: T, nextState: T) => DiffResult<T>
  /**
   * Optional callback executed after sonification for each state change.
   * Receives trace data (state, diff, duration, etc.).
   */
  onTrace?: (traceData: TraceData<T>) => void
  /**
   * Show a persistent visualizer UI in the corner of the screen (default: false).
   * This simply shows/hides the UI element based on this flag.
   */
  persistVisualizer?: boolean
} /**
 * Type definition for the zusound middleware function.
 * This type captures the middleware's generic parameters and return type.
 */

export type Zusound = <
  T extends object,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  initializer: StateCreator<T, [...Mps] | [...Mps], Mcs>,
  options?: ZusoundOptions<T>
) => StateCreator<T, Mps, [...Mcs]>
