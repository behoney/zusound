/**
 * Types for the diff package
 */

/**
 * Represents a change type in a diff operation
 */
export type ChangeType = 'add' | 'remove' | 'change'

/**
 * Represents a single change entry with metadata
 */
export interface DiffEntry<T> {
  /**
   * The new value after the change
   */
  value: T

  /**
   * The previous value before the change (undefined for additions)
   */
  previousValue?: T

  /**
   * The type of change that occurred
   */
  type: ChangeType
}

/**
 * A detailed diff result containing change type information
 */
export type DetailedDiff<T> = T extends object
  ? { [K in keyof Partial<T>]: DiffEntry<T[K]> }
  : DiffEntry<T>

/**
 * Options for the diff calculation
 */
export interface DiffOptions {
  /**
   * Whether to include detailed change information (type and previous value)
   * @default false
   */
  detailed?: boolean

  /**
   * Whether to track keys that were added
   * @default true
   */
  trackAdded?: boolean

  /**
   * Whether to track keys that were removed
   * @default true
   */
  trackRemoved?: boolean
}
