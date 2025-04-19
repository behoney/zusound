import type { StoreMutatorIdentifier as ZustandStoreMutatorIdentifier, StateCreator } from 'zustand'
// Import ZusoundMutatorTuple, TraceOptions and TraceData from core
import type { ZusoundMutatorTuple, TraceOptions, TraceData } from '../core'
import type { DiffResult } from '../diff' // Import DiffResult


/**
 * Interface for zusound middleware options.
 * Extends the core TraceOptions with middleware-specific settings.
 * Omit onTrace and diffFn here so the middleware can provide its own defaults/wrapping
 * before passing down to core, but allow overriding via ZusoundOptions.
 */
export interface ZusoundOptions<T> extends Omit<TraceOptions<T>, 'onTrace' | 'diffFn'> { // Omit here
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
  diffFn?: (prevState: T, nextState: T) => DiffResult<T> // Add back here
  /**
   * Optional callback executed after sonification for each state change.
   * Receives trace data (state, diff, duration, etc.). This is the primary
   * way to interact with the trace data from the middleware layer.
   */
  onTrace?: (traceData: TraceData<T>) => void // Add back here
  /**
   * Automatically initialize the sonification listener when middleware is used (default: true).
   * Set to false if you want to manually control when sonification starts using initSonificationListener.
   */
  initSonification?: boolean
}

/**
 * Middleware entry function for zusound.
 * It wraps the core `trace` middleware with middleware-specific options and logic.
 * It follows the standard Zustand middleware pattern.
 */
export interface Zusound {
  <T extends object, // Base state type
    Mps extends [ZustandStoreMutatorIdentifier, unknown][] = [], // Middleware Past Set
    Mcs extends [ZustandStoreMutatorIdentifier, unknown][] = [], // Middleware Current Set
    U = T // Initial state slice type
  >(
    // The initializer receives Mps and Mcs from the previous middleware
    initializer: StateCreator<T, Mps, Mcs, U>,
    options?: ZusoundOptions<T>
  ): StateCreator<T, Mps, [...Mcs, ZusoundMutatorTuple], U>; // Returns StateCreator with ZusoundMutatorTuple added to Mcs
}

// Note: The `StoreMutators` augmentation is handled in packages/core/types.d.ts

// Export ZusoundMutatorTuple for advanced users if needed
// export { ZusoundMutatorTuple } from '../core' // Can re-export if desired