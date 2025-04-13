/**
 * Utility functions for the sonification module
 */

/**
 * Class to manage the lifecycle of a single AudioContext instance.
 */
export class AudioContextManager {
  private static instance: AudioContextManager | null = null
  private audioContext: AudioContext | null = null
  private isAutoplayBlocked = false
  private visualizerDialog: HTMLDialogElement | null = null

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
   * Check if audio playback is blocked by browser autoplay policy
   * @returns True if audio is blocked, false otherwise
   */
  public isAudioBlocked(): boolean {
    return this.isAutoplayBlocked || this.audioContext?.state === 'suspended'
  }

  /**
   * Attempt to resume audio context if suspended
   * @param showVisualizer Whether to show a visualizer dialog if audio remains blocked
   * @returns Promise resolving to true if context is running, false if still suspended
   */
  public async tryResumeAudioContext(showVisualizer: boolean = false): Promise<boolean> {
    if (!this.audioContext || this.audioContext.state !== 'suspended') {
      return this.audioContext ? this.audioContext.state === 'running' : false
    }

    try {
      await this.audioContext.resume()
      this.isAutoplayBlocked = false

      // If we successfully resumed and had a dialog, close it
      if (this.visualizerDialog && this.visualizerDialog.open) {
        this.visualizerDialog.close()
        this.visualizerDialog = null
      }

      return true
    } catch (err) {
      this.isAutoplayBlocked = true
      console.warn(
        'Audio context could not be resumed:',
        err instanceof Error ? err.message : String(err)
      )

      // Show visualizer dialog if requested
      if (showVisualizer) {
        this.showVisualizerDialog()
      }

      return false
    }
  }

  /**
   * Show a dialog to inform the user about autoplay restrictions
   * Also provides a button to try enabling audio
   */
  public showVisualizerDialog(): void {
    // Don't create multiple dialogs
    if (this.visualizerDialog) {
      if (!this.visualizerDialog.open) {
        this.visualizerDialog.showModal()
      }
      return
    }

    // Only create dialog in browser environment
    if (typeof document === 'undefined') return

    // Create dialog element
    this.visualizerDialog = document.createElement('dialog')
    this.visualizerDialog.style.cssText = `
      border: none;
      border-radius: 8px;
      padding: 16px;
      background: rgba(30, 30, 40, 0.9);
      color: white;
      backdrop-filter: blur(4px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 300px;
    `

    // Add heading
    const heading = document.createElement('h3')
    heading.textContent = 'Audio Feedback Disabled'
    heading.style.cssText = `
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
    `
    this.visualizerDialog.appendChild(heading)

    // Add message
    const message = document.createElement('p')
    message.textContent =
      'Browser autoplay policy is preventing audio feedback. Visualizer is enabled. Click anywhere to interact with the page and enable audio.'
    message.style.cssText = `
      margin: 0 0 16px 0;
      font-size: 14px;
      line-height: 1.4;
    `
    this.visualizerDialog.appendChild(message)

    // Add button
    const button = document.createElement('button')
    button.textContent = 'Enable Audio'
    button.style.cssText = `
      background: linear-gradient(to right, #6366f1, #a855f7);
      border: none;
      border-radius: 4px;
      color: white;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    `
    button.addEventListener('mouseover', () => {
      button.style.transform = 'translateY(-1px)'
    })
    button.addEventListener('mouseout', () => {
      button.style.transform = 'translateY(0)'
    })
    button.addEventListener('click', async () => {
      const success = await this.tryResumeAudioContext()
      if (success) {
        this.visualizerDialog?.close()
        this.visualizerDialog = null
      }
    })
    this.visualizerDialog.appendChild(button)

    // Add close button
    const closeButton = document.createElement('button')
    closeButton.innerHTML = '&times;'
    closeButton.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    `
    closeButton.addEventListener('mouseover', () => {
      closeButton.style.color = 'white'
      closeButton.style.background = 'rgba(255, 255, 255, 0.1)'
    })
    closeButton.addEventListener('mouseout', () => {
      closeButton.style.color = 'rgba(255, 255, 255, 0.7)'
      closeButton.style.background = 'transparent'
    })
    closeButton.addEventListener('click', () => {
      this.visualizerDialog?.close()
    })
    this.visualizerDialog.appendChild(closeButton)

    // Append dialog to document body and show it
    document.body.appendChild(this.visualizerDialog)
    this.visualizerDialog.showModal()

    // Add event listener to document to try enabling audio on user interaction
    const userInteractionListener = async () => {
      const success = await this.tryResumeAudioContext()
      if (success && this.visualizerDialog) {
        this.visualizerDialog.close()
        this.visualizerDialog = null

        // Remove the event listeners once we've successfully enabled audio
        document.removeEventListener('click', userInteractionListener)
        document.removeEventListener('keydown', userInteractionListener)
      }
    }

    document.addEventListener('click', userInteractionListener)
    document.addEventListener('keydown', userInteractionListener)
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

    // Close and remove dialog if it exists
    if (this.visualizerDialog) {
      if (this.visualizerDialog.open) {
        this.visualizerDialog.close()
      }
      if (this.visualizerDialog.parentNode) {
        this.visualizerDialog.parentNode.removeChild(this.visualizerDialog)
      }
      this.visualizerDialog = null
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
