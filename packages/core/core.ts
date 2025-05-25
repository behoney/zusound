// packages/core/core.ts
import {
  SONIC_CHUNK_EVENT_NAME,
  DIFF_CHUNK_EVENT_NAME,
  ZusoundSoundEvent,
  ZusoundDiffEvent,
  DiffChunk,
} from '../shared-types'
import diff, { isDiffable } from '../diff'
import { diffToSonic, sonifyChanges } from '../sonification/sonification'

export interface CoreOptions {
  enabled?: boolean
  /**
   * Array of state paths to include for sonification.
   * If provided, only these paths will be considered.
   * Paths can be dot-separated for nested properties, e.g., "user.profile.name".
   * If undefined or empty, all top-level keys are considered by default (unless excluded).
   */
  include?: string[]
  /**
   * Array of state paths to exclude from sonification.
   * These paths will be ignored. Takes precedence over `include` if a path is in both.
   * Paths can be dot-separated.
   */
  exclude?: string[]
}

type CoreImpl = (
  currentState: unknown | Record<string, unknown>,
  prevState: unknown | Record<string, unknown>,
  options: CoreOptions
) => void

function getValueByPath(obj: Record<string, unknown> | undefined, path: string): unknown {
  if (!obj) return undefined
  const keys = path.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = obj
  for (const key of keys) {
    if (
      current &&
      typeof current === 'object' &&
      current !== null &&
      Object.prototype.hasOwnProperty.call(current, key)
    ) {
      current = current[key]
    } else {
      return undefined
    }
  }
  return current
}

export const coreImpl: CoreImpl = (currentState, prevState, options) => {
  const { enabled = true, include, exclude } = options

  if (!enabled) {
    return
  }

  const currentStateRecord = currentState as Record<string, unknown>
  const prevStateRecord = prevState as Record<string, unknown> | undefined

  const diffChunks: DiffChunk[] = []

  let pathsToConsider: string[]

  if (include && include.length > 0) {
    pathsToConsider = [...include]
  } else {
    pathsToConsider = Object.keys(currentStateRecord)
  }

  if (exclude && exclude.length > 0) {
    pathsToConsider = pathsToConsider.filter(path => !exclude.includes(path))
  }

  for (const path of pathsToConsider) {
    const currentValue = getValueByPath(currentStateRecord, path)
    const previousValue = getValueByPath(prevStateRecord, path)

    if (
      typeof currentValue !== 'function' &&
      (isDiffable(currentValue) || isDiffable(previousValue))
    ) {
      if (!Object.is(currentValue, previousValue)) {
        const diffChunk = diff(path, currentValue, previousValue)
        const event: ZusoundDiffEvent = new CustomEvent(DIFF_CHUNK_EVENT_NAME, {
          detail: { chunk: diffChunk },
        })
        window.dispatchEvent(event)
        diffChunks.push(diffChunk)
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
