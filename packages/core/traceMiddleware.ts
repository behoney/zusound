import type { StateCreator, StoreApi } from 'zustand/vanilla'
import { calculateDiff } from '../diff'
import type { TraceData, TraceOptions, TraceImpl } from './types'
import type { DiffResult } from '../diff'

/**
 * Calculates the difference between states and timing information.
 */
const calculateTraceData = <T>(
  prevState: T,
  nextState: T,
  timestampStart: number,
  timestampEnd: number,
  diffFn: (prevState: T, nextState: T) => DiffResult<T>
): TraceData<T> => {
  const diff = diffFn(prevState, nextState)
  return {
    diff,
    timestampStart,
    duration: timestampEnd - timestampStart,
  }
}

/**
 * Processes the calculated trace data by sonifying changes and calling the onTrace callback.
 * We'll skip the default sonifyChanges call since we've customized it in the zusound middleware
 * with the persistVisualizer option.
 */
const processTrace = <T>(
  traceData: TraceData<T>,
  onTrace: (traceData: TraceData<T>) => void
): void => {
  // Execute the user-provided callback, handling potential errors.
  // The sonification is now handled by zusound middleware with the persistVisualizer option
  try {
    onTrace(traceData)
  } catch (error) {
    console.error("Error in trace middleware 'onTrace' callback:", error)
  }
}

/**
 * Creates a wrapped setState function that includes tracing logic.
 */
const createTracedSetState = <T>(
  api: StoreApi<T>,
  diffFn: (prevState: T, nextState: T) => DiffResult<T>,
  onTrace: (traceData: TraceData<T>) => void
): StoreApi<T>['setState'] => {
  const originalSetState = api.setState
  const { getState } = api

  const tracedSetState: StoreApi<T>['setState'] = (state, replace, action?: string | object) => {
    const timestampStart = Date.now()
    const prevState = getState()

    // Call the original setState to update the state.
    // Type assertion needed as the original signature might vary internally.
    ;(originalSetState as (...args: unknown[]) => void)(state, replace, action)

    const nextState = getState()
    const timestampEnd = Date.now()

    // Avoid tracing if the state hasn't actually changed
    if (prevState === nextState) {
      return
    }

    // Calculate the trace data using the helper function.
    const traceData = calculateTraceData(prevState, nextState, timestampStart, timestampEnd, diffFn)

    // Process the trace data using the helper function.
    processTrace(traceData, onTrace)
  }

  return tracedSetState
}

/**
 * The internal implementation of the trace middleware.
 * This function wraps the original Zustand store creator and intercepts setState calls.
 *
 * Note: The middleware will trigger even when state reference is different but values are identical.
 * This is important because even though there's no actual difference in values, a React component
 * might re-render due to the reference change, so we want to capture this in the trace.
 */
export const traceImpl: TraceImpl =
  <T>(initializer: StateCreator<T, [], []>, options: TraceOptions<T> = {}) =>
  (set: StoreApi<T>['setState'], get: StoreApi<T>['getState'], api: StoreApi<T>) => {
    const {
      // Default onTrace does nothing if not provided.
      onTrace = () => {},
      // Use the default diff function if none is provided.
      diffFn = calculateDiff as (prevState: T, nextState: T) => DiffResult<T>,
    } = options

    // Create the traced version of setState.
    const tracedSetState = createTracedSetState(api, diffFn, onTrace)

    // Replace the original setState with the traced version.
    api.setState = tracedSetState

    // Call the original initializer with the *original* set, but the API
    // now has the traced setState internally. The initializer should use
    // the passed 'set' function argument for consistency with Zustand patterns,
    // although direct api.setState calls will also be traced.
    // Passing tracedSetState here ensures that calls *within* the initializer
    // using the 'set' argument are also traced from the start.
    return initializer(tracedSetState, get, api)
  }
