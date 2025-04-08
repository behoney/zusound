import type { StateCreator, StoreApi } from 'zustand/vanilla'
import { calculateDiff } from '../diff'
import type { TraceData, TraceOptions, TraceImpl, DiffResult } from './types'
import { sonifyChanges } from '../sonification/sonification'

/**
 * The internal implementation of the trace middleware.
 * This function wraps the original Zustand store creator and intercepts setState calls.
 */
export const traceImpl: TraceImpl =
  <T>(initializer: StateCreator<T, [], []>, options: TraceOptions<T> = {}) =>
  (set: StoreApi<T>['setState'], get: StoreApi<T>['getState'], api: StoreApi<T>) => {
    // TODO(#8):: refactor this into smaller functions, write test code
    // Default handler provides detailed console logging for each trace.
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      onTrace = (traceData: TraceData<T>) => {
        // TODO(#9):: decide what to do with the trace data by default.
      },
      diffFn = calculateDiff as (prevState: T, nextState: T) => DiffResult, // Use the default diff function if none is provided.
    } = options

    const originalSetState = api.setState

    const tracedSetState: StoreApi<T>['setState'] = (state, replace, action?: string | object) => {
      const timestampStart = Date.now()
      const prevState = get()

      ;(originalSetState as (...args: unknown[]) => void)(state, replace, action)

      const nextState = get()
      const timestampEnd = Date.now()

      const diff = diffFn(prevState, nextState)

      const traceData: TraceData<T> = {
        diff,
        timestampStart,
        duration: timestampEnd - timestampStart,
      }

      sonifyChanges(diff, traceData.duration)

      try {
        onTrace(traceData)
      } catch (error) {
        console.error("Error in trace middleware 'onTrace' callback:", error)
      }
    }

    api.setState = tracedSetState

    return initializer(tracedSetState, get, api)
  }
