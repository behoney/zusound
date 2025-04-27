export const DIFF_CHUNK_EVENT_NAME = '__ZUSOUND_DIFF_CHUNK__'

export type DiffChunk = {
  id: string
  type: 'add' | 'remove' | 'change' // diffPower < 0 ? 'remove' : diffPower > 0 ? 'add' : 'change'
  valueType: 'number' | 'string' | 'boolean' | 'object' | 'array' | 'unknown'
  diff: string // should be stringified length of the value
  diffPower: number // deetermined by algorithms
}
