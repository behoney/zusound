// packages/core/traceMiddleware.ts
import type { StateCreator, StoreApi, StoreMutatorIdentifier } from 'zustand/vanilla'
import { calculateDiff } from '../diff'
// Import ZusoundMutatorTuple, TraceData, TraceOptions, TraceImpl from core types
import type { ZusoundMutatorTuple, TraceData, TraceOptions, TraceImpl } from './types' // ZusoundMutatorTuple is now ['zustand/zusound', unknown]
import type { DiffResult } from '../diff' // Explicitly import DiffResult

/**
 * Calculates the difference between states and timing information.
 */
const calculateTraceData = <T>(
  prevState: T,
  nextState: T,
  timestampStart: number,
  timestampEnd: number,
  diffFn: (prevState: T, nextState: T) => DiffResult<T>,
  action?: string | object // Include action here
): TraceData<T> => {
  const diff = diffFn(prevState, nextState)
  return {
    diff,
    timestampStart,
    duration: timestampEnd - timestampStart,
    action, // Add action to trace data
  }
}

/**
 * Processes the calculated trace data by sonifying changes and calling the onTrace callback.
 * We'll skip the default sonifyChanges call since it's handled by the event listener
 * registered by the zusound middleware layer.
 */
const processTrace = <T>(
  traceData: TraceData<T>,
  onTrace: (traceData: TraceData<T>) => void
): void => {
  // Execute the user-provided callback, handling potential errors.
  // Sonification is triggered by a listener on the 'zusound:trace' event.
  try {
    onTrace(traceData)
  } catch (error) {
    // Use a more specific console log for clarity
    console.error('[Zusound Core] Error in onTrace callback:', error)
  }
}
/**
 * Creates a wrapped setState function that includes tracing logic.
 * This wrapped function is passed to the *next* initializer in the chain.
 * It captures the state change before and after the state update occurs.
 */
const createTracedSetState = <T>(
  // The set function provided by the outer middleware or Zustand's store
  originalSetState: StoreApi<T>['setState'],
  // The api object provided by the outer middleware or Zustand's store
  api: StoreApi<T>,
  diffFn: (prevState: T, nextState: T) => DiffResult<T>,
  onTrace: (traceData: TraceData<T>) => void
): StoreApi<T>['setState'] => {
  const { getState } = api // Use getState from the provided API

  // Define the implementation signature broadly to accept potential args like 'action'
  // The type assigned via return assertion will handle the overload matching.
  const tracedSetStateImpl = (
    // Use a general name like 'partial' to align with Zustand terminology
    partial: T | Partial<T> | ((state: T) => T | Partial<T>),
    replace?: boolean,
    // Allow the optional action parameter often added by devtools
    action?: string | object | { type: unknown;[key: string]: unknown }
  ) => {
    const timestampStart = Date.now()
    const prevState = getState() // Get state *before* update

      // Call the original setState to update the state.
      // Pass all arguments received.
      // Using 'any' temporarily for the call to satisfy potential variations
      // in the originalSetState signature from other middlewares.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ; (originalSetState as any)(partial, replace, action)

    const nextState = getState() // Get state *after* update
    const timestampEnd = Date.now()

    // Avoid tracing if the state hasn't actually changed (shallow check)
    if (prevState === nextState) {
      return
    }

    // Calculate the trace data using the helper function.
    const traceData = calculateTraceData(
      prevState,
      nextState,
      timestampStart,
      timestampEnd,
      diffFn,
      action // Pass the action along
    )

    // Process the trace data using the helper function.
    processTrace(traceData, onTrace)
  }

  // Use a type assertion here. This tells TypeScript that our
  // implementation function (tracedSetStateImpl) is compatible with
  // the required StoreApi<T>['setState'] overloaded type.
  return tracedSetStateImpl as StoreApi<T>['setState']
}

/**
 * The internal implementation of the trace middleware.
 * This function wraps the original Zustand store creator (or the next middleware in the chain)
 * and intercepts setState calls by providing a wrapped setState function.
 *
 * This implementation now conforms to the standard middleware signature pattern:
 * StateCreator<T, Mps, Mcs> => StateCreator<T, Mps, [...Mcs, ZusoundMutatorTuple]>
 */
export const traceImpl: TraceImpl =
  <
    T,
    Mps extends [StoreMutatorIdentifier, unknown][],
    Mcs extends [StoreMutatorIdentifier, unknown][],
    U,
  >(
    // The initializer from the next middleware or the base store creator
    initializer: StateCreator<T, Mps, Mcs, U>,
    options: TraceOptions<T> = {}
  ): StateCreator<T, Mps, [...Mcs, ZusoundMutatorTuple], U> => // This is the StateCreator returned by traceImpl
    (set: StoreApi<T>['setState'], get: StoreApi<T>['getState'], api: StoreApi<T>) => {
      // These are provided by the outer middleware/Zustand
      const {
    // Default onTrace does nothing if not provided.
        onTrace = () => { },
        // Use the default diff function if none is provided.
        diffFn = calculateDiff as (prevState: T, nextState: T) => DiffResult<T>,
      } = options

      // Create the traced version of setState, wrapping the 'set' function
      // that was provided by the outer middleware or Zustand itself.
      const tracedSetState = createTracedSetState(set, api, diffFn, onTrace)

      // Call the original initializer with the traced set function.
      // *** FIX: Use a type assertion here ('as any' is common practice for this specific case) ***
      // This bridges the gap between the base StoreApi<T>['setState'] type of tracedSetState
      // and the complex generic type expected by the initializer based on Mps.
      const initialState = initializer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tracedSetState as any, // Assert compatibility
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        get as any, // Also assert 'get' for consistency, though often less problematic
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        api as any // Assert 'api' as well
      )

      // The StateCreator returned by traceImpl simply returns the initial state slice
      // received from the initializer. Its type signature correctly declares
      // that the 'zustand/zusound' mutator has been added to the Mcs list.
      return initialState
    }
