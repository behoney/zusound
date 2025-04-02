/**
 * --- Diff Calculation ---
 *
 * This module provides utilities for calculating differences between state objects.
 * The diff results are used by the sonification module to create sound representations
 * of state changes, where different types of changes (additions, removals, modifications)
 * are mapped to different sound characteristics.
 *
 * The calculated diffs help determine:
 * - Which properties changed (mapped to different frequencies)
 * - How values changed (affecting sound detune)
 * - Types of changes (mapped to different waveforms)
 */
import { shallow } from 'zustand/shallow'
import { ChangeType, DetailedDiff, DiffOptions } from './types'

/**
 * Default options for diff calculation
 */
const DEFAULT_OPTIONS: DiffOptions = {
  detailed: false,
  trackAdded: true,
  trackRemoved: true,
}

/**
 * Calculates the difference between two states
 *
 * @param prevState - The previous state object
 * @param nextState - The next state object
 * @param options - Configuration options for the diff calculation
 * @returns A partial object containing only the changed properties
 */
export function calculateDiffBase<T>(
  prevState: T,
  nextState: T,
  options: DiffOptions = DEFAULT_OPTIONS
): Partial<T> | DetailedDiff<T> {
  // Return empty object if states are identical
  if (prevState === nextState) {
    return {}
  }

  // Handle non-object or null cases
  if (
    typeof prevState !== 'object' ||
    prevState === null ||
    typeof nextState !== 'object' ||
    nextState === null
  ) {
    return options.detailed
      ? ({ value: nextState, type: prevState === undefined ? 'add' : 'change' } as DetailedDiff<T>)
      : (nextState as Partial<T>)
  }

  // Create set of all keys from both objects
  const allKeys = new Set([
    ...Object.keys(prevState as Record<string, unknown>),
    ...Object.keys(nextState as Record<string, unknown>),
  ])

  // Initialize diff object
  const diff = {} as Record<string, unknown>

  // Iterate through all keys
  for (const key of allKeys) {
    const prevValue = (prevState as Record<string, unknown>)[key]
    const nextValue = (nextState as Record<string, unknown>)[key]
    let changeType: ChangeType | null = null

    // Determine change type
    if (!(key in (prevState as object)) && key in (nextState as object) && options.trackAdded) {
      changeType = 'add'
    } else if (
      key in (prevState as object) &&
      !(key in (nextState as object)) &&
      options.trackRemoved
    ) {
      changeType = 'remove'
    } else if (!shallow(prevValue, nextValue)) {
      changeType = 'change'
    }

    // If a change was detected
    if (changeType !== null) {
      if (options.detailed) {
        diff[key] = {
          value: nextValue,
          previousValue: changeType !== 'add' ? prevValue : undefined,
          type: changeType,
        }
      } else {
        diff[key] = nextValue
      }
    }
  }

  return diff as Partial<T> | DetailedDiff<T>
}

/**
 * Simplified version of calculateDiffBase that only returns changed values
 * without detailed change information
 *
 * @param prevState - The previous state object
 * @param nextState - The next state object
 * @returns A partial object containing only the changed properties
 */
export function calculateSimpleDiff<T>(prevState: T, nextState: T): Partial<T> {
  return calculateDiffBase(prevState, nextState, { detailed: false }) as Partial<T>
}

/**
 * Version of calculateDiffBase that includes detailed change information
 *
 * @param prevState - The previous state object
 * @param nextState - The next state object
 * @returns A detailed diff object with change type information
 */
export function calculateDetailedDiff<T>(prevState: T, nextState: T): DetailedDiff<T> {
  return calculateDiffBase(prevState, nextState, { detailed: true }) as DetailedDiff<T>
}
