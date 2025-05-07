import { SONIC_CHUNK_EVENT_NAME } from '../shared-types/sonic-chunk'
import { DiffChunk, ZusoundSoundEvent, ZusoundDiffEvent } from '../shared-types'
import diff, { isDiffable } from '../diff/diff'
import { DIFF_CHUNK_EVENT_NAME } from '../shared-types/diff-chunk'
import { diffToSonic, sonifyChanges } from '../sonification/sonification'

export interface CoreOptions {
  enabled?: boolean
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

    if (Object.prototype.hasOwnProperty.call(currentStateRecord, key)) {
      const currentValue = currentStateRecord[key]
      const previousValue = prevStateRecord ? prevStateRecord[key] : undefined

      if (
        typeof currentValue !== 'function' &&
        (isDiffable(currentValue) || isDiffable(previousValue))
      ) {
        if (currentValue !== previousValue) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const diffChunk = diff(key, currentValue as any, previousValue as any)
          const event: ZusoundDiffEvent = new CustomEvent(DIFF_CHUNK_EVENT_NAME, {
            detail: { chunk: diffChunk },
          })
          window.dispatchEvent(event)
          diffChunks.push(diffChunk)
        }
      }
    }
  }

  diffChunks.forEach(diffChunk => {
    sonifyChanges(diffChunk, 100)

    const sonicChunk = diffToSonic(diffChunk)
    const event: ZusoundSoundEvent = new CustomEvent(SONIC_CHUNK_EVENT_NAME, {
      detail: { chunk: sonicChunk },
    })
    window.dispatchEvent(event)
  })
}

export default coreImpl
