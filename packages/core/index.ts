import { SONIC_CHUNK_EVENT_NAME } from '../shared-types/sonic-chunk'
import { DiffChunk } from '../shared-types'
import diff, { isDiffable } from '../diff/diff'
import { DIFF_CHUNK_EVENT_NAME } from '../shared-types/diff-chunk'
import { diffToSonic, sonifyChanges } from '../sonification/sonification'

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

    if (typeof currentStateRecord[key] !== 'function' && isDiffable(currentStateRecord[key])) {
      const diffChunk = diff(
        currentStateRecord[key],
        // @ts-expect-error prevStateRecord[key] is the same type as currentStateRecord[key]
        prevStateRecord[key]
      )
      window.dispatchEvent(new CustomEvent(DIFF_CHUNK_EVENT_NAME, { detail: diffChunk }))

      diffChunks.push(diffChunk)
    }
  }

  diffChunks.forEach(diffChunk => {
    sonifyChanges(diffChunk, 100)

    // TODO:: below event is reversed
    const sonicChunk = diffToSonic(diffChunk)
    window.dispatchEvent(new CustomEvent(SONIC_CHUNK_EVENT_NAME, { detail: sonicChunk }))
  })
}

export default coreImpl
