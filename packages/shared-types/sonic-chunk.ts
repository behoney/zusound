export const SONIC_CHUNK_EVENT_NAME = '__ZUSOUND_SONIC_CHUNK__'
/**
 * Represents a single sonic event (sound) that will be played
 * based on a state change in the application
 */
export type SonicChunk = {
  /**
   * Unique identifier for this chunk, typically the key path of the changed state
   */
  id: string

  /**
   * Waveform type that determines the timbre of the sound
   * - sine: smooth, pure tone (used for numbers by default)
   * - square: harsh, electronic sound (used for strings by default)
   * - sawtooth: bright, buzzy sound (used for booleans by default)
   * - triangle: softer, hollow sound (used for objects and removals by default)
   */
  type: 'sine' | 'square' | 'sawtooth' | 'triangle'

  /**
   * The type of value change that occurred
   * - add: New value added to the state (currently unused, treated as 'change')
   * - remove: Value removed from the state
   * - change: Value changed in the state
   */
  valueType: 'add' | 'remove' | 'change'

  /**
   * Base frequency of the sound in Hertz (Hz)
   * Typically ranges from 110Hz to 880Hz in the current implementation
   */
  frequency: number

  /**
   * Volume/amplitude of the sound (0.0 to 1.0)
   * Default: 0.5 for changes, 0.3 for removals
   */
  magnitude: number

  /**
   * Duration of the sound in milliseconds
   * Minimum value is typically 50ms
   */
  duration: number

  /**
   * Fine pitch adjustment in cents (1/100 of a semitone)
   * Used to create subtle variations based on value types and magnitudes
   * Range: -600 to 600 cents in current implementation
   */
  detune: number
}
