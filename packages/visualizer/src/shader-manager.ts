import type { SonicChunk } from '../../shared-types'
import { MAX_VISIBLE_EVENTS } from './config'
import { VisualizerEvent } from './visualizer-core'

/**
 * WebGL Shader Manager for the visualizer.
 * Handles setting up the canvas, WebGL context, shaders, uniforms, buffers,
 * and rendering the visualization based on event data.
 */
export class VisualizerShaderManager {
  private canvas: HTMLCanvasElement
  private gl: WebGLRenderingContext | null = null
  private program: WebGLProgram | null = null
  private uniforms: Record<string, WebGLUniformLocation | null> = {}
  private vertexBuffer: WebGLBuffer | null = null

  // Vertex shader source (positions for a full-screen quad)
  private readonly vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_position * 0.5 + 0.5; // Map position to texture coordinates
    }
  `

  // Fragment shader source (visualizes sound events)
  private readonly fragmentShaderSource = `
    precision mediump float;
    varying vec2 v_texCoord;
    
    uniform int u_eventCount;
    uniform float u_eventProgress[${MAX_VISIBLE_EVENTS}];
    uniform float u_eventFrequency[${MAX_VISIBLE_EVENTS}];
    uniform float u_eventMagnitude[${MAX_VISIBLE_EVENTS}];
    uniform float u_eventDetune[${MAX_VISIBLE_EVENTS}];
    uniform int u_eventType[${MAX_VISIBLE_EVENTS}]; // 0=sine, 1=square, 2=sawtooth, 3=triangle
    uniform int u_eventAlertLevel[${MAX_VISIBLE_EVENTS}]; // 0=none, 1=warning, 2=critical
    uniform bool u_eventIsCriticalPath[${MAX_VISIBLE_EVENTS}];
    
    // Function to get color based on waveform type
    vec3 getTypeColor(int type) {
      if (type == 0) return vec3(0.2, 0.6, 1.0); // sine - blue
      if (type == 1) return vec3(1.0, 0.5, 0.2); // square - orange
      if (type == 2) return vec3(0.2, 1.0, 0.5); // sawtooth - green
      return vec3(1.0, 0.3, 0.8); // triangle - pink
    }
    
    // Function to get alert color based on alert level
    vec3 getAlertColor(int alertLevel) {
      if (alertLevel == 2) return vec3(1.0, 0.1, 0.1); // critical - bright red
      if (alertLevel == 1) return vec3(1.0, 0.7, 0.2); // warning - orange/amber
      return vec3(1.0, 1.0, 1.0); // normal - white
    }
    
    // Function to simulate wave shape based on type
    float getWaveShape(int type, float t) {
      t = fract(t); // Use fractional part for repeating pattern
      if (type == 0) return 0.5 + 0.5 * sin(t * 6.28318); // Sine wave
      if (type == 1) return t < 0.5 ? 0.0 : 1.0; // Square wave
      if (type == 2) return t; // Sawtooth wave
      return t < 0.5 ? t * 2.0 : 2.0 - t * 2.0; // Triangle wave
    }
    
    void main() {
      vec2 p = (v_texCoord * 2.0 - 1.0); // Map texture coords to -1 to 1 range
      vec3 color = vec3(0.1, 0.1, 0.15); // Base background color
      float alpha = 1.0; // Base alpha
      
      // Add subtle background glow towards the center
      float bgGlow = 1.0 - length(p);
      color += vec3(0.05, 0.05, 0.1) * max(0.0, bgGlow);
      
      // Loop through active events and layer their effects
      for (int i = 0; i < ${MAX_VISIBLE_EVENTS}; i++) {
        if (i >= u_eventCount) break; // Stop if we've processed all active events
        if (u_eventProgress[i] >= 1.0) continue; // Skip completed events
        
        // Get event properties from uniforms
        float progress = u_eventProgress[i];
        float magnitude = u_eventMagnitude[i];
        float frequency = u_eventFrequency[i] / 440.0; // Normalize frequency (relative to A4)
        float detune = u_eventDetune[i] / 1200.0; // Convert cents to octave fraction
        float scaledFreq = frequency * pow(2.0, detune); // Apply detune
        int type = u_eventType[i];
        int alertLevel = u_eventAlertLevel[i];
        bool isCriticalPath = u_eventIsCriticalPath[i];
        
        // Calculate visibility based on progress (fade in/out)
        float fadeIn = smoothstep(0.0, 0.1, progress);
        float fadeOut = 1.0 - smoothstep(0.7, 1.0, progress);
        float visibility = fadeIn * fadeOut;
        
        // Enhanced visibility for critical paths
        if (isCriticalPath) {
          if (alertLevel == 2) { // critical
            visibility *= 1.5; // 50% more visible
            // Add pulsing effect for critical events
            visibility *= 1.0 + 0.3 * sin(progress * 20.0);
          } else if (alertLevel == 1) { // warning
            visibility *= 1.2; // 20% more visible
            // Add gentle glow for warning events
            visibility *= 1.0 + 0.15 * sin(progress * 10.0);
          }
        }
        
        // Calculate effect based on distance from center and wave shape
        float dist = length(p);
        float ringWidth = 0.05 * magnitude; // Ring width depends on magnitude
        
        // Enhanced ring width for critical paths
        if (isCriticalPath) {
          ringWidth *= (alertLevel == 2) ? 1.8 : 1.4;
        }
        
        float ringSize = 0.3 + 0.7 * (1.0 - progress); // Ring expands outwards as progress decreases
        
        // Create a smooth ring shape
        float ring = smoothstep(ringSize - ringWidth, ringSize, dist) * 
                     smoothstep(ringSize + ringWidth, ringSize, dist);
                     
        // Add ripples based on wave shape and frequency
        float ripples = getWaveShape(type, dist * 10.0 * scaledFreq);
        
        // Choose color based on alert level or default type color
        vec3 eventColor;
        if (isCriticalPath && alertLevel > 0) {
          eventColor = getAlertColor(alertLevel);
        } else {
          eventColor = getTypeColor(type);
        }
        
        // Combine ring and ripples, apply visibility and magnitude
        float eventEffect = (ring * 0.8 + ripples * 0.2) * visibility * magnitude;
        
        // Enhanced intensity for critical paths
        if (isCriticalPath) {
          eventEffect *= (alertLevel == 2) ? 1.8 : 1.3;
        }
        
        // Add event's color contribution
        color += eventColor * eventEffect;
      }
      
      gl_FragColor = vec4(color, alpha);
    }
  `

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.canvas.style.display = 'block'
    this.canvas.style.borderRadius = '50%' // Maintain the round style
  }

  public getCanvasElement(): HTMLCanvasElement {
    return this.canvas
  }

  /** Initialize WebGL context, shaders, program, and buffers. */
  public initialize(): boolean {
    if (this.gl) return true // Already initialized
    if (typeof window === 'undefined') return false // Cannot initialize outside browser

    try {
      this.gl = this.canvas.getContext('webgl', { alpha: true, antialias: true })
      if (!this.gl) {
        console.error('WebGL not supported or context creation failed.')
        return false
      }

      const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, this.vertexShaderSource)
      const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, this.fragmentShaderSource)
      if (!vertexShader || !fragmentShader) return false

      this.program = this.gl.createProgram()
      if (!this.program) {
        console.error('Failed to create WebGL program.')
        return false
      }
      this.gl.attachShader(this.program, vertexShader)
      this.gl.attachShader(this.program, fragmentShader)
      this.gl.linkProgram(this.program)

      if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
        console.error('Could not link WebGL program:', this.gl.getProgramInfoLog(this.program))
        this.gl.deleteProgram(this.program)
        this.program = null
        return false
      }
      this.gl.useProgram(this.program)

      // Setup vertex buffer for a quad covering the canvas
      const positions = [-1, -1, 1, -1, -1, 1, 1, 1] // Triangle strip for a quad
      this.vertexBuffer = this.gl.createBuffer()
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer)
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW)

      // Link vertex buffer to shader attribute
      const positionAttrib = this.gl.getAttribLocation(this.program, 'a_position')
      this.gl.enableVertexAttribArray(positionAttrib)
      this.gl.vertexAttribPointer(positionAttrib, 2, this.gl.FLOAT, false, 0, 0)

      // Get uniform locations
      this.uniforms['u_eventCount'] = this.gl.getUniformLocation(this.program, 'u_eventCount')
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
        this.uniforms[`u_eventAlertLevel[${i}]`] = this.gl.getUniformLocation(
          this.program,
          `u_eventAlertLevel[${i}]`
        )
        this.uniforms[`u_eventIsCriticalPath[${i}]`] = this.gl.getUniformLocation(
          this.program,
          `u_eventIsCriticalPath[${i}]`
        )
      }

      return true
    } catch (err) {
      console.error('Failed to initialize WebGL shader manager:', err)
      this.cleanupPartialInit() // Clean up if initialization failed partway
      return false
    }
  }

  /** Compile a WebGL shader. */
  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null
    const shader = this.gl.createShader(type)
    if (!shader) {
      console.error('Failed to create shader object.')
      return null
    }
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

  /** Render a single frame based on the current events. */
  public render(events: ReadonlyArray<VisualizerEvent>): void {
    if (!this.gl || !this.program) return

    // Prepare rendering context
    this.gl.clearColor(0, 0, 0, 0) // Use transparent background
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
    this.gl.useProgram(this.program)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer)

    // Ensure vertex attribute is set up
    const positionAttrib = this.gl.getAttribLocation(this.program, 'a_position')
    this.gl.enableVertexAttribArray(positionAttrib)
    this.gl.vertexAttribPointer(positionAttrib, 2, this.gl.FLOAT, false, 0, 0)

    // Update uniforms with current event data
    this.updateUniforms(events)

    // Draw the quad
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
  }

  /** Update shader uniforms with data from active events. */
  private updateUniforms(events: ReadonlyArray<VisualizerEvent>): void {
    if (!this.gl || !this.program) return

    this.gl.uniform1i(this.uniforms['u_eventCount'], events.length)

    const typeMapping: Record<SonicChunk['type'], number> = {
      sine: 0,
      square: 1,
      sawtooth: 2,
      triangle: 3,
      custom: 3,
    }

    const alertLevelMapping = {
      none: 0,
      warning: 1,
      critical: 2,
    }

    for (let i = 0; i < MAX_VISIBLE_EVENTS; i++) {
      const uniformProgress = this.uniforms[`u_eventProgress[${i}]`]
      const uniformFrequency = this.uniforms[`u_eventFrequency[${i}]`]
      const uniformMagnitude = this.uniforms[`u_eventMagnitude[${i}]`]
      const uniformDetune = this.uniforms[`u_eventDetune[${i}]`]
      const uniformType = this.uniforms[`u_eventType[${i}]`]
      const uniformAlertLevel = this.uniforms[`u_eventAlertLevel[${i}]`]
      const uniformIsCriticalPath = this.uniforms[`u_eventIsCriticalPath[${i}]`]

      if (i < events.length) {
        const event = events[i]
        const chunk = event.chunk
        this.gl.uniform1f(uniformProgress, event.getProgress())
        this.gl.uniform1f(uniformFrequency, chunk.frequency)
        this.gl.uniform1f(uniformMagnitude, chunk.magnitude)
        this.gl.uniform1f(uniformDetune, chunk.detune)
        this.gl.uniform1i(uniformType, typeMapping[chunk.type] ?? 3) // Default to triangle if type is unknown

        // Map alert level to integer for shader
        const alertLevelInt = chunk.alertLevel ? alertLevelMapping[chunk.alertLevel] : 0
        this.gl.uniform1i(uniformAlertLevel, alertLevelInt)

        // Convert boolean to integer for shader (WebGL doesn't have native boolean uniforms in older versions)
        this.gl.uniform1i(uniformIsCriticalPath, chunk.isCriticalPath ? 1 : 0)
      } else {
        // Mark remaining uniform slots as inactive (progress >= 1.0)
        this.gl.uniform1f(uniformProgress, 1.0)
        this.gl.uniform1i(uniformAlertLevel, 0)
        this.gl.uniform1i(uniformIsCriticalPath, 0)
      }
    }
  }

  /** Clean up WebGL resources. */
  public cleanup(): void {
    this.stopRenderLoop() // Ensure loop is stopped (handled by VisualizerCore)
    if (this.gl) {
      if (this.program) {
        // Delete buffer and program
        if (this.vertexBuffer) {
          this.gl.deleteBuffer(this.vertexBuffer)
        }
        // Optionally delete shaders if they were stored
        this.gl.deleteProgram(this.program)
      }
      // Attempt to lose context gracefully if extension is available
      const loseContextExt = this.gl.getExtension('WEBGL_lose_context')
      if (loseContextExt) {
        loseContextExt.loseContext()
      }
    }
    this.cleanupPartialInit() // Reset all internal state
  }

  /** Resets internal state variables, useful for cleanup or failed initialization. */
  private cleanupPartialInit(): void {
    this.gl = null
    this.program = null
    this.vertexBuffer = null
    this.uniforms = {}
  }

  // Render loop control methods are now managed by VisualizerCore
  // These methods are kept conceptually but called by the owner (VisualizerCore)
  public startRenderLoop(): void {
    // Logic moved to VisualizerCore
  }
  public stopRenderLoop(): void {
    // Logic moved to VisualizerCore
  }
}
