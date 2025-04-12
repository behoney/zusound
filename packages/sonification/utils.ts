/**
 * Utility functions for the sonification module
 */

/**
 * Class to manage the lifecycle of a single AudioContext instance.
 */
export class AudioContextManager {
  private static instance: AudioContextManager | null = null
  private audioContext: AudioContext | null = null

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Get the singleton instance of AudioContextManager.
   * @returns The singleton instance of AudioContextManager.
   */
  public static getInstance(): AudioContextManager {
    if (AudioContextManager.instance === null) {
      AudioContextManager.instance = new AudioContextManager()
    }
    return AudioContextManager.instance
  }

  /**
   * Get or initialize the AudioContext.
   * @returns The managed AudioContext instance.
   * @throws Error if Web Audio API is not supported or if context creation fails.
   */
  public getContext(): AudioContext {
    if (this.audioContext === null || this.audioContext.state === 'closed') {
      try {
        this.audioContext = new AudioContext()
      } catch (err: unknown) {
        this.audioContext = null
        const message = err instanceof Error ? err.message : String(err)
        console.error('Failed to create AudioContext:', message)
        throw new Error(`Web Audio API is not supported or could not be initialized: ${message}`)
      }
    }
    return this.audioContext
  }

  /**
   * Clean up audio resources by closing the managed AudioContext.
   * @returns Promise that resolves when the context is closed.
   */
  public async cleanup(): Promise<void> {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close()
        this.audioContext = null
      } catch (err: unknown) {
        console.warn(
          'Error closing audio context:',
          err instanceof Error ? err.message : String(err)
        )
        this.audioContext = null
      }
    } else {
      this.audioContext = null
    }
  }
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