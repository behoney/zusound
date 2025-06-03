import { Visualizer } from './visualizer-core'

/** Position options for the visualizer */
export type VisualizerPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'

/** Size presets for the visualizer */
export type VisualizerSize = 'small' | 'medium' | 'large' | number

/** Theme options for the visualizer */
export type VisualizerTheme = 'dark' | 'light' | 'auto'

/** Configuration options for the visualizer */
export interface VisualizerOptions {
  /** Position of the visualizer (default: 'top-right') */
  position?: VisualizerPosition
  /** Size of the visualizer (default: 'medium') */
  size?: VisualizerSize
  /** Opacity of the visualizer (default: 0.8) */
  opacity?: number
  /** Theme for the visualizer (default: 'dark') */
  theme?: VisualizerTheme
  /** Auto-show on creation (default: false) */
  autoShow?: boolean
  /** Make visualizer draggable (default: false) */
  draggable?: boolean
  /** Custom CSS class names */
  className?: string
  /** Custom inline styles */
  customStyles?: Partial<CSSStyleDeclaration>
  /** Z-index for positioning (default: 9999) */
  zIndex?: number
}

/** Event types emitted by visualizer */
export type VisualizerEventType = 'show' | 'hide' | 'mount' | 'unmount' | 'config-changed' | 'error'

/** Event listener callback function */
export type VisualizerEventListener<T = unknown> = (data?: T) => void

/** Interface for visualizer management */
export interface VisualizerInstance {
  /** Whether the visualizer is currently visible */
  readonly isVisible: boolean
  /** Whether the visualizer is mounted in DOM */
  readonly isMounted: boolean
  /** Current configuration */
  readonly config: Readonly<Required<VisualizerOptions>>

  /** Show the visualizer */
  show(): void
  /** Hide the visualizer */
  hide(): void
  /** Toggle visualizer visibility */
  toggle(): void
  /** Update configuration */
  configure(newConfig: Partial<VisualizerOptions>): void
  /** Get the DOM container element */
  getContainer(): HTMLDivElement | null
  /** Get the canvas element */
  getCanvas(): HTMLCanvasElement | null
  /** Add event listener */
  on<T = unknown>(event: VisualizerEventType, listener: VisualizerEventListener<T>): void
  /** Remove event listener */
  off<T = unknown>(event: VisualizerEventType, listener: VisualizerEventListener<T>): void
  /** Destroy the visualizer */
  destroy(): void
}

/** Default configuration values */
const DEFAULT_CONFIG: Required<VisualizerOptions> = {
  position: 'top-right',
  size: 'medium',
  opacity: 0.8,
  theme: 'dark',
  autoShow: false,
  draggable: false,
  className: '',
  customStyles: {},
  zIndex: 9999,
}

/** Size mappings for preset values */
const SIZE_MAPPINGS: Record<Exclude<VisualizerSize, number>, number> = {
  small: 48,
  medium: 64,
  large: 96,
}

/** Position style mappings */
const POSITION_STYLES: Record<VisualizerPosition, Partial<CSSStyleDeclaration>> = {
  'top-left': { top: '20px', left: '20px' },
  'top-right': { top: '20px', right: '20px' },
  'bottom-left': { bottom: '20px', left: '20px' },
  'bottom-right': { bottom: '20px', right: '20px' },
  center: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
}

/** Single visualizer manager implementation */
export class VisualizerManager implements VisualizerInstance {
  private static instance: VisualizerManager | null = null

  private _config: Required<VisualizerOptions>
  private _isVisible = false
  private _isMounted = false
  private container: HTMLDivElement | null = null
  private visualizer: Visualizer
  private eventListeners = new Map<VisualizerEventType, Set<VisualizerEventListener>>()

  private constructor(options: VisualizerOptions = {}) {
    this._config = { ...DEFAULT_CONFIG, ...options }
    this.visualizer = Visualizer.getInstance()

    // Auto-show if configured
    if (this._config.autoShow) {
      this.show()
    }
  }

  /** Get the singleton visualizer instance */
  public static getInstance(options?: VisualizerOptions): VisualizerManager {
    if (!VisualizerManager.instance) {
      VisualizerManager.instance = new VisualizerManager(options)
    }
    return VisualizerManager.instance
  }

  /** Reset the singleton instance (useful for testing) */
  public static reset(): void {
    if (VisualizerManager.instance) {
      VisualizerManager.instance.destroy()
      VisualizerManager.instance = null
    }
  }

  /** Get current configuration (readonly) */
  public get config(): Readonly<Required<VisualizerOptions>> {
    return { ...this._config }
  }

  /** Get visibility state */
  public get isVisible(): boolean {
    return this._isVisible
  }

  /** Get mount state */
  public get isMounted(): boolean {
    return this._isMounted
  }

