import { Visualizer } from '../visualizer' // Import the Visualizer singleton manager

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
  private visualizerCanvasContainer: HTMLDivElement | null = null // Container for the canvas inside the dialog

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
   * Also ensures the Visualizer singleton is initialized.
   * @returns The managed AudioContext instance.
   * @throws Error if Web Audio API is not supported or if context creation fails.
   */
  public getContext(): AudioContext {
    if (this.audioContext === null || this.audioContext.state === 'closed') {
      try {
        this.audioContext = new AudioContext()
        // Ensure Visualizer is initialized when context is created/recreated
        Visualizer.getInstance().initialize()
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
    // Ensure context exists before checking state
    const ctx = this.audioContext
    return this.isAutoplayBlocked || (ctx !== null && ctx.state === 'suspended')
  }

  /**
   * Attempt to resume audio context if suspended
   * @param showVisualizerDialogIfBlocked If true, show the dialog containing the visualizer if resume fails
   * @returns Promise resolving to true if context is running, false if still suspended
   */
  public async tryResumeAudioContext(
    showVisualizerDialogIfBlocked: boolean = false
  ): Promise<boolean> {
    const ctx = this.audioContext // Get current context instance

    // Check if context exists and is actually suspended
    if (!ctx || ctx.state !== 'suspended') {
      return ctx ? ctx.state === 'running' : false // Return true if running, false otherwise
    }

    try {
      await ctx.resume()
      this.isAutoplayBlocked = false

      // If we successfully resumed and had a dialog, close it
      this.closeVisualizerDialog()

      return true
    } catch (err) {
      this.isAutoplayBlocked = true
      console.warn(
        'Audio context could not be resumed due to browser autoplay restrictions:',
        err instanceof Error ? err.message : String(err)
      )

      // Show visualizer dialog only if requested and resume failed
      if (showVisualizerDialogIfBlocked) {
        this.showVisualizerDialog()
      }

      return false
    }
  }

  /**
   * Shows the dialog containing the visualizer canvas, informing the user about autoplay restrictions.
   * Only shown when `persistVisualizer` is true and audio is blocked.
   */
  public showVisualizerDialog(): void {
    // Don't create multiple dialogs
    if (this.visualizerDialog && this.visualizerDialog.open) {
      return
    }

    // Only create dialog in browser environment
    if (typeof document === 'undefined') return

    // Ensure visualizer is initialized and get the canvas
    const visualizer = Visualizer.getInstance()
    if (!visualizer.initialize()) {
      console.error('Visualizer could not be initialized. Dialog cannot be shown.')
      return
    }
    const visualizerCanvas = visualizer.getCanvasElement()
    if (!visualizerCanvas) {
      console.error('Visualizer canvas element not available. Dialog cannot be shown.')
      return
    }

    // If dialog exists but isn't open, just show it and ensure canvas is inside
    if (this.visualizerDialog && !this.visualizerDialog.open) {
      // Ensure canvas is in the correct container (might have been removed)
      if (
        this.visualizerCanvasContainer &&
        !this.visualizerCanvasContainer.contains(visualizerCanvas)
      ) {
        this.visualizerCanvasContainer.appendChild(visualizerCanvas)
        visualizer.notifyMounted() // Notify visualizer it's back in DOM
      }
      this.visualizerDialog.showModal()
      return
    }

    // --- Create Dialog Element ---
    this.visualizerDialog = document.createElement('dialog')
    this.visualizerDialog.style.cssText = `
      border: none;
      border-radius: 8px;
      padding: 20px; /* Increased padding */
      background: rgba(30, 30, 40, 0.95); /* Slightly more opaque */
      color: white;
      backdrop-filter: blur(5px); /* Increased blur */
      box-shadow: 0 6px 25px rgba(0, 0, 0, 0.5); /* Increased shadow */
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 320px; /* Slightly wider */
      text-align: center; /* Center align content */
    `
    // Prevent closing via Escape key if needed (optional)
    this.visualizerDialog.addEventListener('cancel', event => event.preventDefault())

    // --- Add Heading ---
    const heading = document.createElement('h3')
    heading.textContent = 'Audio Disabled'
    heading.style.cssText = `
      margin: 0 0 12px 0;
      font-size: 18px; /* Larger heading */
      font-weight: 600;
      color: #f87171; /* Reddish color for warning */
    `
    this.visualizerDialog.appendChild(heading)

    // --- Add Visualizer Canvas ---
    // Create a container for the canvas
    this.visualizerCanvasContainer = document.createElement('div')
    this.visualizerCanvasContainer.style.cssText = `
        margin-bottom: 16px; /* Space below canvas */
        height: ${visualizerCanvas.height}px; /* Match canvas height */
        display: flex;
        justify-content: center;
        align-items: center;
    `
    // Append the actual canvas to the container
    this.visualizerCanvasContainer.appendChild(visualizerCanvas)
    this.visualizerDialog.appendChild(this.visualizerCanvasContainer)
    // Notify the visualizer instance that its canvas is now in the DOM
    visualizer.notifyMounted()

    // --- Add Message ---
    const message = document.createElement('p')
    message.innerHTML = // Use innerHTML for potential formatting
      'Audio feedback is currently blocked by your browser. <br/> Click the button below or interact with the page to enable sound.'
    message.style.cssText = `
      margin: 0 0 18px 0; /* Increased margin */
      font-size: 14px;
      line-height: 1.5; /* Improved line spacing */
    `
    this.visualizerDialog.appendChild(message)

    // --- Add Enable Audio Button ---
    const button = document.createElement('button')
    button.textContent = 'Enable Audio'
    button.style.cssText = `
      background: linear-gradient(to right, #6366f1, #a855f7);
      border: none;
      border-radius: 6px; /* Slightly more rounded */
      color: white;
      padding: 10px 20px; /* Larger padding */
      cursor: pointer;
      font-size: 15px; /* Larger font */
      font-weight: 600; /* Bolder font */
      transition: all 0.2s ease-in-out;
      display: block; /* Make button block */
      width: 80%; /* Control width */
      margin: 0 auto 10px auto; /* Center button */
    `
    button.addEventListener('mouseover', () => {
      button.style.transform = 'scale(1.03)' // Scale up slightly
      button.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)'
    })
    button.addEventListener('mouseout', () => {
      button.style.transform = 'scale(1.0)'
      button.style.boxShadow = 'none'
    })
    button.addEventListener('click', async () => {
      // Attempt to resume audio, passing false to prevent recursive dialog popups
      const success = await this.tryResumeAudioContext(false)
      // Dialog is closed automatically within tryResumeAudioContext if successful
      if (!success) {
        // Optional: Add feedback if enabling fails (e.g., shake dialog)
        this.visualizerDialog?.animate(
          [
            { transform: 'translateX(-5px)' },
            { transform: 'translateX(5px)' },
            { transform: 'translateX(0)' },
          ],
          { duration: 300, easing: 'ease-in-out' }
        )
      }
    })
    this.visualizerDialog.appendChild(button)

    // --- Add Close Button (Manual Dismissal) ---
    const closeButton = document.createElement('button')
    closeButton.innerHTML = '&times;' // Use HTML entity for 'x'
    closeButton.setAttribute('aria-label', 'Close dialog')
    closeButton.style.cssText = `
      position: absolute;
      top: 10px; /* Adjusted position */
      right: 10px; /* Adjusted position */
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: rgba(255, 255, 255, 0.7);
      font-size: 24px; /* Larger close icon */
      cursor: pointer;
      padding: 0;
      width: 30px; /* Larger hit area */
      height: 30px; /* Larger hit area */
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
      line-height: 1;
    `
    closeButton.addEventListener('mouseover', () => {
      closeButton.style.color = 'white'
      closeButton.style.background = 'rgba(255, 0, 0, 0.5)' // Red background on hover
      closeButton.style.transform = 'scale(1.1)'
    })
    closeButton.addEventListener('mouseout', () => {
      closeButton.style.color = 'rgba(255, 255, 255, 0.7)'
      closeButton.style.background = 'rgba(255, 255, 255, 0.1)'
      closeButton.style.transform = 'scale(1.0)'
    })
    closeButton.addEventListener('click', () => {
      this.closeVisualizerDialog()
    })
    this.visualizerDialog.appendChild(closeButton)

    // Append dialog to document body and show it
    document.body.appendChild(this.visualizerDialog)
    this.visualizerDialog.showModal()

    // Add event listener to document to try enabling audio on user interaction
    // Ensure this listener is only added once if the dialog is re-shown
    if (!document.body.dataset.zusoundListenerAttached) {
      document.body.dataset.zusoundListenerAttached = 'true'
      const userInteractionListener = async (event: Event) => {
        // Ignore clicks inside the dialog itself
        if (this.visualizerDialog?.contains(event.target as Node)) {
          return
        }

        const success = await this.tryResumeAudioContext(false) // Try enabling audio
        if (success) {
          // Dialog is closed by tryResumeAudioContext
          // Remove the event listeners once we've successfully enabled audio
          document.removeEventListener('click', userInteractionListener, { capture: true }) // Use capture phase if needed
          document.removeEventListener('keydown', userInteractionListener, { capture: true })
          delete document.body.dataset.zusoundListenerAttached // Cleanup flag
        }
      }

      // Use capture phase for broader interaction detection if necessary
      document.addEventListener('click', userInteractionListener, { capture: true, once: false })
      document.addEventListener('keydown', userInteractionListener, { capture: true, once: false })

      // Store references to remove listeners later if needed during cleanup
      // (Consider managing these listeners more robustly if issues arise)
    }
  }

  /**
   * Closes the visualizer dialog and cleans up associated resources.
   */
  private closeVisualizerDialog(): void {
    if (this.visualizerDialog) {
      const visualizer = Visualizer.getInstance()
      const visualizerCanvas = visualizer.getCanvasElement()

      // Notify visualizer its canvas is being removed from DOM
      if (visualizerCanvas && this.visualizerDialog.contains(visualizerCanvas)) {
        visualizer.notifyUnmounted()
      }

      if (this.visualizerDialog.open) {
        this.visualizerDialog.close()
      }
      if (this.visualizerDialog.parentNode) {
        this.visualizerDialog.parentNode.removeChild(this.visualizerDialog)
      }
      this.visualizerDialog = null
      this.visualizerCanvasContainer = null // Clear container ref
    }
    // Consider removing document-level interaction listeners here if they weren't removed automatically
    // This might require storing the listener function references
    // delete document.body.dataset.zusoundListenerAttached; // Ensure flag is cleared
  }

  /**
   * Clean up audio resources and visualizer dialog.
   * @returns Promise that resolves when the context is closed.
   */
  public async cleanup(): Promise<void> {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close()
      } catch (err: unknown) {
        console.warn(
          'Error closing audio context:',
          err instanceof Error ? err.message : String(err)
        )
      } finally {
        this.audioContext = null // Ensure context is nulled even if close fails
      }
    } else {
      this.audioContext = null
    }

    // Close and remove dialog
    this.closeVisualizerDialog()

    // It might be too aggressive to cleanup the Visualizer singleton here,
    // as other parts of the app might re-initialize it. Let it persist unless
    // the entire application is shutting down.
    // Visualizer.getInstance().cleanup();
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
