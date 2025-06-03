// packages/core/core.ts
import {
  DIFF_CHUNK_EVENT_NAME,
  ANOMALY_CHUNK_EVENT_NAME,
  ZusoundDiffEvent,
  ZusoundAnomalyEvent,
  DiffChunk,
  AnomalyChunk,
  WatchPathConfig,
  SonicChunk,
} from '../shared-types'
import diff, { isDiffable } from '../diff'
import { sonifyChanges } from '../sonification/sonification'

/** Custom visual configuration for anomalies */
export interface AnomalyCustomVisualConfig {
  /** Custom color for the visual effect */
  color?: string
  /** Intensity level for visual effects */
  intensity?: 'low' | 'medium' | 'high'
  /** Custom glow, pulse, or flash effects */
  effect?: 'glow' | 'pulse' | 'flash' | string // Allow other string types for extensibility
}

/** Anomaly detection configuration */
export interface AnomalyDetectionConfig {
  rapidChange?: {
    /** Optional path pattern filter (string or RegExp) */
    pathPattern?: string | RegExp
    /** Number of changes to trigger anomaly */
    count: number
    /** Time window in ms */
    windowMs: number
    /** Custom alert sound properties */
    alertSound?: Partial<SonicChunk>
    /** Custom visual properties */
    customVisual?: AnomalyCustomVisualConfig
  }
}

/**
 * Configuration options for Zusound Core functionality.
 *
 * @example
 * ```typescript
 * const options: CoreOptions = {
 *   enabled: true,
 *   include: ["user", "cart"],
 *   exclude: ["internal", "temp"],
 *   anomalyDetection: {
 *     rapidChange: {
 *       count: 5,
 *       windowMs: 1000,
 *       alertSound: { magnitude: 0.8, frequency: 1000 }
 *     }
 *   },
 *   watchPaths: [
 *     {
 *       path: "session.user.id",
 *       alertLevel: "critical",
 *       customSound: {
 *         magnitude: 0.8,
 *         frequency: 800,
 *         type: "square"
 *       },
 *       customVisual: {
 *         color: "red",
 *         intensity: "high",
 *         effect: "pulse"
 *       }
 *     },
 *     {
 *       path: "cart.items",
 *       alertLevel: "warning"
 *     }
 *   ]
 * }
 * ```
 */
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
  /**
   * Array of critical state paths to monitor with heightened sensitivity.
   * Changes to these paths will trigger distinct audio and visual feedback.
   *
   * Features:
   * - **Exact and Prefix Matching**: Supports both exact path matches and prefix matching for nested objects
   * - **Alert Levels**: 'critical' for high-priority changes, 'warning' for moderate alerts
   * - **Custom Sounds**: Override default audio with custom frequency, magnitude, duration, etc.
   * - **Enhanced Visuals**: Distinct colors, intensities, and effects for critical changes
   *
   * @example
   * ```typescript
   * watchPaths: [
   *   // Critical: Custom sound and high-intensity visual
   *   {
   *     path: "session.user.id",
   *     alertLevel: "critical",
   *     customSound: { magnitude: 0.8, frequency: 800, type: "square" },
   *     customVisual: { color: "red", intensity: "high", effect: "pulse" }
   *   },
   *   // Warning: Default enhanced feedback
   *   {
   *     path: "cart.items",
   *     alertLevel: "warning"
   *   },
   *   // Nested path matching: Watches all properties under "api.errors"
   *   {
   *     path: "api.errors",
   *     alertLevel: "critical",
   *     customVisual: { intensity: "high", effect: "flash" }
   *   }
   * ]
   * ```
   */
  watchPaths?: WatchPathConfig[]

  /** Anomaly detection configuration for problematic state patterns */
  anomalyDetection?: AnomalyDetectionConfig
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

/**
 * Check if a given path matches any of the configured watch paths.
 * Supports exact matching and prefix matching for nested paths.
 */
