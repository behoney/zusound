import type { StateCreator, StoreApi } from 'zustand/vanilla'
import { calculateDiff } from '../diff'
import type { TraceData, TraceOptions, TraceImpl, DiffResult } from './types'
import { sonifyChanges } from '../sonification/sonification'

/**
 * Calculates the difference between states and timing information.
 */
const calculateTraceData = <T>(
  prevState: T,
  nextState: T,
  timestampStart: number,
  timestampEnd: number,
  diffFn: (prevState: T, nextState: T) => DiffResult
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
 */
const processTrace = <T>(
  traceData: TraceData<T>,
  onTrace: (traceData: TraceData<T>) => void
): void => {
  // Sonify the changes based on the diff and duration.
  sonifyChanges(traceData.diff, traceData.duration)

  // Execute the user-provided callback, handling potential errors.
  try {
    onTrace(traceData)
  } catch (error) {
    console.error("Error in trace middleware 'onTrace' callback:", error)
  }
}

/**
 * The internal implementation of the trace middleware.
 * This function wraps the original Zustand store creator and intercepts setState calls.
 */
export const traceImpl: TraceImpl =
  <T>(initializer: StateCreator<T, [], []>, options: TraceOptions<T> = {}) =>
  (set: StoreApi<T>['setState'], get: StoreApi<T>['getState'], api: StoreApi<T>) => {
    // TODO(#8):: refactor this into smaller functions, write test code
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      onTrace = (_traceData: TraceData<T>) => {
        // No default action needed here anymore.
        // TODO(#9): Revisit if any default logging/action is desired if onTrace is omitted.
      },
      // Use the default diff function if none is provided.
      diffFn = calculateDiff as (prevState: T, nextState: T) => DiffResult,
    } = options

    // Store the original setState to call it later.
    const originalSetState = api.setState

    // Create the wrapped setState function.
    const tracedSetState: StoreApi<T>['setState'] = (state, replace, action?: string | object) => {
      const timestampStart = Date.now()
      const prevState = get()

      // Call the original setState to update the state.
      // Type assertion needed as the original signature might vary internally.
      ;(originalSetState as (...args: unknown[]) => void)(state, replace, action)

      const nextState = get()
      const timestampEnd = Date.now()

      // Calculate the trace data using the helper function.
      const traceData = calculateTraceData(
        prevState,
        nextState,
        timestampStart,
        timestampEnd,
        diffFn
      )

      // Process the trace data using the helper function.
      processTrace(traceData, onTrace)
    }

    // Replace the original setState with the traced version.
    api.setState = tracedSetState

    // Call the original initializer with the new traced setState.
    return initializer(tracedSetState, get, api)
  }
