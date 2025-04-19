import type { StoreMutatorIdentifier, StateCreator } from 'zustand'
import type { TraceOptions, TraceData, ZusoundTraceEventDetail } from '../core' // Import ZusoundTraceEventDetail from core
import { trace } from '../core' // Core trace functionality (public Trace type)
import type { ZusoundOptions } from './types' // Middleware-specific types
import { isProduction } from './utils'
import { initSonificationListener } from '../sonification' // Import for initialization

// Define the custom event type using the detail from core
export type ZusoundTraceEvent<T = unknown> = CustomEvent<ZusoundTraceEventDetail<T>>

/**
 * Dispatches a trace event containing the trace data.
 */
function dispatchTraceEvent<T>(traceData: TraceData<T>): void {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent<ZusoundTraceEventDetail<T>>('zusound:trace', {
      detail: { traceData },
    })
    window.dispatchEvent(event)
  }
}

// Define the mutator type locally using the literal for casting clarity
type ZusoundMutatorTuple = ['zustand/zusound', never]

export function zusound<
  T extends object,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
  U = T
>(
  initializer: StateCreator<T, Mps, Mcs, U>,
  options: ZusoundOptions<T> = {}
): StateCreator<T, Mps, [...Mcs, ZusoundMutatorTuple], U> {
  const {
    enabled = !isProduction(),
    logDiffs = false,
    allowInProduction = false,
    onTrace: userOnTrace,
    diffFn,
    initSonification = true,
    ...restOptions
  } = options

  const inProduction = isProduction()
  const isDisabled = !enabled || (inProduction && !allowInProduction)

  // If disabled, return the original initializer.
  // Type casting is needed because the function signature promises to add the mutator,
  // but in this branch, it doesn't. This is a necessary compromise for the disabled case.
  if (isDisabled) {
    return initializer as StateCreator<T, Mps, [...Mcs, ZusoundMutatorTuple], U>
    // Note: A technically more correct but complex return type would be conditional.
    // However, this cast allows the overall function signature to remain consistent.
  }

  if (typeof window !== 'undefined' && initSonification) {
    // Initialize lazily after mount to ensure window context
    setTimeout(() => {
      try {
        initSonificationListener()
      } catch (error) {
        console.error('Error initializing sonification:', error)
      }
    }, 0)
  }

  // onTrace callback that dispatches events and calls user callback
  const coreOnTrace = (traceData: TraceData<T>) => {
    dispatchTraceEvent(traceData)
    if (userOnTrace) {
      try {
        userOnTrace(traceData)
      } catch (error) {
        console.error("Error in user-provided 'onTrace' callback:", error)
      }
    }
  }

  // Prepare options for the core trace function
  const traceOptions: TraceOptions<T> = {
    ...restOptions,
    diffFn,
    onTrace: coreOnTrace,
  }

  // Add logging functionality if enabled
  if (logDiffs) {
    if (typeof window !== 'undefined' && !window['__zusound_logger__']) {
      window['__zusound_logger__'] = []
    }
    const originalCoreOnTrace = traceOptions.onTrace // Keep reference before overwriting
    traceOptions.onTrace = (traceData: TraceData<T>) => {
      if (typeof window !== 'undefined' && window['__zusound_logger__']) {
        window['__zusound_logger__'].push({ ...traceData }) // Log a copy
      }
      originalCoreOnTrace?.(traceData) // Call the original handler (event dispatch + user callback)
    }
  }

  // Apply the core trace middleware
  // `trace` has the public signature: StateCreator<T, Mps, Mcs> -> StateCreator<T, Mps, [...Mcs, Mutator]>
  // Internally, it uses `traceImpl` which expects StateCreator<T, [], []>
  // The assertion `trace = traceImpl as Trace` handles mapping the implementation.
  // We need to cast the input `initializer` to satisfy the internal traceImpl expectation.
  const tracedInitializer = trace(
    initializer as unknown as StateCreator<T, [], []>, // Double-cast through unknown
    traceOptions
  )

  // The type of `tracedInitializer` *should* be inferred correctly by `trace`'s public signature
  // as StateCreator<T, Mps, [...Mcs, ZusoundMutatorTuple]> if the input Mps/Mcs were passed through.
  // However, due to the internal `traceImpl` signature and casting, its actual return type
  // aligns with `StateCreator<T, [], [ZusoundMutatorTuple]>`.
  // Therefore, we explicitly cast the result to match the declared public `Zusound` return type.
  return tracedInitializer as unknown as StateCreator<T, Mps, [...Mcs, ZusoundMutatorTuple], U> // Cast Output
}