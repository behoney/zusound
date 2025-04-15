// Visualizer for sonification events
// Renders visualization to a canvas based on 'zusound' events.

import type { SonicChunk } from '../sonification'
import type { ZusoundEvent, ZusoundEventDetail } from '../types/visualizer'

// Export core types
export * from '../types/visualizer'
// Export persistent UI functions directly
export { showPersistentVisualizer, hidePersistentVisualizer } from './dialog'

// Constants for visualizer configuration
const VISUALIZER_SIZE = 64
const MAX_VISIBLE_EVENTS = 10 // Maximum number of events to display at once
const EVENT_LIFETIME_MS = 1000 // How long each event stays visible

// Interface for the visualizer events in the queue
interface VisualizerEvent {
  chunk: SonicChunk
  startTime: number
  /** Progress from 0 to 1 representing the event's lifetime */
  getProgress: () => number
}

// Declare the global variable for the singleton
declare global {
  // eslint-disable-next-line no-var
  var __VISUALIZER_SINGLETON__: Visualizer | undefined
}

/**
 * WebGL Shader Manager for the visualizer
 * Handles setting up the canvas, WebGL context, shaders, and rendering
 */
class VisualizerShaderManager {
  private canvas: HTMLCanvasElement
  private gl: WebGLRenderingContext | null = null
  private program: WebGLProgram | null = null
  private uniforms: Record<string, WebGLUniformLocation | null> = {}
  private vertexBuffer: WebGLBuffer | null = null
  private events: VisualizerEvent[] = []
  private animationFrameId: number | null = null
  private isMounted = false // Track if canvas is in the DOM

