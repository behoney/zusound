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

  const tracedSetState: StoreApi<T>['setState'] = (state, replace, action) => {
    const timestampStart = Date.now()
    const prevState = getState() // Get state *before* update

    // Call the original setState to update the state.
    // The original setState might be from another middleware (like devtools, persist, immer)
    // or the final store setState.
    originalSetState(state, replace, action)

    const nextState = getState() // Get state *after* update
    const timestampEnd = Date.now()

    // Avoid tracing if the state hasn't actually changed (shallow check)
    // Note: Even if values are shallow equal, if the object reference changes,
    // we still trace it because it might trigger re-renders. The diffFn handles
    // reporting actual value differences.
    if (prevState === nextState) {
      // console.log('[Zusound Core] State reference unchanged, skipping trace.'); // Optional: for debugging
      return
    }

    // console.log('[Zusound Core] State changed, tracing...', { prevState, nextState, action }); // Optional: for debugging

    // Calculate the trace data using the helper function.
    const traceData = calculateTraceData(
      prevState,
      nextState,
      timestampStart,
      timestampEnd,
      diffFn,
      action
    )

    // Process the trace data using the helper function.
    processTrace(traceData, onTrace)
  }

  return tracedSetState
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
      onTrace = () => {},
      // Use the default diff function if none is provided.
      diffFn = calculateDiff as (prevState: T, nextState: T) => DiffResult<T>,
    } = options

    // Create the traced version of setState, wrapping the 'set' function
    // that was provided by the outer middleware or Zustand itself.
    const tracedSetState = createTracedSetState(set, api, diffFn, onTrace)

    // Call the original initializer with the traced set function.
    // The initializer will then use this traced function for its state updates.
    // The initializer returns the initial state slice.
    const initialState = initializer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tracedSetState as any, // Use 'any' to bypass complex type checks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get as any, // Use 'any' to bypass complex type checks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      api as any // Use 'any' to bypass complex type checks
    )

    // The StateCreator returned by traceImpl simply returns the initial state slice
    // received from the initializer. Its type signature correctly declares
    // that the 'zustand/zusound' mutator has been added to the Mcs list.
    return initialState
  }
