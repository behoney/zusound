import type { StoreMutatorIdentifier, StateCreator } from 'zustand'
import { type TraceOptions, type TraceData, trace } from '../core'
import { Zusound, ZusoundOptions } from './types'
import { isProduction } from './utils'
import { sonifyChanges } from '../sonification'
import { ensureVisualizerReady, showPersistentVisualizer } from '../visualizer'

/**
 * zusound middleware for Zustand
 * Simplified version: enables sonification and optionally shows a persistent visualizer.
 */
export const zusound: Zusound = <
  T extends object,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  initializer: StateCreator<T, [...Mps], Mcs>,
  options: ZusoundOptions<T> = {}
) => {
  const {
    enabled = !isProduction(),
    logDiffs = false,
    allowInProduction = false,
    onTrace: userOnTrace,
    diffFn,
    persistVisualizer = false, // Now controls showing the *persistent* corner visualizer
    ...restOptions
  } = options

  const inProduction = isProduction()
  const isDisabled = !enabled || (inProduction && !allowInProduction)

  if (isDisabled) {
    return initializer as StateCreator<T, Mps, [...Mcs]>
  }

  // If enabled, ensure visualizer singleton is ready and show persistent UI if requested
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      try {
        ensureVisualizerReady() // Initialize the visualizer core
        if (persistVisualizer) {
          showPersistentVisualizer() // Show the corner UI
        }
      } catch (error) {
        console.error('Error initializing visualizer:', error)
      }
    }, 0) // Delay slightly to ensure DOM is ready
  }

  // --- Custom trace processor ---
  const customOnTrace = (traceData: TraceData<T>) => {
    // Call sonifyChanges - it no longer needs the persistVisualizer flag for UI
    sonifyChanges(traceData.diff, traceData.duration)

    // Call user's onTrace if provided
    if (userOnTrace) {
      try {
        userOnTrace(traceData)
      } catch (error) {
        console.error("Error in user-provided 'onTrace' callback:", error)
      }
    }
  }

  // --- Prepare TraceOptions ---
  const traceOptions: TraceOptions<T> = {
    ...restOptions,
    diffFn,
    onTrace: customOnTrace,
  }

  // --- Setup Logging ---
  if (logDiffs) {
    if (typeof window !== 'undefined' && !window['__zusound_logger__']) {
      window['__zusound_logger__'] = []
    }
    const originalOnTraceWithSonification = traceOptions.onTrace
    traceOptions.onTrace = (traceData: TraceData<T>) => {
      if (typeof window !== 'undefined' && window['__zusound_logger__']) {
        window['__zusound_logger__'].push({ ...traceData }) // Push a copy
      }
      if (originalOnTraceWithSonification) {
        originalOnTraceWithSonification(traceData)
      }
    }
  }

  // Call the core trace middleware
  return trace(initializer, traceOptions)
}
