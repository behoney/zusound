import { DiffChunk } from '../shared-types'

type ValueOf<T> = T[keyof T]
type DiffType = ValueOf<Pick<DiffChunk, 'type'>>

export const getDiffType = (diffPower: number): DiffType => {
  if (diffPower > 0) {
    return 'add'
  }
  if (diffPower < 0) {
    return 'remove'
  }
  return 'change'
}

export const getValueType = (value: unknown): ValueOf<Pick<DiffChunk, 'valueType'>> => {
  switch (typeof value) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'object':
      if (Array.isArray(value)) {
        return 'array'
      }
      return value === null ? 'unknown' : 'object'
    default:
      return 'unknown'
  }
}
