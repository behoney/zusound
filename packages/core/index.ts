import { SONIC_CHUNK_EVENT_NAME, SonicChunk } from '../shared-types/sonic-chunk'
import { DiffChunk } from '../shared-types'
import diff from '../diff/diff'

export interface CoreOptions {
  enabled?: boolean
  // name?: string
  // enabled?: boolean
  // anonymousActionType?: string
  // store?: string
}

type CoreImpl = (
  currentState: unknown | Record<string, unknown>,
  prevState: unknown | Record<string, unknown>,
  options: CoreOptions
) => void

const coreImpl: CoreImpl = (currentState, prevState, options) => {
  const { enabled = true } = options

  if (!enabled) {
    return
  }

  // console.log('currentState', currentState, prevState)

  const traceableRecord: Record<string, unknown> = {}
  const prevTraceableRecord: Record<string, unknown> = {}

  for (const key in currentState as Record<string, unknown>) {
    if (typeof key !== 'string') continue

    if (typeof currentState[key] !== 'function') {
      traceableRecord[key] = currentState[key]
      prevTraceableRecord[key] = prevState[key]
    }
  }

  const diffChunk = diff(traceableRecord, prevTraceableRecord)
  const sonicChunk = diffChunkToSonicChunk(diffChunk)

  window.dispatchEvent(new CustomEvent(SONIC_CHUNK_EVENT_NAME, { detail: sonicChunk }))
}

export default coreImpl

const diffChunkToSonicChunk = (diffChunk: DiffChunk): SonicChunk => {
  const waveformMap: Record<DiffChunk['type'], SonicChunk['type']> = {
    add: 'square',
    remove: 'triangle',
    change: 'sine',
  }

  const valueTypeMap = (valueType: DiffChunk['valueType']): SonicChunk['valueType'] => {
    if (
      valueType === 'string' ||
      valueType === 'number' ||
      valueType === 'boolean' ||
      valueType === 'object' ||
      valueType === 'array' ||
      valueType === 'unknown'
    ) {
      return 'change'
    }
    return 'change'
  }

  return {
    id: diffChunk.id,
    type: waveformMap[diffChunk.type] || 'sine',
    valueType: valueTypeMap(diffChunk.valueType),
    frequency: 440,
    magnitude: diffChunk.type === 'remove' ? 0.3 : 0.5,
    duration: 100,
    detune: 0,
  }
}
