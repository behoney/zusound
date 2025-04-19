import type { StoreMutatorIdentifier, StateCreator } from 'zustand'
// Import types directly from core
import type {
  TraceOptions,
  TraceData,
  ZusoundTraceEventDetail,
  ZusoundMutatorTuple,
} from '../core/types' // ZusoundMutatorTuple is now ['zustand/zusound', unknown]
import { trace } from '../core' // Core trace middleware function (now correctly typed)
import type { ZusoundOptions } from './types' // Middleware-specific types
import { isProduction } from './utils'
import { initSonificationListener } from '../sonification' // Import for initialization
import type { DiffResult } from '../diff' // Import DiffResult

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

// No need to define ZusoundMutatorTuple here if imported from core

// The main zusound middleware function
// Its signature should match the Zusound interface from ./types
export function zusound<
  T extends object,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
  U = T,
>(
  // Initializer from the layer below (either base creator or another middleware)
  initializer: StateCreator<T, Mps, Mcs, U>,
  options: ZusoundOptions<T> = {}
): StateCreator<T, Mps, [...Mcs, ZusoundMutatorTuple], U> {
  // Return type adds ZusoundMutatorTuple (now ['zustand/zusound', unknown])
  const {
    enabled = !isProduction(),
    logDiffs = false,
    allowInProduction = false,
    onTrace: userOnTrace, // User's onTrace callback
    diffFn, // User's diffFn
    initSonification = true,
    ...restOptions // Any other potential options for core trace
  } = options

  const inProduction = isProduction()
  const isDisabled = !enabled || (inProduction && !allowInProduction)

  // If disabled, return the original initializer.
  // We still need a cast here because the function signature promises to add the mutator,
  // but in the disabled case, it doesn't wrap and add the mutator identifier.
  // This is a standard pattern for middlewares with an 'enabled' flag.
  if (isDisabled) {
    // Casting to 'any' then to the target type is a common way to bypass
    // strictness when you know the runtime behavior is correct but types don't align.
    return initializer as StateCreator<T, Mps, [...Mcs, ZusoundMutatorTuple], U>
  }

  // Initialize sonification listener if enabled and in browser
  if (typeof window !== 'undefined' && initSonification) {
    // Initialize lazily after mount to ensure window context
    // Use requestAnimationFrame for potentially better timing after initial render
    requestAnimationFrame(() => {
      try {
        initSonificationListener()
      } catch (error) {
        console.error('[Zusound Middleware] Error initializing sonification listener:', error)
      }
    })
  }

  // Internal onTrace callback used by the core trace middleware.
  // It dispatches the event and then calls the user's provided onTrace.
  const coreOnTrace = (traceData: TraceData<T>) => {
    // console.log('[Zusound Middleware] Core trace triggered', traceData); // Optional: for debugging
    dispatchTraceEvent(traceData)
    if (userOnTrace) {
      try {
        userOnTrace(traceData)
      } catch (error) {
        console.error("[Zusound Middleware] Error in user-provided 'onTrace' callback:", error)
      }
    }
  }

  // Prepare options for the core trace function
  // Note: Pass user's diffFn if provided, otherwise core uses its default
  const traceOptions: TraceOptions<T> = {
    ...restOptions, // Pass through any extra options
    diffFn: diffFn as (prevState: T, nextState: T) => DiffResult<T>, // Cast to correct diffFn type
    onTrace: coreOnTrace, // Pass our internal handler to core
  }

  // Add logging functionality if enabled
  if (logDiffs) {
    if (typeof window !== 'undefined' && !window['__zusound_logger__']) {
      window['__zusound_logger__'] = [] as TraceData<T>[] // Ensure logger array exists and type it
    }
    const originalCoreOnTrace = traceOptions.onTrace // Keep reference to event dispatch + user callback
    traceOptions.onTrace = (traceData: TraceData<T>) => {
      if (typeof window !== 'undefined' && window['__zusound_logger__']) {
        // Push a plain object copy to avoid potential issues with complex objects/proxies
        window['__zusound_logger__'].push(JSON.parse(JSON.stringify(traceData)))
      }
      originalCoreOnTrace?.(traceData) // Call the original handler
    }
  }

  // Apply the core trace middleware.
  // Since traceImpl now conforms to the standard middleware signature,
  // we pass the initializer directly without complex casting.
  const tracedInitializer = trace(initializer, traceOptions)

  // The type of `tracedInitializer` is now correctly inferred by `trace`'s
  // signature as StateCreator<T, Mps, [...Mcs, ZusoundMutatorTuple], U>.
  // We just return it.
  return tracedInitializer
}
