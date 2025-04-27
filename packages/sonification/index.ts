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
 * // Automatically initialized when using the middleware (default behavior)
 * import { zusound } from "zusound";
 *
 * // For manual initialization:
 * import { initSonificationListener } from "zusound";
 * initSonificationListener();
 * ```
 */

// Core sonification functions
export { sonifyChanges, playSonicChunk } from './sonification'

// Types (SonicChunk is exported from the main index.ts via shared-types)
// export type { SonicChunk } from './types' // <-- REMOVE THIS LINE

// Utilities
export { AudioContextManager } from './utils'

// Constants (for advanced configuration)
export { AUDIO_CONFIG } from './constants'
