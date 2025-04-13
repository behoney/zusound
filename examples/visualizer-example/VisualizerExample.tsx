import React from 'react'
import { create } from 'zustand'
import { zusound } from '../../packages'
import { CodeViewer } from '../CodeViewer'
import visualizerExampleSource from './VisualizerExample.tsx?raw'

// --- Zustand Store ---
interface CounterState {
    count: number
    increment: () => void
    decrement: () => void
    reset: () => void
}

// Create a store with zusound middleware and persistVisualizer option
const useCounterStore = create<CounterState>()(
    zusound(
        set => ({
            count: 0,
            increment: () => set(state => ({ count: state.count + 1 })),
            decrement: () => set(state => ({ count: state.count - 1 })),
            reset: () => set({ count: 0 }),
        }),
        {
          // Enable the dialog+visualizer fallback for blocked audio
          persistVisualizer: true,
      }
  )
)

// Example demonstrating the integrated visualizer dialog
const VisualizerExample: React.FC = () => {
    const { count, increment, decrement, reset } = useCounterStore()

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">ZuSound Visualizer Integration</h1>

          {/* The visualizer is NOT rendered here directly */}

          <div className="mb-8 p-6 border rounded bg-gray-50">
              <h2 className="text-xl font-semibold mb-2">Demonstration</h2>
              <p className="mb-4">
                  This example uses the <code>persistVisualizer: true</code> option in the `zusound`
                  middleware. This option **does not** display a visualizer permanently.
              </p>
              <p className="mb-4">
                  Instead, its purpose is to handle browser autoplay restrictions gracefully:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                  <li>
                      When the browser blocks audio initially (often requires loading the page without prior
                      interaction), ZuSound detects this.
                  </li>
                  <li>
                      Because <code>persistVisualizer: true</code> is set, a **modal dialog** automatically
                      appears.
                  </li>
                  <li>
                      This dialog explains that audio is blocked and contains an embedded **WebGL
                      visualizer**.
                  </li>
                  <li>
                      The visualizer inside the dialog provides feedback for state changes, even though you
                      can't hear the sounds yet.
                  </li>
                  <li>
                      Clicking the "Enable Audio" button in the dialog (or interacting elsewhere on the page)
                      allows the audio context to resume, closes the dialog, and enables normal sound feedback
                      for subsequent actions.
                  </li>
              </ul>
              <p className="mb-4">
                  <strong>To reliably see the dialog and the embedded visualizer:</strong>
              </p>
              <ol className="list-decimal pl-6 mb-4 space-y-1">
                  <li>
                      **Hard reload** the page (e.g., Ctrl+Shift+R or Cmd+Shift+R) to ensure no prior
                      interaction is registered for autoplay purposes. Using an incognito window might also
                      help.
                  </li>
                  <li>
                      **Immediately** click the "Increment" or "Decrement" buttons **before** clicking
                      anywhere else.
                  </li>
                  <li>
                      If audio was successfully blocked by your browser, the dialog should appear, showing the
                      visualizer reacting to the click.
                  </li>
                  <li>
                      Interact with the dialog's "Enable Audio" button or click elsewhere on the page to
                      enable sound for future actions.
                  </li>
              </ol>

              <div className="flex items-center gap-4 mb-6 border-t pt-4 mt-4">
                  <button
                      onClick={decrement}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      aria-label="Decrement count"
                  >
                      Decrement
                  </button>

                  <div className="text-2xl font-bold min-w-[50px] text-center" aria-live="polite">
                      {count}
                  </div>

                  <button
                      onClick={increment}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      aria-label="Increment count"
                  >
                      Increment
                  </button>

                  <button
                      onClick={reset}
                      className="px-4 py-2 bg-red-500 text-white rounded ml-4 hover:bg-red-600 transition-colors"
                      aria-label="Reset count"
                  >
                      Reset
                  </button>
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
