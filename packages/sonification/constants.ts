/** Audio configuration constants */
export const AUDIO_CONFIG = {
  /** Base frequency (A2 note) in Hz */
  BASE_FREQUENCY: 110,

  /** Minimum duration in ms */
  MIN_DURATION_MS: 50,

  /** Volume values for different changes */
  DEFAULT_MAGNITUDE: {
    CHANGE: 0.5,
    REMOVE: 0.3,
  },

  /** Pentatonic scale ratios (Root, M2, M3, P5, M6) */
  SCALE: [1, 1.122, 1.335, 1.498, 1.682],

  /** Delay between sounds in ms */
  STAGGER_DELAY_MS: 50,
}
