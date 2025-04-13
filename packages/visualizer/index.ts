// TODO:: Implement visualizer
// we need visualizer for the following:
// all the sonification events should be visualized in the UI at least the sound isn't playing because a browser requires any user input to play sound. so that we can't play sound until that and need to show the zusound in the mini right-top UI that shows minimum visualizing.

// this file is just for the visualizer. so the only logic here is to write how to visualize the sonification event.
// And it will 64*64 pixel size visualizer. and it will be better when we maximize to utilize the WebGL Shaders.

// Visualizer for sonification events
// A small 64x64 pixel WebGL-based visualizer that sits in the top-right corner
// of the application and visualizes sonification events.

import type { SonicChunk } from '../index'
import type { ZusoundEvent } from './types'

// Export types
export * from './types'

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
  private containerElement: HTMLElement | null = null

  // Vertex shader source (positions for a full-screen quad)
  private vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      // Map from clip space (-1 to +1) to texture coord space (0 to 1)
      v_texCoord = a_position * 0.5 + 0.5;
    }
  `

  // Fragment shader source (visualizes sound events)
  private fragmentShaderSource = `
    precision mediump float;
    varying vec2 v_texCoord;
    
    // Array of sound events (up to MAX_VISIBLE_EVENTS)
    uniform int u_eventCount;
    uniform float u_eventProgress[${MAX_VISIBLE_EVENTS}];
    uniform float u_eventFrequency[${MAX_VISIBLE_EVENTS}];
    uniform float u_eventMagnitude[${MAX_VISIBLE_EVENTS}];
    uniform float u_eventDetune[${MAX_VISIBLE_EVENTS}];
    uniform int u_eventType[${MAX_VISIBLE_EVENTS}]; // 0=sine, 1=square, 2=sawtooth, 3=triangle
    uniform int u_eventValueType[${MAX_VISIBLE_EVENTS}]; // 0=add, 1=remove, 2=change
    
    // Convert sound type to color
    vec3 getTypeColor(int type) {
      if (type == 0) return vec3(0.2, 0.6, 1.0); // sine - blue
      if (type == 1) return vec3(1.0, 0.5, 0.2); // square - orange
      if (type == 2) return vec3(0.2, 1.0, 0.5); // sawtooth - green
      return vec3(1.0, 0.3, 0.8); // triangle - pink
    }
    
    // Shape function based on sound type (0-1 range)
    float getWaveShape(int type, float t) {
      t = fract(t); // Ensure 0-1 range
      if (type == 0) return 0.5 + 0.5 * sin(t * 6.28318); // sine
      if (type == 1) return t < 0.5 ? 0.0 : 1.0; // square
      if (type == 2) return t; // sawtooth
      return t < 0.5 ? t * 2.0 : 2.0 - t * 2.0; // triangle
    }
    
    void main() {
      // Center coordinates at (0,0) and scale to -1 to 1
      vec2 p = (v_texCoord * 2.0 - 1.0);
      
      // Initialize with background color (dark)
      vec3 color = vec3(0.1, 0.1, 0.15);
      float alpha = 1.0;
      
      // Circular background glow
      float bgGlow = 1.0 - length(p);
      color += vec3(0.05, 0.05, 0.1) * max(0.0, bgGlow);
      
      // Process each active event
      for (int i = 0; i < ${MAX_VISIBLE_EVENTS}; i++) {
        if (i >= u_eventCount) break;
        
        // Skip events that are complete
        if (u_eventProgress[i] >= 1.0) continue;
        
        // Calculate event parameters
        float progress = u_eventProgress[i];
        float magnitude = u_eventMagnitude[i];
        float frequency = u_eventFrequency[i] / 440.0; // Normalize to A4
        float detune = u_eventDetune[i] / 1200.0; // Convert cents to ratio
        float scaledFreq = frequency * pow(2.0, detune);
        int type = u_eventType[i];
        int valueType = u_eventValueType[i];
        
        // Event lifecycle animation
        float fadeIn = smoothstep(0.0, 0.1, progress);
        float fadeOut = 1.0 - smoothstep(0.7, 1.0, progress);
        float visibility = fadeIn * fadeOut;
        
        // Distance from center
        float dist = length(p);
        
        // Ring effect based on frequency
        float ringWidth = 0.05 * magnitude;
        float ringSize = 0.3 + 0.7 * (1.0 - progress);
        float ring = smoothstep(ringSize - ringWidth, ringSize, dist) * 
                     smoothstep(ringSize + ringWidth, ringSize, dist);
        
        // Wave ripples based on frequency
        float ripples = getWaveShape(type, dist * 10.0 * scaledFreq);
        
        // Color based on sound type
        vec3 eventColor = getTypeColor(type);
        
        // Apply brightness based on remove (dimmer) or change (brighter)
        float brightness = valueType == 1 ? 0.6 : 1.0;
        
        // Combine effects
        float eventEffect = (ring * 0.8 + ripples * 0.2) * visibility * magnitude * brightness;
        
        // Add to final color (additive blending)
        color += eventColor * eventEffect;
      }
      
      // Output final color
      gl_FragColor = vec4(color, alpha);
    }
  `

  constructor() {
    // Create canvas element
    this.canvas = document.createElement('canvas')
    this.canvas.width = VISUALIZER_SIZE
    this.canvas.height = VISUALIZER_SIZE

    // Style the canvas for a top-right floating visualizer
    this.canvas.style.position = 'fixed'
    this.canvas.style.top = '16px'
    this.canvas.style.right = '16px'
    this.canvas.style.zIndex = '1000'
    this.canvas.style.borderRadius = '50%'
    this.canvas.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)'
    this.canvas.style.pointerEvents = 'none' // Don't block mouse events
  }

  /**
   * Initializes the WebGL context and shader program
   */
  public initialize(): boolean {
    try {
      // Get WebGL context
      this.gl = this.canvas.getContext('webgl')
      if (!this.gl) {
        console.error('WebGL not supported')
        return false
      }

      // Create shader program
      const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, this.vertexShaderSource)
      const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, this.fragmentShaderSource)

      if (!vertexShader || !fragmentShader) {
        return false
      }

      // Link the program
      this.program = this.gl.createProgram()
      if (!this.program) {
        console.error('Failed to create WebGL program')
        return false
      }

      this.gl.attachShader(this.program, vertexShader)
      this.gl.attachShader(this.program, fragmentShader)
      this.gl.linkProgram(this.program)

      if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
        console.error('Could not link WebGL program:', this.gl.getProgramInfoLog(this.program))
        return false
      }

      // Use the program
      this.gl.useProgram(this.program)

      // Set up the vertex buffer (a simple quad)
      const positions = [
        -1,
        -1, // bottom left
        1,
        -1, // bottom right
        -1,
        1, // top left
        1,
        1, // top right
      ]

      this.vertexBuffer = this.gl.createBuffer()
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer)
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW)

      // Get attribute locations
      const positionAttrib = this.gl.getAttribLocation(this.program, 'a_position')
      this.gl.enableVertexAttribArray(positionAttrib)
      this.gl.vertexAttribPointer(positionAttrib, 2, this.gl.FLOAT, false, 0, 0)

      // Store uniform locations
      this.uniforms = {
        u_eventCount: this.gl.getUniformLocation(this.program, 'u_eventCount'),
      }

      // Store array uniform locations
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
        this.uniforms[`u_eventValueType[${i}]`] = this.gl.getUniformLocation(
          this.program,
          `u_eventValueType[${i}]`
        )
      }

      return true
    } catch (err) {
      console.error('Failed to initialize WebGL visualizer:', err)
      return false
    }
  }

  /**
   * Compile a WebGL shader
   */
  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null

    const shader = this.gl.createShader(type)
    if (!shader) {
      console.error('Failed to create shader')
      return null
    }

    this.gl.shaderSource(shader, source)
    this.gl.compileShader(shader)

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Failed to compile shader:', this.gl.getShaderInfoLog(shader))
      this.gl.deleteShader(shader)
      return null
    }

    return shader
  }

  /**
   * Mount the visualizer canvas to the document
   */
  public mount(container?: HTMLElement): void {
    if (container) {
      container.appendChild(this.canvas)
      this.containerElement = container
    } else {
      document.body.appendChild(this.canvas)
    }

    // Start the render loop
    this.startRenderLoop()
  }

  /**
   * Unmount the visualizer canvas from the document
   */
  public unmount(): void {
    this.stopRenderLoop()

    if (this.containerElement && this.containerElement.contains(this.canvas)) {
      this.containerElement.removeChild(this.canvas)
    } else if (document.body.contains(this.canvas)) {
      document.body.removeChild(this.canvas)
    }
  }

  /**
   * Add a sound event to the visualizer
   */
  public addEvent(chunk: SonicChunk): void {
    const now = performance.now()

    const event: VisualizerEvent = {
      chunk,
      startTime: now,
      getProgress: () => {
        const elapsed = performance.now() - event.startTime
        return Math.min(1, elapsed / EVENT_LIFETIME_MS)
      },
    }

    // Add to the events array, limiting to max events
    this.events.push(event)
    if (this.events.length > MAX_VISIBLE_EVENTS) {
      this.events.shift() // Remove oldest event
    }
  }

  /**
   * Start the render loop
   */
  private startRenderLoop(): void {
    if (this.animationFrameId !== null) return

    const renderFrame = () => {
      this.render()
      this.animationFrameId = requestAnimationFrame(renderFrame)
    }

    this.animationFrameId = requestAnimationFrame(renderFrame)
  }

  /**
   * Stop the render loop
   */
  private stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  /**
   * Render the current state of the visualizer
   */
  private render(): void {
    if (!this.gl || !this.program) return

    // Clear the canvas
    this.gl.clearColor(0, 0, 0, 0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)

    // Filter out completed events
    this.events = this.events.filter(event => event.getProgress() < 1)

    // Update uniforms with event data
    this.gl.uniform1i(this.uniforms.u_eventCount, this.events.length)

    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i]
      const progress = event.getProgress()
      const chunk = event.chunk

      // Wave type mapping: sine=0, square=1, sawtooth=2, triangle=3
      const typeMapping: Record<SonicChunk['type'], number> = {
        sine: 0,
        square: 1,
        sawtooth: 2,
        triangle: 3,
      }

      // Value type mapping: add=0, remove=1, change=2
      const valueTypeMapping: Record<SonicChunk['valueType'], number> = {
        add: 0,
        remove: 1,
        change: 2,
      }

      // Set uniform values for this event
      this.gl.uniform1f(this.uniforms[`u_eventProgress[${i}]`], progress)
      this.gl.uniform1f(this.uniforms[`u_eventFrequency[${i}]`], chunk.frequency)
      this.gl.uniform1f(this.uniforms[`u_eventMagnitude[${i}]`], chunk.magnitude)
      this.gl.uniform1f(this.uniforms[`u_eventDetune[${i}]`], chunk.detune)
      this.gl.uniform1i(this.uniforms[`u_eventType[${i}]`], typeMapping[chunk.type])
      this.gl.uniform1i(this.uniforms[`u_eventValueType[${i}]`], valueTypeMapping[chunk.valueType])
    }

    // Draw the quad
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
  }
}

/**
 * Visualizer singleton instance
 */
export class Visualizer {
  private static instance: Visualizer | null = null
  private shaderManager: VisualizerShaderManager | null = null
  private isInitialized = false

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the visualizer singleton instance
   */
  public static getInstance(): Visualizer {
    if (!Visualizer.instance) {
      Visualizer.instance = new Visualizer()
    }
    return Visualizer.instance
  }

  /**
   * Initialize the visualizer
   */
  public initialize(): boolean {
    if (this.isInitialized) return true

    try {
      this.shaderManager = new VisualizerShaderManager()
      const success = this.shaderManager.initialize()

      if (success) {
        this.isInitialized = true
        return true
      } else {
        console.error('Failed to initialize visualizer shader manager')
        return false
      }
    } catch (err) {
      console.error('Error initializing visualizer:', err)
      return false
    }
  }

  /**
   * Mount the visualizer to the DOM
   */
  public mount(container?: HTMLElement): void {
    if (!this.isInitialized && !this.initialize()) {
      console.error('Cannot mount visualizer: not initialized')
      return
    }

    this.shaderManager?.mount(container)
  }

  /**
   * Unmount the visualizer from the DOM
   */
  public unmount(): void {
    this.shaderManager?.unmount()
  }

  /**
   * Visualize a sound event
   */
  public visualizeEvent(chunk: SonicChunk): void {
    if (!this.isInitialized && !this.initialize()) {
      return
    }

    this.shaderManager?.addEvent(chunk)
  }
}

/**
 * Manually visualize a sonic chunk
 * This is an alternative way to trigger visualizations directly without the event system
 * @param chunk - The sonic chunk to visualize
 */
export function visualizeSonicChunk(chunk: SonicChunk): void {
  Visualizer.getInstance().visualizeEvent(chunk)
}

/**
 * Initialize the visualizer component and mount it to the DOM
 * @param container - Optional container element to mount the visualizer in
 * @returns A function to unmount the visualizer
 */
export function initializeVisualizer(container?: HTMLElement): () => void {
  const visualizer = Visualizer.getInstance()
  visualizer.initialize()
  visualizer.mount(container)

  // Set up event listener for sonification events
  const handleSonificationEvent = (event: ZusoundEvent) => {
    if (event.detail && event.detail.chunk) {
      visualizer.visualizeEvent(event.detail.chunk)
    }
  }

  // Add event listener
  if (typeof window !== 'undefined') {
    window.addEventListener('zusound', handleSonificationEvent)
  }

  // Return unmount function that also removes the event listener
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('zusound', handleSonificationEvent)
    }
    visualizer.unmount()
  }
}

// Export the React component
export { Visualizer as VisualizerComponent } from './VisualizerComponent'
export { default as VisualizerReact } from './VisualizerComponent'
