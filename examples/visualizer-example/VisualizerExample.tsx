import React, { useState } from 'react'
import { create } from 'zustand'
import { zusound, showPersistentVisualizer, hidePersistentVisualizer } from '../../packages'
import { CodeViewer } from '../CodeViewer'
import visualizerExampleSource from './VisualizerExample.tsx?raw'

// --- Zustand Store ---
interface CounterState {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

// Create a store with zusound middleware
const useCounterStore = create<CounterState>()(
  zusound(set => ({
    count: 0,
    increment: () => set(state => ({ count: state.count + 1 })),
    decrement: () => set(state => ({ count: state.count - 1 })),
    reset: () => set({ count: 0 }),
  }))
)

// Example demonstrating control of the persistent visualizer UI
const VisualizerExample: React.FC = () => {
  const { count, increment, decrement, reset } = useCounterStore()
  const [isVisualizerUIShown, setIsVisualizerUIShown] = useState(false)

  const toggleVisualizerUI = () => {
    if (isVisualizerUIShown) {
      hidePersistentVisualizer()
    } else {
      showPersistentVisualizer()
    }
    setIsVisualizerUIShown(!isVisualizerUIShown)
  }

  return (
    <div className="container mx-auto p-6">
      <h1>Persistent Visualizer Control - Be careful!</h1>

      {/* The persistent visualizer is controlled via API, not rendered here */}

      <div className="card mb-8">
        <div className="card-body">
          <h2 className="card-title">Demonstration</h2>
          <p className="card-description">
            This example shows how to control the visibility of the persistent visualizer UI
            provided by `zusound`.
          </p>
          <p className="mb-4">
            The persistent visualizer displays feedback for sonified state changes in a corner or
            modal.
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>
              Use `showPersistentVisualizer` and `hidePersistentVisualizer` functions to control
              visibility.
            </li>
            <li>The "Toggle Visualizer UI" button below demonstrates these functions.</li>
            <li>When visible, state changes trigger both sound and visual feedback.</li>
            <li>This lets you control when feedback is presented based on application needs.</li>
            <li>
              Note: Initial visibility (set by `persistVisualizer: true` in middleware options) is
              separate from this manual control.
            </li>
          </ul>
          {/* Button to toggle persistent visualizer UI */}
          <button
            onClick={toggleVisualizerUI}
            className="btn btn-primary mb-6"
            aria-label={isVisualizerUIShown ? 'Hide visualizer UI' : 'Show visualizer UI'}
          >
            {isVisualizerUIShown ? 'Hide Visualizer UI' : 'Show Visualizer UI'}
          </button>

          <div className="flex items-center gap-4 mb-6 border-t pt-4 mt-4">
            <button onClick={decrement} className="btn btn-primary" aria-label="Decrement count">
              Decrement
            </button>

            <div className="text-2xl font-bold min-w-[50px] text-center" aria-live="polite">
              {count}
            </div>

            <button onClick={increment} className="btn btn-primary" aria-label="Increment count">
              Increment
            </button>

            <button onClick={reset} className="btn btn-danger ml-4" aria-label="Reset count">
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Source Code Viewer */}
      <CodeViewer
        code={visualizerExampleSource}
        language="tsx"
        title="View VisualizerExample.tsx Source"
      />
    </div>
  )
}

export default VisualizerExample
