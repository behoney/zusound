import type { StateCreator, StoreMutatorIdentifier } from 'zustand/vanilla'
// Import calculateDiff only for its return type. Consider making DiffResult generic if this feels odd.
import { calculateDiff } from '../diff'

/**
 * Unique identifier for the trace middleware's mutation type within Zustand.
 * Required for Zustand's middleware pattern.
 */
export type ZusoundMutator = ['zusound', never]

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

// Define a type for the Diff result, adjust as needed
// Using Partial<T> as a placeholder, assuming calculateDiff returns changed properties
export type DiffResult<T = unknown> = Partial<T> // Or potentially `unknown` or a specific interface

/** Data structure containing information about a single state transition. */
export interface TraceData<T = unknown> {
  /** The calculated difference between prevState and nextState. */
  diff: DiffResult<T>
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
  diffFn?: (prevState: T, nextState: T) => DiffResult<T>
  /**
   * Name to identify this store instance in traces, useful if multiple stores use the middleware.
   */
  name?: string
}

/** Public type signature for the trace middleware function. */
export type Trace = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  // The initializer receives ZusoundMutator in its Mps list
  initializer: StateCreator<T, [...Mps, ZusoundMutator], Mcs>,
  options?: TraceOptions<T>
  // The returned creator has ZusoundMutator added to its Mcs list
) => StateCreator<T, Mps, [ZusoundMutator, ...Mcs]>

/** Internal type signature for the trace middleware's implementation. */
export type TraceImpl = <T>(
  initializer: StateCreator<T, [], []>, // Implementation works on the base creator
  options?: TraceOptions<T>
) => StateCreator<T, [], []>