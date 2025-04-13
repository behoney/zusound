import type { StateCreator, StoreMutatorIdentifier } from 'zustand/vanilla'
import type { DiffResult } from '../diff' // Import DiffResult from diff package

/** Utility type to modify properties of an existing type. */
type Write<T, U> = Omit<T, keyof U> & U

/**
 * Represents the type of a store enhanced with the trace middleware.
 * In this basic version, it doesn't alter the public signature significantly,
 * but defining it maintains the pattern for potential future extensions.
 */
type WithZusound<S> = S // Keep this simple for now

/**
 * Augments the Zustand vanilla module definition.
 * This allows TypeScript to recognize the custom mutator type added by this middleware.
 */
declare module 'zustand/vanilla' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface StoreMutators<S, A> {
    // This defines the state mutation caused by the middleware
    zusound: WithZusound<S>
  }
}

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

/** Configuration options for the trace middleware. */
export interface TraceOptions<T> {
  /**
   * A callback function that receives the trace data after each state update.
   * Use this to log, send data, etc.
   */
  onTrace?: (traceData: TraceData<T>) => void
  /**
   * Optional custom diffing function.
   * Defaults to the `calculateDiff` function from the diff package.
   */
  diffFn?: (prevState: T, nextState: T) => DiffResult<T> // Use imported DiffResult type
}

/** Public type signature for the trace middleware function. */
export type Trace = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  // The initializer receives ZusoundMutator in its Mps list
  initializer: StateCreator<T, [...Mps], Mcs>,
  options?: TraceOptions<T>
  // The returned creator has ZusoundMutator added to its Mcs list
) => StateCreator<T, Mps, [...Mcs]>

/** Internal type signature for the trace middleware's implementation. */
export type TraceImpl = <T>(
  initializer: StateCreator<T, [], []>, // Implementation works on the base creator
  options?: TraceOptions<T>
) => StateCreator<T, [], []>
