import type { StateCreator, StoreMutatorIdentifier } from 'zustand/vanilla'
import type { DiffResult } from '../diff' // Import DiffResult from diff package


// DiffResult is now imported from '../diff'

/** Data structure containing information about a single state transition. */
export interface TraceData<T = unknown> {
  /** The calculated difference between prevState and nextState. */
  diff: DiffResult<T> // Use imported DiffResult type
  /** Timestamp when the update started processing. */
  timestampStart: number
  /** Duration of the update in milliseconds. */
  duration: number
}

/** Detail payload for the trace event */
export interface ZusoundTraceEventDetail<T = unknown> {
  traceData: TraceData<T>
}

/** Configuration options for the trace middleware. */
export interface TraceOptions<T> {
  /**
   * A callback function that receives the trace data after each state update.
   * Use this to log, send data, etc.
   */
  onTrace?: (traceData: TraceData<T>) => void
  /**
   * Optional custom diffing function.
   * Defaults to the calculateDiff function from the diff package.
   */
  diffFn?: (prevState: T, nextState: T) => DiffResult<T> // Use imported DiffResult type
}

/**
 * Public type signature for the trace middleware function.
 * It follows the standard Zustand middleware pattern.
 */
export type Trace = <
  T, // Base state type
  Mps extends [StoreMutatorIdentifier, unknown][] = [], // Middleware Past Set
  Mcs extends [StoreMutatorIdentifier, unknown][] = [], // Middleware Current Set
>(
  // The initializer receives Mps and Mcs from the previous middleware
  initializer: StateCreator<T, Mps, Mcs>,
  options?: TraceOptions<T>
  // The returned creator has the same Mps, but adds ZusoundMutatorTuple to Mcs
) => StateCreator<T, Mps, [ZusoundMutatorTuple, ...Mcs]>