function findMatchingWatchPath(
  path: string,
  watchPaths: WatchPathConfig[]
): WatchPathConfig | undefined {
  return watchPaths.find(watchConfig => {
    const watchPath = watchConfig.path
    // Exact match
    if (path === watchPath) return true
    // Prefix match for nested paths (e.g., "session.user" matches "session.user.id")
    if (path.startsWith(`${watchPath}.`)) return true
    return false
  })
}

// Change tracking for anomaly detection - persistent across calls
const changeTracker = new Map<string, number[]>()

/**
 * Check if path matches pattern (string or RegExp)
 */
function pathMatchesPattern(path: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') {
    return path === pattern || path.startsWith(`${pattern}.`)
  }
  return pattern.test(path)
}

/**
 * Clean old timestamps outside window and check for anomaly
 */
function checkRapidChangeAnomaly(
  path: string,
  config: NonNullable<AnomalyDetectionConfig['rapidChange']>
): AnomalyChunk | null {
  const now = performance.now()
  const timestamps = changeTracker.get(path) || []

  // Add current timestamp
  timestamps.push(now)

  // Clean old timestamps outside window
  const cutoff = now - config.windowMs
  const recentTimestamps = timestamps.filter(ts => ts >= cutoff)

  // Update tracker with cleaned timestamps
  changeTracker.set(path, recentTimestamps)

  // Check if anomaly threshold exceeded
  if (recentTimestamps.length >= config.count) {
    const severity = recentTimestamps.length >= config.count * 1.5 ? 'critical' : 'warning'

    return {
      id: `anomaly-${path}-${now}`,
      type: 'rapid-change',
      path,
      changeCount: recentTimestamps.length,
      windowMs: config.windowMs,
      timestamps: recentTimestamps,
      severity,
    }
  }

  return null
}

export const coreImpl: CoreImpl = (currentState, prevState, options) => {
  const { enabled = true, include, exclude, watchPaths = [], anomalyDetection } = options

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
        let diffChunk = diff(path, currentValue, previousValue)

        // Check if this path matches any critical watch paths
        const matchingWatchConfig = findMatchingWatchPath(path, watchPaths)
        if (matchingWatchConfig) {
          // Augment the diffChunk with alert context
          diffChunk = {
            ...diffChunk,
            alertLevel: matchingWatchConfig.alertLevel,
            watchConfig: matchingWatchConfig,
          }
        }

        // Check for rapid change anomaly
        if (anomalyDetection?.rapidChange) {
          const rapidConfig = anomalyDetection.rapidChange

          // Check if path matches pattern (if specified)
          const shouldCheck =
            !rapidConfig.pathPattern || pathMatchesPattern(path, rapidConfig.pathPattern)

          if (shouldCheck) {
            const anomaly = checkRapidChangeAnomaly(path, rapidConfig)
            if (anomaly) {
              // Dispatch anomaly event
              const anomalyEvent: ZusoundAnomalyEvent = new CustomEvent(ANOMALY_CHUNK_EVENT_NAME, {
                detail: { chunk: anomaly },
              })
              window.dispatchEvent(anomalyEvent)

              // Trigger anomaly-specific sonification
              import('../sonification/sonification')
                .then(({ sonifyAnomaly }) => {
                  sonifyAnomaly(anomaly, rapidConfig.alertSound)
                })
                .catch(err => {
                  console.error('Failed to import anomaly sonification:', err)
                })
            }
          }
        }

        const event: ZusoundDiffEvent = new CustomEvent(DIFF_CHUNK_EVENT_NAME, {
          detail: { chunk: diffChunk },
        })
        window.dispatchEvent(event)
        diffChunks.push(diffChunk)
      }
    }
  }

  diffChunks.forEach(diffChunk => {
    // Pass the watch configuration to sonifyChanges for enhanced audio and visual events
    sonifyChanges(diffChunk, 100, diffChunk.watchConfig)
  })
}
