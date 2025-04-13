import React from 'react'
import { create } from 'zustand'
import { zusound } from '../../packages'
// VisualizerReact component is no longer used directly.
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

            {/* VisualizerReact component is removed. The visualizer is now internal to the dialog. */}

            <div className="mb-8 p-6 border rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Demonstration</h2>
                <p className="mb-4">
                    This example uses the <code>persistVisualizer: true</code> option in the `zusound`
                    middleware. **Important:** The WebGL visualizer is no longer a separate component always visible
                    in the corner. Instead, it is now embedded *within* the dialog that appears automatically
                    **only if** the browser blocks audio playback due to autoplay restrictions (when you see
                    <code>The AudioContext was not allowed to start...</code> in the console).
                </p>
                <p className="mb-4">
                    <strong>To see the dialog and the visualizer inside it:</strong>
                </p>
                <ol className="list-decimal pl-6 mb-4 space-y-1">
                    <li>
                        Ensure your browser's autoplay policy might block audio initially. This often requires a page
                        reload **without** having interacted with the page beforehand. You might need to clear site
                        settings or use a fresh browser profile for reliable testing.
                    </li>
                    <li>Reload the page.</li>
                    <li>
                        Click the "Increment" or "Decrement" buttons **before clicking anywhere else** on the
                        page.
                    </li>
                    <li>
                        If audio is successfully blocked, a dialog should appear. This dialog contains the WebGL
                        visualizer, an explanation, and a button to enable audio.
                    </li>
                    <li>
                        Observe the visualizer **inside the dialog** reacting to the button clicks, providing
                        visual feedback even though sound isn't playing yet.
                    </li>
                    <li>
                        Clicking the "Enable Audio" button in the dialog, or interacting anywhere else on the page,
                        should dismiss the dialog and allow sounds to play normally on subsequent actions.
                    </li>
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
                        <li>
                            Visualizer appears automatically within a modal dialog **only** when audio is blocked by the
                            browser's autoplay policy (requires `persistVisualizer: true`).
                        </li>
                        <li>Visual feedback is provided **inside the dialog** even if audio cannot play initially.</li>
                        <li>The dialog provides context about the blocked audio and an action to enable it.</li>
                        <li>
                            Seamless integration – no need to manually import or render a separate visualizer
                            component.
                        </li>
                    </ul>
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