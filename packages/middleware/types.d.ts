import type { StoreMutatorIdentifier, StateCreator } from 'zustand'
import type { TraceOptions, DiffResult } from '../core'
import { ZusoundOptions } from './types'

/**
 * Interface for zusound middleware options
 */
export interface ZusoundOptions<T> extends TraceOptions<T> {
  /** Enable/disable sound feedback (default: true in dev, false in prod) */
  enabled?: boolean
  /** Log state diffs to console (default: false) */
  logDiffs?: boolean
  /** Allow in production (default: false) */
  allowInProduction?: boolean
  /** Optional custom diffing function */
  diffFn?: (prevState: T, nextState: T) => DiffResult<T>
} /**
 * Type definition for the zusound middleware function.
 * This type captures the middleware's generic parameters and return type.
 */

export type Zusound = <
  T extends object,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  initializer: StateCreator<T, [...Mps] | [...Mps], Mcs>,
  options?: ZusoundOptions<T>
) => StateCreator<T, Mps, [...Mcs]>