  /** Show the visualizer */
  public show(): void {
    if (this._isVisible) return

    this.createContainer()
    this._isVisible = true
    this.emit('show', { config: this._config })
  }

  /** Hide the visualizer */
  public hide(): void {
    if (!this._isVisible) return

    this.removeContainer()
    this._isVisible = false
    this.emit('hide')
  }

  /** Toggle visualizer visibility */
  public toggle(): void {
    if (this._isVisible) {
      this.hide()
    } else {
      this.show()
    }
  }

  /** Update configuration */
  public configure(newConfig: Partial<VisualizerOptions>): void {
    const oldConfig = { ...this._config }
    this._config = { ...this._config, ...newConfig }

    // If visible, recreate container with new config
    if (this._isVisible) {
      this.removeContainer()
      this.createContainer()
    }

    this.emit('config-changed', { oldConfig, newConfig: this._config })
  }

  /** Get the DOM container element */
  public getContainer(): HTMLDivElement | null {
    return this.container
  }

  /** Get the canvas element */
  public getCanvas(): HTMLCanvasElement | null {
    return this.visualizer.getCanvasElement()
  }

  /** Add event listener */
  public on<T = unknown>(event: VisualizerEventType, listener: VisualizerEventListener<T>): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener as VisualizerEventListener)
  }

  /** Remove event listener */
  public off<T = unknown>(event: VisualizerEventType, listener: VisualizerEventListener<T>): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener as VisualizerEventListener)
      if (listeners.size === 0) {
        this.eventListeners.delete(event)
      }
    }
  }

  /** Emit event to listeners */
  private emit<T = unknown>(event: VisualizerEventType, data?: T): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error(`Error in visualizer ${event} listener:`, error)
        }
      })
    }
  }

  /** Destroy the visualizer */
  public destroy(): void {
    this.hide()
    this.eventListeners.clear()
    VisualizerManager.instance = null
  }

  /** Create and mount the container */
  private createContainer(): void {
    if (typeof document === 'undefined') {
      console.warn('Cannot create visualizer container outside browser environment')
      return
    }

    const canvas = this.visualizer.getCanvasElement()
    if (!canvas) {
      console.error('Visualizer canvas unavailable. Cannot create container.')
      this.emit('error', { message: 'Canvas unavailable' })
      return
    }

    // Create container element
    this.container = document.createElement('div')
    this.container.id = 'zusound-visualizer-container'

    // Apply base styles
    const size =
      typeof this._config.size === 'number' ? this._config.size : SIZE_MAPPINGS[this._config.size]
    const positionStyles = POSITION_STYLES[this._config.position]

    this.container.style.cssText = `
      position: fixed;
      background: rgba(30, 30, 40, ${this._config.opacity});
      border-radius: 50%;
      z-index: ${this._config.zIndex};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      width: ${size}px;
      height: ${size}px;
      transition: transform 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease;
      cursor: ${this._config.draggable ? 'move' : 'pointer'};
      opacity: ${this._config.opacity};
      transform: scale(1);
    `

    // Apply position styles
    Object.assign(this.container.style, positionStyles)

    // Apply custom styles
    Object.assign(this.container.style, this._config.customStyles)

    // Add custom class name
    if (this._config.className) {
      this.container.className = this._config.className
    }

    // Add draggable functionality if enabled
    if (this._config.draggable) {
      this.makeDraggable(this.container)
    }

    // Append canvas and mount
    this.container.appendChild(canvas)
    document.body.appendChild(this.container)

    // Notify visualizer core
    this.visualizer.notifyMounted()
    this._isMounted = true
    this.emit('mount', { container: this.container, canvas })
  }

  /** Remove and unmount the container */
  private removeContainer(): void {
    if (!this.container) return

    const canvas = this.visualizer.getCanvasElement()

    // Notify visualizer core before unmounting
    if (canvas && this.container.contains(canvas)) {
      this.visualizer.notifyUnmounted()
    }

    // Remove from DOM
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }

    this._isMounted = false
    this.emit('unmount', { container: this.container, canvas })
    this.container = null
  }

  /** Make container draggable */
  private makeDraggable(element: HTMLElement): void {
    let isDragging = false
    let startX = 0
    let startY = 0
    let initialX = 0
    let initialY = 0

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true
      startX = e.clientX
      startY = e.clientY

      const rect = element.getBoundingClientRect()
      initialX = rect.left
      initialY = rect.top

      element.style.cursor = 'grabbing'
      e.preventDefault()
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY

      element.style.left = `${initialX + deltaX}px`
      element.style.top = `${initialY + deltaY}px`
      element.style.right = 'auto'
      element.style.bottom = 'auto'
      element.style.transform = 'none'
    }

    const handleMouseUp = () => {
      isDragging = false
      element.style.cursor = 'move'
    }

    element.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
}
