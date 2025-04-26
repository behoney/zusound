import { SONIC_CHUNK_EVENT_NAME, SonicChunk } from '../shared-types/sonic-chunk'
import { DiffChunk } from '../shared-types'
import diff from '../diff/diff'
import { DIFF_CHUNK_EVENT_NAME } from '../shared-types/diff-chunk'

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

  const currentStateRecord = currentState as Record<string, unknown>
  const prevStateRecord = prevState as Record<string, unknown>

  const diffChunks: DiffChunk[] = []
  for (const key in currentStateRecord) {
    if (typeof key !== 'string') continue

    if (typeof currentStateRecord[key] !== 'function') {
      const diffChunk = diff(currentStateRecord[key], prevStateRecord[key])
      window.dispatchEvent(new CustomEvent(DIFF_CHUNK_EVENT_NAME, { detail: diffChunk }))

      diffChunks.push(diffChunk)
    }
  }

  const sonicChunks = diffChunks.map(diffChunkToSonicChunk)
  sonicChunks.forEach(sonicChunk => {
    window.dispatchEvent(new CustomEvent(SONIC_CHUNK_EVENT_NAME, { detail: sonicChunk }))
  })
}

export default coreImpl

const diffChunkToSonicChunk = (diffChunk: DiffChunk): SonicChunk => {
  const waveformMap: Record<DiffChunk['valueType'], SonicChunk['type']> = {
    number: 'sine',
    string: 'square',
    boolean: 'sawtooth',
    object: 'triangle',
    array: 'triangle',
    unknown: 'triangle',
  }

  const valueTypeMap = (type: DiffChunk['type']): SonicChunk['valueType'] => {
    if (type === 'add' || type === 'remove' || type === 'change') {
      return type
    }
    return 'change'
  }

  return {
    id: diffChunk.id,
    type: waveformMap[diffChunk.valueType] || 'sine',
    valueType: valueTypeMap(diffChunk.type),
    frequency: 440,
    magnitude: diffChunk.type === 'add' ? 0.2 : diffChunk.type === 'remove' ? 0.1 : 0.5,
    duration: 30,
    detune: diffChunk.diffPower * 10, // Scale the detune based on the magnitude of the change
  }
}