  // Vertex shader source (positions for a full-screen quad)
  private vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_position * 0.5 + 0.5;
    }
  `

  // Fragment shader source (visualizes sound events)
  private fragmentShaderSource = `
    precision mediump float;
    varying vec2 v_texCoord;
    
    uniform int u_eventCount;
    uniform float u_eventProgress[${MAX_VISIBLE_EVENTS}];
    uniform float u_eventFrequency[${MAX_VISIBLE_EVENTS}];
    uniform float u_eventMagnitude[${MAX_VISIBLE_EVENTS}];
    uniform float u_eventDetune[${MAX_VISIBLE_EVENTS}];
    uniform int u_eventType[${MAX_VISIBLE_EVENTS}]; // 0=sine, 1=square, 2=sawtooth, 3=triangle
    
    vec3 getTypeColor(int type) {
      if (type == 0) return vec3(0.2, 0.6, 1.0); // sine - blue
      if (type == 1) return vec3(1.0, 0.5, 0.2); // square - orange
      if (type == 2) return vec3(0.2, 1.0, 0.5); // sawtooth - green
      return vec3(1.0, 0.3, 0.8); // triangle - pink
    }
    
    float getWaveShape(int type, float t) {
      t = fract(t);
      if (type == 0) return 0.5 + 0.5 * sin(t * 6.28318);
      if (type == 1) return t < 0.5 ? 0.0 : 1.0;
      if (type == 2) return t;
      return t < 0.5 ? t * 2.0 : 2.0 - t * 2.0;
    }
    
    void main() {
      vec2 p = (v_texCoord * 2.0 - 1.0);
      vec3 color = vec3(0.1, 0.1, 0.15);
      float alpha = 1.0;
      float bgGlow = 1.0 - length(p);
      color += vec3(0.05, 0.05, 0.1) * max(0.0, bgGlow);
      
      for (int i = 0; i < ${MAX_VISIBLE_EVENTS}; i++) {
        if (i >= u_eventCount) break;
        if (u_eventProgress[i] >= 1.0) continue;
        
        float progress = u_eventProgress[i];
        float magnitude = u_eventMagnitude[i];
        float frequency = u_eventFrequency[i] / 440.0;
        float detune = u_eventDetune[i] / 1200.0;
        float scaledFreq = frequency * pow(2.0, detune);
        int type = u_eventType[i];
        
        float fadeIn = smoothstep(0.0, 0.1, progress);
        float fadeOut = 1.0 - smoothstep(0.7, 1.0, progress);
        float visibility = fadeIn * fadeOut;
        float dist = length(p);
        float ringWidth = 0.05 * magnitude;
        float ringSize = 0.3 + 0.7 * (1.0 - progress);
        float ring = smoothstep(ringSize - ringWidth, ringSize, dist) * 
                     smoothstep(ringSize + ringWidth, ringSize, dist);
        float ripples = getWaveShape(type, dist * 10.0 * scaledFreq);
        vec3 eventColor = getTypeColor(type);
        float eventEffect = (ring * 0.8 + ripples * 0.2) * visibility * magnitude;
        color += eventColor * eventEffect;
      }
      
      gl_FragColor = vec4(color, alpha);
    }
  `

  constructor() {
    this.canvas = document.createElement('canvas')
    this.canvas.width = VISUALIZER_SIZE
    this.canvas.height = VISUALIZER_SIZE
    // Basic styling - persistentUI.ts handles layout
    this.canvas.style.display = 'block'
    this.canvas.style.borderRadius = '50%' // Keep the round style
  }

  public getCanvasElement(): HTMLCanvasElement {
    return this.canvas
  }

  public initialize(): boolean {
    if (this.gl) return true
    if (typeof window === 'undefined') return false

    try {
      this.gl = this.canvas.getContext('webgl')
      if (!this.gl) {
        console.error('WebGL not supported')
        return false
      }

      const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, this.vertexShaderSource)
      const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, this.fragmentShaderSource)
      if (!vertexShader || !fragmentShader) return false

      this.program = this.gl.createProgram()
      if (!this.program) return false
      this.gl.attachShader(this.program, vertexShader)
      this.gl.attachShader(this.program, fragmentShader)
      this.gl.linkProgram(this.program)

      if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
        console.error('Could not link WebGL program:', this.gl.getProgramInfoLog(this.program))
        return false
      }
      this.gl.useProgram(this.program)

      const positions = [-1, -1, 1, -1, -1, 1, 1, 1]
      this.vertexBuffer = this.gl.createBuffer()
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer)
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW)

      const positionAttrib = this.gl.getAttribLocation(this.program, 'a_position')
      this.gl.enableVertexAttribArray(positionAttrib)
      this.gl.vertexAttribPointer(positionAttrib, 2, this.gl.FLOAT, false, 0, 0)

      this.uniforms = {
        u_eventCount: this.gl.getUniformLocation(this.program, 'u_eventCount'),
      }
      for (let i = 0; i < MAX_VISIBLE_EVENTS; i++) {
        this.uniforms[`u_eventProgress[${i}]`] = this.gl.getUniformLocation(
          this.program,
          `u_eventProgress[${i}]`
        )
        this.uniforms[`u_eventFrequency[${i}]`] = this.gl.getUniformLocation(
          this.program,
          `u_eventFrequency[${i}]`
        )
        this.uniforms[`u_eventMagnitude[${i}]`] = this.gl.getUniformLocation(
          this.program,
          `u_eventMagnitude[${i}]`
        )
        this.uniforms[`u_eventDetune[${i}]`] = this.gl.getUniformLocation(
          this.program,
          `u_eventDetune[${i}]`
        )
        this.uniforms[`u_eventType[${i}]`] = this.gl.getUniformLocation(
          this.program,
          `u_eventType[${i}]`
        )
      }

      return true
    } catch (err) {
      console.error('Failed to initialize WebGL visualizer:', err)
      this.gl = null // Ensure cleanup on partial failure
      this.program = null
      return false
    }
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null
    const shader = this.gl.createShader(type)
    if (!shader) return null
    this.gl.shaderSource(shader, source)
    this.gl.compileShader(shader)
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error(
        `Shader compile error (${type === this.gl.VERTEX_SHADER ? 'Vertex' : 'Fragment'}):`,
        this.gl.getShaderInfoLog(shader)
      )
      this.gl.deleteShader(shader)
      return null
    }
    return shader
  }

  public notifyMounted(): void {
    this.isMounted = true
    this.startRenderLoop()
  }

  public notifyUnmounted(): void {
    this.isMounted = false
    this.stopRenderLoop()
  }

  public addEvent(chunk: SonicChunk): void {
    const now = performance.now()
    const event: VisualizerEvent = {
      chunk,
      startTime: now,
      getProgress: () => Math.min(1, (performance.now() - event.startTime) / EVENT_LIFETIME_MS),
    }
    this.events.push(event)
    if (this.events.length > MAX_VISIBLE_EVENTS) {
      this.events.shift()
    }
    if (this.isMounted) {
      this.startRenderLoop() // Ensure loop runs if we add an event while mounted but idle
    }
  }

  private startRenderLoop(): void {
    if (this.animationFrameId !== null || !this.isMounted) return
    const renderFrame = () => {
      if (!this.isMounted) {
        this.animationFrameId = null
        return
      }
      this.render()
      // Keep looping only if mounted and there are active events
      this.events = this.events.filter(event => event.getProgress() < 1) // Prune finished events before check
      if (this.events.length > 0) {
        this.animationFrameId = requestAnimationFrame(renderFrame)
      } else {
        this.animationFrameId = null // Stop if no events are active
      }
    }
    this.animationFrameId = requestAnimationFrame(renderFrame)
  }

  private stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  private render(): void {
    if (!this.gl || !this.program || !this.isMounted) return

    this.gl.clearColor(0, 0, 0, 0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
    this.gl.useProgram(this.program)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer)
    const positionAttrib = this.gl.getAttribLocation(this.program, 'a_position')
    this.gl.enableVertexAttribArray(positionAttrib)
    this.gl.vertexAttribPointer(positionAttrib, 2, this.gl.FLOAT, false, 0, 0)

    this.gl.uniform1i(this.uniforms.u_eventCount, this.events.length)
    const typeMapping: Record<SonicChunk['type'], number> = {
      sine: 0,
      square: 1,
      sawtooth: 2,
      triangle: 3,
    }

    for (let i = 0; i < MAX_VISIBLE_EVENTS; i++) {
      if (i < this.events.length) {
        const event = this.events[i]
        const progress = event.getProgress()
        const chunk = event.chunk
        this.gl.uniform1f(this.uniforms[`u_eventProgress[${i}]`], progress)
        this.gl.uniform1f(this.uniforms[`u_eventFrequency[${i}]`], chunk.frequency)
        this.gl.uniform1f(this.uniforms[`u_eventMagnitude[${i}]`], chunk.magnitude)
        this.gl.uniform1f(this.uniforms[`u_eventDetune[${i}]`], chunk.detune)
        this.gl.uniform1i(this.uniforms[`u_eventType[${i}]`], typeMapping[chunk.type])
      } else {
        this.gl.uniform1f(this.uniforms[`u_eventProgress[${i}]`], 1.0) // Mark as inactive
      }
    }
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
  }

  public cleanup(): void {
    this.stopRenderLoop()
    if (this.gl) {
      if (this.program) {
        // Basic cleanup: delete buffer and program
        if (this.vertexBuffer) {
          this.gl.deleteBuffer(this.vertexBuffer)
          this.vertexBuffer = null
        }
        // Optionally delete shaders if they were stored
        this.gl.deleteProgram(this.program)
        this.program = null
      }
      // Attempt to lose context gracefully
      const loseContextExt = this.gl.getExtension('WEBGL_lose_context')
      if (loseContextExt) {
        loseContextExt.loseContext()
      }
    }
    this.gl = null
    this.events = []
    this.isMounted = false
  }
}

/**
 * Visualizer singleton instance manager
 */
export class Visualizer {
  private static instance: Visualizer | null = null
  private shaderManager: VisualizerShaderManager | null = null
  private isInitialized = false
  private eventListenerAttached = false

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): Visualizer {
    if (!Visualizer.instance) {
      Visualizer.instance = new Visualizer()
      // Automatically try to initialize and attach listener when instance is first created
      Visualizer.instance.initialize()
      Visualizer.instance.attachEventListener()

      // Store instance in global for access from persistentUI.ts
      if (typeof globalThis !== 'undefined') {
        globalThis.__VISUALIZER_SINGLETON__ = Visualizer.instance
      }
    }
    return Visualizer.instance
  }

  /** Initialize shader manager. Returns true if successful or already initialized. */
  public initialize(): boolean {
    if (this.isInitialized) return true
    if (typeof window === 'undefined') return false // Don't initialize outside browser

    try {
      this.shaderManager = new VisualizerShaderManager()
      this.isInitialized = this.shaderManager.initialize()
      if (!this.isInitialized) {
        this.shaderManager = null // Cleanup failed init
        console.error('Visualizer shader manager failed to initialize.')
      }
      return this.isInitialized
    } catch (error) {
      console.error('Error during visualizer initialization:', error)
      this.shaderManager = null
      this.isInitialized = false
      return false
    }
  }

  /** Returns the canvas element IF the visualizer is initialized. */
  public getCanvasElement(): HTMLCanvasElement | null {
    // Ensure initialized on demand
    if (!this.isInitialized && !this.initialize()) {
      return null
    }
    return this.shaderManager?.getCanvasElement() ?? null
  }

  public notifyMounted(): void {
    this.shaderManager?.notifyMounted()
  }

  public notifyUnmounted(): void {
    this.shaderManager?.notifyUnmounted()
  }

  /** Clean up visualizer resources. */
  public cleanup(): void {
    this.detachEventListener()
    this.shaderManager?.cleanup()
    this.isInitialized = false
    this.shaderManager = null
    // Clear global singleton reference
    if (typeof globalThis !== 'undefined' && globalThis.__VISUALIZER_SINGLETON__ === this) {
      globalThis.__VISUALIZER_SINGLETON__ = undefined
    }
    // Optionally reset the static instance if needed for full re-init capability
    // Visualizer.instance = null;
  }

  private handleSonificationEvent = (event: Event) => {
    if ('detail' in event && (event as ZusoundEvent).detail?.chunk) {
      // Ensure initialized before adding event
      if (this.isInitialized || this.initialize()) {
        this.shaderManager?.addEvent((event as ZusoundEvent).detail.chunk)
      }
    }
  }

  private attachEventListener(): void {
    if (this.eventListenerAttached || typeof window === 'undefined') return
    window.addEventListener('zusound', this.handleSonificationEvent)
    this.eventListenerAttached = true
  }

  private detachEventListener(): void {
    if (!this.eventListenerAttached || typeof window === 'undefined') return
    window.removeEventListener('zusound', this.handleSonificationEvent)
    this.eventListenerAttached = false
  }
}

// Optional: Expose function to ensure visualizer is ready
/** Ensures the visualizer singleton is initialized and listening for events. */
export function ensureVisualizerReady(): void {
  Visualizer.getInstance() // Accessing getInstance handles initialization
}

// Optional: Function to manually trigger visualization for testing
/** Manually visualize a sonic chunk by dispatching the event */
export function visualizeSonicChunk(chunk: SonicChunk): void {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent<ZusoundEventDetail>('zusound', { detail: { chunk } })
    window.dispatchEvent(event)
  }
}
