export const ANOMALY_CHUNK_EVENT_NAME = '__ZUSOUND_ANOMALY_CHUNK__'

/** Anomaly pattern types */
export type AnomalyType = 'rapid-change'

/** Anomaly event for problematic state patterns */
export type AnomalyChunk = {
  /** Unique ID for this anomaly instance */
  id: string

  /** Type of anomaly detected */
  type: AnomalyType

  /** State path where anomaly occurred */
  path: string

  /** Number of changes detected in window */
  changeCount: number

  /** Time window in ms where changes occurred */
  windowMs: number

  /** Timestamps of the rapid changes */
  timestamps: number[]

  /** Severity level */
  severity: 'warning' | 'critical'
}
