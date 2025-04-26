import { DiffChunk } from '../shared-types'

const diffFunc = <T>(nextState: T, prevState: T): Pick<DiffChunk, 'diff' | 'diffPower'> => {
  const prev = JSON.stringify(prevState)
  const next = JSON.stringify(nextState)
  // TODO:: Write a diff algorithm that generates diff(;string) and diffPower(;number) from prev and next

  return {
    diff: next,
    diffPower: next.length - prev.length,
  }
}

type ValueOf<T> = T[keyof T]
type DiffType = ValueOf<Pick<DiffChunk, 'type'>>
const getDiffType = (diffPower: number): DiffType => {
  if (diffPower > 0) {
    return 'add'
  }
  if (diffPower < 0) {
    return 'remove'
  }
  return 'change'
}

const getValueType = (value: unknown): ValueOf<Pick<DiffChunk, 'valueType'>> => {
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

const diffImpl = <T>(nextState: T, prevState: T): DiffChunk => {
  const { diff, diffPower } = diffFunc(prevState, nextState)

  const diffChunk: DiffChunk = {
    id: '',
    type: getDiffType(diffPower),
    valueType: getValueType(nextState),
    diff,
    diffPower,
  }

  return diffChunk
}

const diff = diffImpl
export default diff
