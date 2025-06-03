// packages/shared-types/watch-path-config.ts

import type { SonicChunk } from './sonic-chunk'

/** Alert level for critical state watchers */
export type AlertLevel = 'critical' | 'warning'

/** Configuration for watching specific state paths with heightened sensitivity */
export interface WatchPathConfig {
  /** State path to watch (e.g., "session.user.id", "cart.items") */
  path: string

  /** Alert level determining the intensity of feedback */
  alertLevel: AlertLevel

  /** Optional custom sound properties to override defaults */
  customSound?: Partial<SonicChunk>

  /** Optional custom visual properties for enhanced visualization */
  customVisual?: {
    /** Custom color for the visual effect */
    color?: string
    /** Intensity level for visual effects */
    intensity?: 'low' | 'medium' | 'high'
    /** Custom glow or pulse effects */
    effect?: 'glow' | 'pulse' | 'flash'
  }
}
