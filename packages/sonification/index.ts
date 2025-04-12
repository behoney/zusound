/**
 * zusound Sonification Module
 *
 * This module provides tools to convert state changes in a Zustand store
 * into auditory feedback through the Web Audio API.
 *
 * Key features:
 * - Converts state changes (diffs) into sonic representations
 * - Maps different data types to different sound characteristics
 * - Provides utilities for playing these sounds with proper timing
 *
 * Basic usage:
 * ```
 * import { sonifyChanges } from "@zusound/sonification";
 *
 * // When state changes occur:
 * sonifyChanges(stateChanges, 200); // Play sounds with 200ms duration
 * ```
 */

// Core sonification functions
export { sonifyChanges, playSonicChunk, diffToSonic } from './sonification'

// Types
export type { SonicChunk } from './types'

// Utilities
export { cleanupAudio, AudioContextManager } from './utils'

// Constants (for advanced configuration)
export { AUDIO_CONFIG } from './constants'
