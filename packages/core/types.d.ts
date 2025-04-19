import type { StateCreator, StoreMutatorIdentifier } from 'zustand/vanilla'
import type { DiffResult } from '../diff' // Import DiffResult from diff package


/** Utility type to modify properties of an existing type. */
// type Write<T, U> = Omit<T, keyof U> & U // Not currently used in core middleware

/**
 * Defines the unique mutator identifier tuple for zusound.
 * Changed `never` to `unknown` to align with Zustand's internal generic constraints
 * on `Mps` and `Mcs` which use `[StoreMutatorIdentifier, unknown][]`.
 */
export type ZusoundMutatorTuple = ['zustand/zusound', unknown];


/**
 * Augments the Zustand vanilla module definition.
 * This allows TypeScript to recognize the custom mutator type added by this middleware.
 * Make sure the key 'zustand/zusound' matches the string literal in ZusoundMutatorTuple.
 */
declare module 'zustand/vanilla' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface StoreMutators<S, A> {
    // This registers 'zustand/zusound' as a valid key in the StoreMutators union.
    // The type here indicates what applying this mutator results in for the store type S.
    // It doesn't add public actions via set(..., action), so S is appropriate here.
    'zustand/zusound': S
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
  /** Optional action identifier (from zustand devtools middleware for example) */
  action?: string | object
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
  U = T // Initial state slice type (often T, but can differ)
>(
  // The initializer receives Mps and Mcs from the previous middleware
  initializer: StateCreator<T, Mps, Mcs, U>,
  options?: TraceOptions<T>
  // The returned creator has the same Mps, but adds ZusoundMutatorTuple to Mcs
) => StateCreator<T, Mps, [...Mcs, ZusoundMutatorTuple], U>


/**
 * Internal type signature for the trace middleware's implementation.
 * This should be the same as the public `Trace` type.
 */
export type TraceImpl = Trace;

// Remove the redundant zusound function export from here
// export function zusound< ... > { ... } // REMOVE