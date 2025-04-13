import React from 'react'
import { create } from 'zustand'
import { zusound } from '../../packages'
// Remove VisualizerReact import - it's no longer used directly
// import { VisualizerReact } from '../../packages/visualizer'
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
        (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 })),
            decrement: () => set((state) => ({ count: state.count - 1 })),
            reset: () => set({ count: 0 }),
        }),
        {
            // Enable persistent visualizer which shows a dialog when audio is blocked
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

            <div className="mb-8 p-6 border rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Demonstration</h2>
                <p className="mb-4">
                    This example uses the <code>persistVisualizer: true</code> option in the `zusound` middleware.
                    The WebGL visualizer is no longer a separate component but is now embedded *within* the dialog
                    that appears automatically if the browser blocks audio playback due to autoplay restrictions.
                </p>
                <p className="mb-4">
                    <strong>To see the dialog and visualizer:</strong>
                </p>
                <ol className="list-decimal pl-6 mb-4 space-y-1">
                    <li>
                        Ensure your browser's autoplay policy might block audio initially (often requires a page reload without prior interaction).
                        You might need to clear site settings or use a fresh browser profile for testing this.
                    </li>
                    <li>
                        Reload the page.
                    </li>
                    <li>
                        Click the "Increment" or "Decrement" buttons *before* clicking anywhere else on the page.
                    </li>
                    <li>
                        If audio is blocked, a dialog should appear containing the visualizer, an explanation, and a button to enable audio.
                        The visualizer inside the dialog will react to the button clicks.
                    </li>
                    <li>Clicking the "Enable Audio" button or interacting with the page should dismiss the dialog and allow sounds to play normally.</li>
                </ol>


                <div className="flex items-center gap-4 mb-6 border-t pt-4 mt-4">
                    <button
                        onClick={decrement}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                        Decrement
                    </button>

                    <div className="text-2xl font-bold min-w-[50px] text-center">{count}</div>

                    <button
                        onClick={increment}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                        Increment
                    </button>

                    <button
                        onClick={reset}
                        className="px-4 py-2 bg-red-500 text-white rounded ml-4 hover:bg-red-600 transition-colors"
                    >
                        Reset
                    </button>
                </div>

                <div className="mt-6">
                    <h2 className="text-xl font-semibold mb-2">Key Features Demonstrated:</h2>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Visualizer automatically appears within a dialog when audio is blocked (requires `persistVisualizer: true`).</li>
                        <li>Visual feedback persists even if audio cannot play immediately.</li>
                        <li>Dialog provides context and action to enable audio.</li>
                        <li>Seamless integration without needing a separate VisualizerReact component.</li>
                    </ul>
                </div>
            </div>

            {/*
              The Visualizer component is no longer needed here.
              It's managed internally by AudioContextManager and appears in the dialog.
            */}
            {/* <VisualizerReact position={visualizerPosition} /> */}

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