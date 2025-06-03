import { Visualizer } from './visualizer-core'
import { getVisualizer } from './factory'

/** Performance metrics for visualizer monitoring */
export interface VisualizerPerformanceMetrics {
  /** Current frame rate */
  currentFps: number
  /** Average frame rate over the last second */
  averageFps: number
  /** Frame time in milliseconds */
  frameTimeMs: number
  /** Number of active events being rendered */
  activeEvents: number
  /** WebGL context status */
  webglStatus: 'healthy' | 'context-lost' | 'not-supported'
  /** Memory usage estimate in MB */
  memoryUsageMB: number
  /** Last update timestamp */
  timestamp: number
}

/** Debug information about visualizer state */
export interface VisualizerDebugInfo {
  /** Core visualizer state */
  coreState: {
    isInitialized: boolean
    isMounted: boolean
    hasCanvas: boolean
    canvasSize: { width: number; height: number } | null
    eventQueueLength: number
  }
  /** Instance information */
  instance: {
    exists: boolean
    isVisible: boolean
    isMounted: boolean
    config: unknown
    hasContainer: boolean
    containerSize: { width: number; height: number } | null
  }
  /** Performance metrics */
  performance: VisualizerPerformanceMetrics
  /** Browser environment info */
  environment: {
    userAgent: string
    webglSupported: boolean
    webgl2Supported: boolean
    documentVisible: boolean
    windowFocused: boolean
  }
}

/**
 * Get comprehensive debug information about the visualizer
 */
export function getDebugInfo(): VisualizerDebugInfo {
  const visualizer = Visualizer.getInstance()
  const canvas = visualizer.getCanvasElement()
  const instance = getVisualizer()

  // Collect core state
  const coreState = {
    isInitialized: !!(canvas && visualizer),
    isMounted: checkIsMounted(visualizer),
    hasCanvas: !!canvas,
    canvasSize: canvas ? { width: canvas.width, height: canvas.height } : null,
    eventQueueLength: getEventQueueLength(visualizer),
  }

  // Collect instance information
  const instanceInfo = {
    exists: !!instance,
    isVisible: instance?.isVisible ?? false,
    isMounted: instance?.isMounted ?? false,
    config: instance?.config ?? null,
    hasContainer: !!instance?.getContainer(),
    containerSize: instance?.getContainer()
      ? {
          width: instance.getContainer()!.offsetWidth,
          height: instance.getContainer()!.offsetHeight,
        }
      : null,
  }

  // Get current performance metrics
  const performance = getCurrentPerformanceMetrics()

  // Collect environment information
  const environment = {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    webglSupported: checkWebGLSupport(),
    webgl2Supported: checkWebGL2Support(),
    documentVisible: typeof document !== 'undefined' ? !document.hidden : true,
    windowFocused: typeof document !== 'undefined' ? document.hasFocus() : true,
  }

  return {
    coreState,
    instance: instanceInfo,
    performance,
    environment,
  }
}

/**
 * Log debug information to console in a formatted way
 */
export function debugVisualizer(): void {
  const info = getDebugInfo()

  console.group('🎵 ZuSound Visualizer Debug Info')

  console.group('Core State')
  console.table(info.coreState)
  console.groupEnd()

  console.group('Instance')
  console.table(info.instance)
  console.groupEnd()

  console.group('Performance')
  console.table(info.performance)
  console.groupEnd()

  console.group('Environment')
  console.table(info.environment)
  console.groupEnd()

  console.groupEnd()
}

/**
 * Get current performance metrics
 */
export function checkPerformance(): VisualizerPerformanceMetrics {
  return getCurrentPerformanceMetrics()
}

/**
 * Export debug data as JSON for sharing or analysis
 */
export function exportDebugData(): unknown {
  const debugInfo = getDebugInfo()
  return {
    ...debugInfo,
    exportTimestamp: Date.now(),
    exportDate: new Date().toISOString(),
    zusoundVersion: 'unknown', // Would need to be exposed from main package
  }
}

/**
 * Download debug data as JSON file
 */
export function downloadDebugData(filename?: string): void {
  const data = exportDebugData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename || `zusound-debug-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  console.log(`🎵 ZuSound: Debug data exported as ${a.download}`)
}

// Private helper functions

function getCurrentPerformanceMetrics(): VisualizerPerformanceMetrics {
  const now = performance.now()

  // Basic FPS estimation (simplified)
  const currentFps = 60 // Placeholder - would need frame timing
  const averageFps = 60 // Placeholder - would need frame history

  // Get visualizer state
  const activeEvents = 0 // Placeholder - would need access to event queue

  // Estimate memory usage (rough calculation)
  const memoryUsageMB = estimateMemoryUsage()

  return {
    currentFps: Math.round(currentFps * 10) / 10,
    averageFps: Math.round(averageFps * 10) / 10,
    frameTimeMs: 16.67, // Placeholder
    activeEvents,
    webglStatus: getWebGLStatus(),
    memoryUsageMB: Math.round(memoryUsageMB * 100) / 100,
    timestamp: now,
  }
}

function checkIsMounted(visualizer: Visualizer): boolean {
  // Access private property - in real implementation this should be exposed
  return !!(visualizer as unknown as { isMounted?: boolean }).isMounted
}

function getEventQueueLength(visualizer: Visualizer): number {
  // Access private property - in real implementation this should be exposed
  return (visualizer as unknown as { events?: unknown[] }).events?.length || 0
}

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

function checkWebGL2Support(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!canvas.getContext('webgl2')
  } catch {
    return false
  }
}

function getWebGLStatus(): 'healthy' | 'context-lost' | 'not-supported' {
  if (!checkWebGLSupport()) {
    return 'not-supported'
  }

  try {
    const visualizer = Visualizer.getInstance()
    const canvas = visualizer.getCanvasElement()
    if (!canvas) return 'not-supported'

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return 'not-supported'

    // Check for context lost
    if ('isContextLost' in gl && typeof gl.isContextLost === 'function') {
      return gl.isContextLost() ? 'context-lost' : 'healthy'
    }

    return 'healthy'
  } catch {
    return 'not-supported'
  }
}

function estimateMemoryUsage(): number {
  // Rough estimate based on visualizer and canvas
  const visualizer = Visualizer.getInstance()
  const canvas = visualizer.getCanvasElement()

  let usage = 0

  // Base usage for core visualizer
  usage += 5 // MB

  // Canvas memory (rough estimate)
  if (canvas) {
    const pixels = canvas.width * canvas.height
    usage += (pixels * 4) / (1024 * 1024) // 4 bytes per pixel (RGBA)
  }

  // Instance overhead
  const instance = getVisualizer()
  if (instance) {
    usage += 0.1 // MB for instance
  }

  return usage
}
