import React, { useEffect } from 'react'
import { create } from 'zustand'
import { zusound } from '../../packages'
import { VisualizerReact } from '../../packages/visualizer'
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
    zusound((set) => ({
        count: 0,
        increment: () => set((state) => ({ count: state.count + 1 })),
        decrement: () => set((state) => ({ count: state.count - 1 })),
        reset: () => set({ count: 0 }),
    }))
)

// Example using the visualizer
const VisualizerExample: React.FC = () => {
    const { count, increment, decrement, reset } = useCounterStore()

    // Initialize the visualizer (alternative to using the React component)
    useEffect(() => {
        // You can also use this approach to initialize the visualizer
        // const cleanup = initializeVisualizer();
        // return cleanup;
    }, [])

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Zusound Visualizer Example</h1>

            <div className="mb-8 p-6 border rounded bg-gray-50">
                <p className="mb-4">
                    This example demonstrates the Zusound visualizer. The visualizer shows sound events triggered
                    by state changes. Click the buttons below to trigger different sounds and watch the visualizer
                    in the top-right corner.
                </p>

                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={decrement}
                        className="px-4 py-2 bg-blue-500 text-white rounded"
                    >
                        Decrement
                    </button>

                    <div className="text-2xl font-bold">{count}</div>

                    <button
                        onClick={increment}
                        className="px-4 py-2 bg-blue-500 text-white rounded"
                    >
                        Increment
                    </button>

                    <button
                        onClick={reset}
                        className="px-4 py-2 bg-red-500 text-white rounded ml-4"
                    >
                        Reset
                    </button>
                </div>

                <div className="mb-4">
                    <h2 className="text-xl font-semibold mb-2">Features:</h2>
                    <ul className="list-disc pl-6">
                        <li>WebGL-based 3D visualizer for sound events</li>
                        <li>Each sound type (string, number, boolean) has a distinct color</li>
                        <li>Visual representation of frequency, magnitude, and sound type</li>
                        <li>Works even when audio is disabled (browser policy)</li>
                    </ul>
                </div>
            </div>

            {/* Visualizer Component */}
            <VisualizerReact position="top-right" />

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