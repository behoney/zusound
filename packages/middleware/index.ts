/**
 * Middleware package for Zustand state tracking with sound feedback.
 *
 * This package provides optimized APIs that implement best practices for the core functionality:
 * - Exposes a refined interface over the core tracing capabilities
 * - Allows configuration of sonification parameters and thresholds
 * - Maintains consistent behavior while providing tuning capabilities
 *
 * The middleware serves as the recommended entry point for most applications,
 * with sensible defaults and a streamlined API surface.
 */

import type { Zusound, ZusoundOptions } from './types'
import { zusound } from './zusound'

// Augment ImportMeta to support Vite's environment variables
declare global {
  interface ImportMeta {
    env?: {
      PROD?: boolean
      DEV?: boolean
    }
  }
}

export type { Zusound, ZusoundOptions }
export { zusound }

// Also export the visualizer control functions from zusound.ts
export {
    showPersistentVisualizer,
    hidePersistentVisualizer,
} from './zusound'
