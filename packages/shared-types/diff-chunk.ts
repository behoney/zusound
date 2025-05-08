export const DIFF_CHUNK_EVENT_NAME = '__ZUSOUND_DIFF_CHUNK__'

/** Diff event triggered by state changes */
export type DiffChunk = {
  /** Stringified next value for identity/debugging */
  id: string

  /** Key/path of changed state */
  path: string

  /** Based on diffPower: < 0 =remove, > 0 = add, else = change */
  type: 'add' | 'remove' | 'change'

  /** Type of the changed value */
  valueType: 'number' | 'string' | 'boolean' | 'object' | 'array' | 'unknown'

  /** Stringified value length */
  diff: string

  /** Algorithm-determined value */
  diffPower: number
}
