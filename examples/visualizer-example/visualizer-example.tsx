import React, { useState, useEffect, useCallback } from 'react'
import { create } from 'zustand'
import {
  zusound,
  // Simplified API imports
  createVisualizer,
  getVisualizer,
  hasVisualizer,
  debugVisualizer,
  checkPerformance,
  type VisualizerInstance,
  type VisualizerPosition,
  type VisualizerSize,
  type VisualizerPerformanceMetrics
} from '../../packages'
import { CodeViewer } from '../code-viewer'
import visualizerExampleSource from './visualizer-example.tsx?raw'

// --- Zustand Store ---
interface CounterState {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

// Create a store with zusound middleware
const useCounterStore = create<CounterState>()(
  zusound(
    set => ({
      count: 0,
      increment: () => set(state => ({ count: state.count + 1 })),
      decrement: () => set(state => ({ count: state.count - 1 })),
      reset: () => set({ count: 0 }),
    }),
    {
      enabled: true,
      watchPaths: [
        {
          path: 'count',
          alertLevel: 'critical',
        },
      ],
    }
  )
)

// Example demonstrating the simplified visualizer API with best DX
const VisualizerExample: React.FC = () => {
  const { count, increment, decrement, reset } = useCounterStore()

  // Visualizer state
  const [visualizer, setVisualizer] = useState<VisualizerInstance | null>(null)
  const [isVisualizerCreated, setIsVisualizerCreated] = useState(false)
  const [eventLogs, setEventLogs] = useState<string[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<VisualizerPerformanceMetrics | null>(null)

  // Configuration options
  const [position, setPosition] = useState<VisualizerPosition>('top-right')
  const [size, setSize] = useState<VisualizerSize>('medium')
  const [draggable, setDraggable] = useState(false)
  const [opacity, setOpacity] = useState(0.8)

  // Event logger helper
  const logEvent = useCallback((message: string) => {
    setEventLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`])
  }, [])

  // Create or get visualizer
  const handleCreateVisualizer = () => {
    try {
      const instance = createVisualizer({
        position,
        size,
        draggable,
        opacity,
        autoShow: true
      })

      // Add event listeners for feedback
      instance.on('show', () => logEvent('Visualizer shown'))
      instance.on('hide', () => logEvent('Visualizer hidden'))
      instance.on('mount', () => logEvent('Visualizer mounted to DOM'))
      instance.on('unmount', () => logEvent('Visualizer unmounted from DOM'))
      instance.on('config-changed', () => logEvent('Visualizer configuration updated'))
      instance.on('error', ({ message }) => logEvent(`Error: ${message}`))

      setVisualizer(instance)
      setIsVisualizerCreated(true)
      logEvent('Visualizer created successfully')
    } catch (error) {
      logEvent(`Failed to create visualizer: ${error}`)
    }
  }

  // Update configuration
  const handleUpdateConfig = () => {
    if (visualizer) {
      visualizer.configure({
        position,
        size,
        draggable,
        opacity
      })
      logEvent('Configuration updated')
    }
  }

  // Show/hide visualizer
  const handleShow = () => {
    visualizer?.show()
  }

  const handleHide = () => {
    visualizer?.hide()
  }

  const handleToggle = () => {
    visualizer?.toggle()
  }

  // Destroy visualizer
  const handleDestroy = () => {
    if (visualizer) {
      visualizer.destroy()
      setVisualizer(null)
      setIsVisualizerCreated(false)
      logEvent('Visualizer destroyed')
    }
  }

  // Developer tools
  const handleDebugInfo = () => {
    debugVisualizer()
    logEvent('Debug information logged to console')
  }

  const handlePerformanceCheck = useCallback(() => {
    try {
      const metrics = checkPerformance()
      setPerformanceMetrics(metrics)
      logEvent(`Performance: ${metrics.currentFps} FPS, ${metrics.memoryUsageMB}MB`)
    } catch {
      logEvent('Performance check failed')
    }
  }, [logEvent])

  const clearEventLogs = () => {
    setEventLogs([])
  }

  // Auto-update performance metrics
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasVisualizer()) {
        handlePerformanceCheck()
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [handlePerformanceCheck])

  // Check if visualizer exists on component mount
  useEffect(() => {
    setIsVisualizerCreated(hasVisualizer())
    const existing = getVisualizer()
    if (existing) {
      setVisualizer(existing)
    }
  }, [])

  return (
    <div className="container mx-auto p-6">
      <h1>Enhanced Visualizer API Demo</h1>
      <p className="text-gray-600 mb-8">
        Experience the simplified, single-instance visualizer with the best Developer Experience.
        This API focuses on simplicity, type safety, and intuitive usage patterns.
      </p>

      {/* Counter Controls */}
      <div className="card mb-8">
        <div className="card-body">
          <h2 className="card-title">State Controls</h2>
          <p className="card-description">
            Trigger state changes to see real-time visualizer feedback
          </p>

          <div className="flex items-center gap-4 mb-6">
            <button onClick={decrement} className="btn btn-primary">
              Decrement
            </button>

            <div className="text-2xl font-bold min-w-[50px] text-center">
              {count}
            </div>

            <button onClick={increment} className="btn btn-primary">
              Increment
            </button>

            <button onClick={reset} className="btn btn-danger ml-4">
              Reset
            </button>
          </div>

          <div className="text-sm text-gray-500">
            Counter: {count} | Visualizer: {isVisualizerCreated ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      {/* Visualizer Configuration */}
      <div className="card mb-8">
        <div className="card-body">
          <h2 className="card-title">Visualizer Configuration</h2>
          <p className="card-description">
            Configure the visualizer appearance and behavior
          </p>

          {/* Configuration Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Position</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as VisualizerPosition)}
                className="w-full p-2 border rounded"
              >
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
                <option value="center">Center</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Size</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value as VisualizerSize)}
                className="w-full p-2 border rounded"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Opacity</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full"
              />
              <span className="text-sm text-gray-600">{opacity}</span>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draggable}
                  onChange={(e) => setDraggable(e.target.checked)}
                />
                <span className="text-sm font-medium">Draggable</span>
              </label>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-2">
            {!isVisualizerCreated ? (
              <button onClick={handleCreateVisualizer} className="btn btn-primary">
                Create Visualizer
              </button>
            ) : (
              <>
                <button onClick={handleShow} className="btn btn-success">
                  Show
                </button>
                <button onClick={handleHide} className="btn btn-warning">
                  Hide
                </button>
                <button onClick={handleToggle} className="btn btn-info">
                  Toggle
                </button>
                <button onClick={handleUpdateConfig} className="btn btn-secondary">
                  Update Config
                </button>
                <button onClick={handleDestroy} className="btn btn-error">
                  Destroy
                </button>
              </>
            )}
          </div>

          {/* Visualizer Status */}
          {visualizer && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <h3 className="font-semibold mb-2">Visualizer Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Visible:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${visualizer.isVisible ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                    {visualizer.isVisible ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Mounted:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${visualizer.isMounted ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-800'}`}>
                    {visualizer.isMounted ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Position:</span>
                  <span className="ml-2 font-medium">{visualizer.config.position}</span>
                </div>
                <div>
                  <span className="text-gray-600">Size:</span>
                  <span className="ml-2 font-medium">{visualizer.config.size}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Developer Tools */}
      <div className="card mb-8">
        <div className="card-body">
          <h2 className="card-title">Developer Tools</h2>
          <p className="card-description">
            Debug and monitor visualizer performance
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={handleDebugInfo} className="btn btn-info">
              Debug Info (Console)
            </button>
            <button onClick={handlePerformanceCheck} className="btn btn-info">
              Check Performance
            </button>
            <button onClick={clearEventLogs} className="btn btn-outline">
              Clear Event Logs
            </button>
          </div>

          {/* Performance Metrics */}
          {performanceMetrics && (
            <div className="bg-gray-100 p-4 rounded mb-4">
              <h3 className="font-semibold mb-2">Performance Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">FPS:</span>
                  <span className="ml-2 font-medium">{performanceMetrics.currentFps}</span>
                </div>
                <div>
                  <span className="text-gray-600">Memory:</span>
                  <span className="ml-2 font-medium">{performanceMetrics.memoryUsageMB}MB</span>
                </div>
                <div>
                  <span className="text-gray-600">Events:</span>
                  <span className="ml-2 font-medium">{performanceMetrics.activeEvents}</span>
                </div>
                <div>
                  <span className="text-gray-600">WebGL:</span>
                  <span className="ml-2 font-medium">{performanceMetrics.webglStatus}</span>
                </div>
              </div>
            </div>
          )}

          {/* Event Logs */}
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-48 overflow-y-auto">
            <h3 className="text-white mb-2">Event Logs</h3>
            {eventLogs.length === 0 ? (
              <p className="text-gray-500">No events logged yet...</p>
            ) : (
              eventLogs.map((log, index) => (
                <div key={index}>{log}</div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* API Examples */}
      <div className="card mb-8">
        <div className="card-body">
          <h2 className="card-title">Code Examples</h2>
          <p className="card-description">
            Simple, type-safe API usage examples
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Basic Usage</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                {`import { createVisualizer } from '@zusound/visualizer'

// Create and configure visualizer
const visualizer = createVisualizer({
  position: 'top-right',
  size: 'medium',
  draggable: true,
  autoShow: true
})

// Event handling
visualizer.on('show', () => console.log('Visualizer shown!'))
visualizer.on('hide', () => console.log('Visualizer hidden!'))

// Control methods
visualizer.show()
visualizer.hide()
visualizer.toggle()

// Update configuration
visualizer.configure({ position: 'center', opacity: 0.9 })

// Cleanup
visualizer.destroy()`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Developer Tools</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                {`import { 
  debugVisualizer, 
  checkPerformance,
  hasVisualizer,
  destroyVisualizer 
} from '@zusound/visualizer'

// Debug information
debugVisualizer() // Logs to console

// Performance monitoring
const metrics = checkPerformance()
console.log(\`FPS: \${metrics.currentFps}\`)

// Instance management
if (hasVisualizer()) {
  console.log('Visualizer is active')
}

// Global cleanup
destroyVisualizer()`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Source Code Viewer */}
      <CodeViewer
        code={visualizerExampleSource}
        language="tsx"
        title="View Simplified VisualizerExample.tsx Source"
      />
    </div>
  )
}

export default VisualizerExample
