/**
 * Class to manage the lifecycle of a single AudioContext instance.
 */
export class AudioContextManager {
  private static instance: AudioContextManager | null = null
  private audioContext: AudioContext | null = null
  // Track if resume has been attempted and failed due to autoplay restrictions
  private isAutoplayBlocked = false
  // Track if a user interaction has occurred since the page loaded
  private hasUserInteracted = false

  private constructor() {
    // Add interaction listener on first instantiation in browser
    if (typeof window !== 'undefined') {
      const interactionHandler = () => {
        this.hasUserInteracted = true
        // Once interacted, try to resume immediately if needed
        if (this.audioContext?.state === 'suspended') {
          this.tryResumeAudioContext()
        }
        // Remove listeners after first interaction
        window.removeEventListener('click', interactionHandler, { capture: true })
        window.removeEventListener('keydown', interactionHandler, { capture: true })
        window.removeEventListener('touchstart', interactionHandler, { capture: true })
      }
      // Listen for various interaction types
      window.addEventListener('click', interactionHandler, { capture: true })
      window.addEventListener('keydown', interactionHandler, { capture: true })
      window.addEventListener('touchstart', interactionHandler, { capture: true })
    }
  }

  /** Get the singleton instance of AudioContextManager. */
  public static getInstance(): AudioContextManager {
    if (AudioContextManager.instance === null) {
      AudioContextManager.instance = new AudioContextManager()
    }
    return AudioContextManager.instance
  }

  /** Get or initialize the AudioContext. */
  public getContext(): AudioContext {
    if (this.audioContext === null || this.audioContext.state === 'closed') {
      this.isAutoplayBlocked = false
      try {
        const contextOptions: AudioContextOptions = this.hasUserInteracted
          ? {} // No latency hint needed if interaction occurred
          : { latencyHint: 'interactive' } // Request lower latency before interaction

        this.audioContext = new AudioContext(contextOptions)

        // If the context *immediately* starts suspended (can happen), mark as blocked
        if (this.audioContext.state === 'suspended') {
          console.warn('AudioContext created in suspended state. Autoplay likely restricted.')
          // Don't set isAutoplayBlocked = true here yet, wait for resume attempt
        }
      } catch (err: unknown) {
        this.audioContext = null
        const message = err instanceof Error ? err.message : String(err)
        console.error('Failed to create AudioContext:', message)
        throw new Error(`Web Audio API is not supported or could not be initialized: ${message}`)
      }
    }
    return this.audioContext
  }

  /** Check if audio playback is currently likely blocked by browser autoplay policy */
  public isAudioBlocked(): boolean {
    // Consider blocked if explicitly marked, or if context exists and is suspended
    return (
      this.isAutoplayBlocked || (!!this.audioContext && this.audioContext.state === 'suspended')
    )
  }

  /**
   * Attempt to resume audio context if suspended.
   * Returns status indicating success, failure, or if it was already running.
   * @returns Promise resolving to an object { resumed: boolean, blocked: boolean }
   */
  public async tryResumeAudioContext(): Promise<{ resumed: boolean; blocked: boolean }> {
    // Ensure context exists first. If not, cannot resume.
    if (!this.audioContext) {
      try {
        // Attempt to create context if it doesn't exist yet
        this.getContext()
      } catch {
        console.error('Cannot resume: AudioContext failed to initialize.')
        return { resumed: false, blocked: true }
      }
    }
    // Add null check before accessing state
    if (!this.audioContext) {
      // This case should theoretically be covered by the above, but belt-and-suspenders
      console.error('Cannot resume: AudioContext is null unexpectedly.')
      return { resumed: false, blocked: true }
    }

    // If context is closed, cannot resume.
    if (this.audioContext.state === 'closed') {
      console.warn('Cannot resume: AudioContext is closed.')
      return { resumed: false, blocked: false }
    }

    // If already running, no action needed.
    if (this.audioContext.state === 'running') {
      this.isAutoplayBlocked = false
      return { resumed: true, blocked: false }
    }

    // Only proceed if suspended
    if (this.audioContext.state === 'suspended') {
      console.info('Attempting to resume suspended AudioContext...')
      try {
        // Add null check before calling resume
        if (!this.audioContext) throw new Error('AudioContext became null before resume')
        const resumePromise = this.audioContext.resume()
        const timeoutPromise = new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('AudioContext resume timed out after 1000ms')), 1000)
        )
        await Promise.race([resumePromise, timeoutPromise])

        // Add null check before accessing state after await
        if (!this.audioContext) throw new Error('AudioContext became null after resume')
        // The await succeeded, so the state must be 'running'
        console.info(`AudioContext resumed successfully, state: ${this.audioContext.state}`)
        this.isAutoplayBlocked = false
        return { resumed: true, blocked: false }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.warn(`AudioContext resume failed: ${message}. Autoplay likely blocked.`)
        this.isAutoplayBlocked = true
        return { resumed: false, blocked: true }
      }
    }
    console.warn(
      `Cannot resume: AudioContext is in an unexpected state: ${this.audioContext?.state}` // Use optional chaining here
    )
    return { resumed: false, blocked: this.isAudioBlocked() }
  }

  /** Clean up audio resources. */
  public async cleanup(): Promise<void> {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close()
        console.info('AudioContext closed successfully.')
      } catch (err: unknown) {
        console.warn(
          'Error closing audio context:',
          err instanceof Error ? err.message : String(err)
        )
      } finally {
        this.audioContext = null
      }
    } else {
      this.audioContext = null
    }
    this.isAutoplayBlocked = false // Reset status on cleanup

    // No need to clean up Visualizer here, let it persist unless app fully unloads.
    // Visualizer.getInstance().cleanup();
    // No dialog cleanup needed here
  }
}
