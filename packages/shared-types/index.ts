import { DIFF_CHUNK_EVENT_NAME, DiffChunk } from './diff-chunk'
import { SONIC_CHUNK_EVENT_NAME, SonicChunk } from './sonic-chunk'

export interface ZusoundSoundEvent extends CustomEvent {
  detail: {
    chunk: SonicChunk
  }
}

export interface ZusoundDiffEvent extends CustomEvent {
  detail: {
    chunk: DiffChunk
  }
}

declare global {
  interface WindowEventMap {
    [SONIC_CHUNK_EVENT_NAME]: ZusoundSoundEvent
    [DIFF_CHUNK_EVENT_NAME]: ZusoundDiffEvent
  }
}

export const isSonificationEvent = (event: Event): event is ZusoundSoundEvent => {
  return event instanceof CustomEvent && event.type === SONIC_CHUNK_EVENT_NAME && 'detail' in event
}

export const isDiffEvent = (event: Event): event is ZusoundDiffEvent => {
  return event instanceof CustomEvent && event.type === DIFF_CHUNK_EVENT_NAME && 'detail' in event
}

export type { SonicChunk } from './sonic-chunk.ts'
export type { DiffChunk } from './diff-chunk.ts'

export { SONIC_CHUNK_EVENT_NAME, DIFF_CHUNK_EVENT_NAME }
