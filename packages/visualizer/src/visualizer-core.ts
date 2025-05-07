import { SONIC_CHUNK_EVENT_NAME, SonicChunk } from '../../shared-types/sonic-chunk'
import { VisualizerShaderManager } from './shader-manager'
import { EVENT_LIFETIME_MS, MAX_VISIBLE_EVENTS, VISUALIZER_SIZE } from './config'
import { isSonificationEvent, ZusoundSoundEvent } from '../../shared-types'

/** Interface for the visualizer events queued for rendering */
export interface VisualizerEvent {
  chunk: SonicChunk
  startTime: number
  /** Calculate progress from 0 to 1 representing the event's lifetime */
  getProgress: () => number
}

/**
 * Visualizer singleton class.
 * Manages the visualizer's lifecycle, event queue, render loop,
 * and interactions with the ShaderManager and DOM events.
 */
export class Visualizer {
  private static instance: Visualizer | null = null
  private shaderManager: VisualizerShaderManager | null = null
  private isInitialized = false
  private eventListenerAttached = false
  private isMounted = false // Track if the canvas is currently in the DOM
  private animationFrameId: number | null = null
  private events: VisualizerEvent[] = []

  // Private constructor enforces singleton pattern
  private constructor() {}

  /** Get the singleton instance of the Visualizer. */
  public static getInstance(): Visualizer {
    if (!Visualizer.instance) {
      Visualizer.instance = new Visualizer()
      // Attempt initialization and attach listener immediately upon first instantiation
      Visualizer.instance.initialize()
      Visualizer.instance.attachEventListener()
    }
    return Visualizer.instance
  }

  /**
   * Initialize the visualizer, creating the ShaderManager if needed.
   * Returns true if successfully initialized or already initialized.
   */
  public initialize(): boolean {
    if (this.isInitialized) return true
    if (typeof window === 'undefined') {
      console.warn('Visualizer cannot initialize outside of a browser environment.')
      return false // Don't initialize outside browser
    }

    try {
      // Create ShaderManager with configured size
      this.shaderManager = new VisualizerShaderManager(VISUALIZER_SIZE, VISUALIZER_SIZE)
      this.isInitialized = this.shaderManager.initialize()

      if (!this.isInitialized) {
        console.error('Visualizer Shader Manager failed to initialize.')
        this.shaderManager = null // Ensure cleanup on failed init
      }
      return this.isInitialized
    } catch (error) {
      console.error('Error during visualizer initialization:', error)
      this.shaderManager = null
      this.isInitialized = false
      return false
    }
  }

  /** Returns the canvas element if the visualizer is initialized. */
  public getCanvasElement(): HTMLCanvasElement | null {
    // Ensure initialized on demand if not already
    if (!this.isInitialized && !this.initialize()) {
      return null
    }
    return this.shaderManager?.getCanvasElement() ?? null
  }

  /**
   * Notifies the visualizer that its canvas has been added to the DOM.
   * Starts the render loop if necessary.
   */
  public notifyMounted(): void {
    if (!this.isInitialized) {
      console.warn('Visualizer cannot be mounted before initialization.')
      return
    }
    this.isMounted = true
    this.startRenderLoop()
  }

  /**
   * Notifies the visualizer that its canvas has been removed from the DOM.
   * Stops the render loop.
   */
  public notifyUnmounted(): void {
    this.isMounted = false
    this.stopRenderLoop()
  }

  /** Adds a new sonification event to the queue for visualization. */
  public addEvent(chunk: SonicChunk): void {
    // Ensure initialization before adding events
    if (!this.isInitialized && !this.initialize()) {
      console.warn('Visualizer not initialized, cannot add event.')
      return
    }

    const now = performance.now()
    const event: VisualizerEvent = {
      chunk,
      startTime: now,
      // Calculate progress dynamically based on current time
      getProgress: () => Math.min(1, (performance.now() - event.startTime) / EVENT_LIFETIME_MS),
    }

    // Add the new event and maintain the maximum queue size
    this.events.push(event)
    if (this.events.length > MAX_VISIBLE_EVENTS) {
      this.events.shift() // Remove the oldest event
    }

    // Ensure the render loop is running if the canvas is mounted
    if (this.isMounted) {
      this.startRenderLoop()
    }
  }

  /** Starts the render loop if it's not already running and the canvas is mounted. */
  private startRenderLoop(): void {
    // Only start if mounted, initialized, and not already running
    if (this.animationFrameId !== null || !this.isMounted || !this.isInitialized) return

    const renderFrame = () => {
      // Stop the loop if no longer mounted or becomes uninitialized
      if (!this.isMounted || !this.isInitialized || !this.shaderManager) {
        this.animationFrameId = null
        return
      }

      // Prune events that have exceeded their lifetime
      this.events = this.events.filter(event => event.getProgress() < 1)

      // Render the current state of events
      this.shaderManager.render(this.events)

      // Continue the loop only if mounted and there are still active events
      if (this.isMounted && this.events.length > 0) {
        this.animationFrameId = requestAnimationFrame(renderFrame)
      } else {
        this.animationFrameId = null // Stop the loop if no active events or unmounted
      }
    }

    // Request the first frame
    this.animationFrameId = requestAnimationFrame(renderFrame)
  }

  /** Stops the currently active render loop. */
  private stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  /** Handles incoming sonic chunk custom events from the window. */
  private handleSonificationEvent = (event: ZusoundSoundEvent) => {
    // Type guard to ensure it's the correct event structure
    if (isSonificationEvent(event) && event.detail?.chunk) {
      this.addEvent(event.detail.chunk)
    }
  }

  /** Attaches the event listener to the window if not already attached. */
  private attachEventListener(): void {
    if (this.eventListenerAttached || typeof window === 'undefined') return
    // Listen to the specific SONIC_CHUNK_EVENT_NAME
    window.addEventListener(SONIC_CHUNK_EVENT_NAME, this.handleSonificationEvent)
    this.eventListenerAttached = true
  }

  /** Detaches the event listener from the window. */
  private detachEventListener(): void {
    if (!this.eventListenerAttached || typeof window === 'undefined') return
    window.removeEventListener(SONIC_CHUNK_EVENT_NAME, this.handleSonificationEvent)
    this.eventListenerAttached = false
  }

  /** Clean up visualizer resources, including the ShaderManager and event listeners. */
  public cleanup(): void {
    this.stopRenderLoop()
    this.detachEventListener()
    this.shaderManager?.cleanup()
    this.isInitialized = false
    this.isMounted = false
    this.shaderManager = null
    this.events = [] // Clear event queue

    // Optionally reset the static instance if full re-initialization is needed
    Visualizer.instance = null
  }
}
