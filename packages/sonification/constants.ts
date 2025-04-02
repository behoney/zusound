/**
 * Audio configuration constants for the sonification module
 */
export const AUDIO_CONFIG = {
  /**
   * Base frequency (A2 note) for sound generation in Hz
   */
  BASE_FREQUENCY: 110,

  /**
   * Minimum duration for any sonic chunk in milliseconds
   */
  MIN_DURATION_MS: 50,

  /**
   * Default magnitude (volume) values for different change types
   */
  DEFAULT_MAGNITUDE: {
    CHANGE: 0.5,
    REMOVE: 0.3,
  },

  /**
   * Pentatonic scale frequency ratios for musical sound mapping
   * These represent: Root, Major 2nd, Major 3rd, Perfect 5th, Major 6th
   */
  SCALE: [1, 1.122, 1.335, 1.498, 1.682],

  /**
   * Delay between consecutive sounds in milliseconds
   * Used for creating a staggered playback effect
   */
  STAGGER_DELAY_MS: 50,
}
