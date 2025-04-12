import type { TraceOptions } from '../core'

/**
 * Interface for zusound middleware options
 */
export interface ZusoundOptions<T> extends Omit<TraceOptions<T>, 'enabled' | 'logDiffs'> {
  /** Enable/disable sound feedback (default: true in dev, false in prod) */
  enabled?: boolean
  /** Log state diffs to console (default: false) */
  logDiffs?: boolean
  /** Allow in production (default: false) */
  allowInProduction?: boolean
}
