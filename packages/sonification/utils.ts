/**
 * Utility functions for the sonification module
 */

// TODO(#12):: This should be a singleton, when several instances are created, it will cause multiple audio contexts.

/**
 * AudioContext singleton to manage audio resources
 */
let audioContext: AudioContext | null = null

/**
 * Initialize or return the existing AudioContext
 * @returns AudioContext instance
 * @throws Error if Web Audio API is not supported
 */
export const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    try {
      audioContext = new AudioContext()
    } catch (err: unknown) {
      throw new Error(
        `Web Audio API not supported in this browser: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
  return audioContext
}

/**
 * Generate a simple hash from a string
 * @param str - The string to hash
 * @returns A positive integer hash value
 */
export const simpleHash = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0 // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Clean up audio resources - useful when the component using sonification unmounts
 */
export const cleanupAudio = (): void => {
  if (audioContext) {
    audioContext
      .close()
      .then(() => {
        audioContext = null
      })
      .catch(err => {
        console.warn('Error closing audio context:', err.message)
      })
  }
}
