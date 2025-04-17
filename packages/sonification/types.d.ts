/**
 * Re-export the SonicChunk type from shared-types.
 * This allows existing code to continue importing from sonification/types,
 * but the actual definition has been moved to shared-types for better cohesion.
 */
export { SonicChunk } from '../shared-types'

// Any other types specific to sonification (not shared) would remain here
