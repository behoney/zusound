import type { SonicChunk } from '../sonification'

/**
 * Interface for the custom event detail
 */
export interface ZusoundEventDetail {
  chunk: SonicChunk
}

/**
 * Type for the Zusound custom event
 */
export interface ZusoundEvent extends CustomEvent {
  detail: ZusoundEventDetail
}

/**
 * Declare the custom event for TypeScript
 */
declare global {
  interface WindowEventMap {
    zusound: ZusoundEvent
  }
}
