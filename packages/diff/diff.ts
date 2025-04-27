import { DiffChunk } from '../shared-types'
import { distance } from 'fastest-levenshtein'

type DiffableType =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | Array<unknown>
  | undefined
  | null

const diffFunc = <T extends DiffableType>(
  nextState: T,
  prevState: T
): Pick<DiffChunk, 'diff' | 'diffPower'> => {
  let _diff: string, _diffPower: number

  if (prevState === undefined || prevState === null) {
    _diff = JSON.stringify(nextState).length
    _diffPower = 1
  } else if (nextState === undefined || nextState === null) {
    _diff = JSON.stringify(prevState).length.toString()
    _diffPower = -1
  } else {
    const steps = distance(JSON.stringify(prevState), JSON.stringify(nextState))
    _diff = steps.toString()

    switch (typeof nextState) {
      case 'number':
        _diffPower = Number(nextState) - Number(prevState)
        break
      case 'boolean':
        _diffPower = nextState === prevState ? 0 : nextState ? 1 : -1
        break
      case 'string':
      case 'object':
      case 'undefined':
      default:
        _diffPower =
          1 - steps / Math.max(JSON.stringify(prevState).length, JSON.stringify(nextState).length)
        break
    }
  }

  return {
    diff: String(_diff),
    diffPower: _diffPower,
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

const diffImpl = <T extends DiffableType>(nextState: T, prevState: T): DiffChunk => {
  const { diff, diffPower } = diffFunc(prevState, nextState)

  const diffChunk: DiffChunk = {
    id: JSON.stringify(nextState),
    type: getDiffType(diffPower),
    valueType: getValueType(nextState),
    diff,
    diffPower,
  }

  return diffChunk
}

const diff = diffImpl
export default diff

export const isDiffable = (value: unknown): value is DiffableType => {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'object' ||
    Array.isArray(value)
  )
}

