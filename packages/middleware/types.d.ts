import type { StoreMutatorIdentifier as ZustandStoreMutatorIdentifier, StateCreator } from 'zustand'
// Import TraceOptions and TraceData from core, DiffResult from diff
import type { TraceOptions, TraceData } from '../core'
import type { DiffResult } from '../diff'

// Define the mutator type based on core/types.d.ts
type ZusoundMutator = ['zustand/zusound', never]

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
   * Automatically initialize the sonification listener when middleware is used (default: true).
   * Set to false if you want to manually control when sonification starts using initSonificationListener.
   */
  initSonification?: boolean
}

/**
 * Middleware entry function overloads for zusound.
 */
export interface Zusound {
  /**
   * Standalone usage: when no prior middlewares exist, preserve empty mutator lists.
   */
  <T extends object, U = T>(
    initializer: StateCreator<T, [], [], U>,
    options?: ZusoundOptions<T>
  ): StateCreator<T, [], [], U>;

  /**
   * Composed usage: add 'zustand/zusound' mutator to existing mutator list.
   */
  <T extends object,
    Mps extends [ZustandStoreMutatorIdentifier, unknown][],
    Mcs extends [ZustandStoreMutatorIdentifier, unknown][],
    U = T
  >(
    initializer: StateCreator<T, Mps, Mcs, U>,
    options?: ZusoundOptions<T>
  ): StateCreator<T, Mps, [...Mcs, ZusoundMutator], U>;
}

// Register 'zustand/zusound' mutator in Zustand's StoreMutators
declare module 'zustand/vanilla' {
  interface StoreMutators<S, _A> {
    'zustand/zusound': S & (_A extends unknown[] ? unknown : never)
  }
}

// Note: We don't need to re-import ZusoundOptions from './types' as it's defined here.
