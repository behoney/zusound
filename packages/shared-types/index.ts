/**
 * Shared types used across zusound packages.
 * This package helps break circular dependencies by providing
 * common type definitions that can be imported by multiple packages.
 */

// Export SonicChunk type directly to prevent import issues
export type { SonicChunk } from './sonic-chunk.ts'
export type { DiffChunk } from './diff-chunk.ts'
