export const SONIC_CHUNK_EVENT_NAME = '__ZUSOUND_SONIC_CHUNK__'
/** Sound event triggered by state changes */
export type SonicChunk = {
  /** Unique ID, usually the changed state's key path */
  id: string

  /** Sound waveform type
   * - sine: pure tone (numbers)
   * - square: electronic (strings)
   * - sawtooth: buzzy (booleans)
   * - triangle: hollow (objects/removals) */
  type: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'custom'

  /** Base frequency in Hz (110-880Hz) */
  frequency: number

  /** Volume (0-1), 0.5 for changes, 0.3 for removals */
  magnitude: number

  /** Duration in ms (min 50ms) */
  duration: number

  /** Pitch adjustment in cents (-600 to 600) */
  detune: number

  /** Optional alert level for critical state watchers */
  alertLevel?: 'critical' | 'warning'

  /** Flag indicating this is from a critical path watcher */
  isCriticalPath?: boolean

  /** Flag indicating this is an anomaly alert */
  isAnomaly?: boolean

  /** Anomaly type for specific audio patterns */
  anomalyType?: 'rapid-change'
}
