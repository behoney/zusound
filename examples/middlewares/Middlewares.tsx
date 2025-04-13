import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { devtools } from 'zustand/middleware'
import { zusound } from '../../packages'
import { CodeViewer } from '../CodeViewer' // Import the CodeViewer
import middlewaresSource from './Middlewares.tsx?raw' // Import raw source code

// Define the store state interface
interface CounterState {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

// Reusable Counter UI component
interface CounterUIProps {
  title: string
  description: string
  count: number
  onIncrement: () => void
  onDecrement: () => void
  onReset: () => void
}

function CounterUI({
  title,
  description,
  count,
  onIncrement,
  onDecrement,
  onReset,
}: CounterUIProps) {
  return (
    <div className="card">
      <div className="card-body">
        <h2 className="card-title">{title}</h2>
        <p className="card-description">{description}</p>
        <div className="text-2xl font-bold mb-4">Count: {count}</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onIncrement} className="btn btn-primary">
            Increment
          </button>
          <button onClick={onDecrement} className="btn btn-danger">
            Decrement
          </button>
          <button onClick={onReset} className="btn btn-secondary">
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Store Implementations ---

// Store using Immer middleware + zusound
// zusound should generally wrap the other middlewares.
const useImmerCounterStore = create<CounterState>()(
  zusound(
    // Outer: zusound intercepts final state changes
    immer(set => ({
      // Inner: Immer handles draft mutations
      count: 0,
      increment: () =>
        set(state => {
          state.count += 1
        }),
      decrement: () =>
        set(state => {
          state.count -= 1
        }),
      reset: () =>
        set(state => {
          state.count = 0
        }),
    })),
  )
)

// Store using Persist middleware + zusound
const usePersistCounterStore = create<CounterState>()(
  zusound(
    // Outer: zusound intercepts final state changes
    persist(
      // Inner: Persist handles storage
      set => ({
        count: 0,
        increment: () => set(state => ({ count: state.count + 1 })),
        decrement: () => set(state => ({ count: state.count - 1 })),
        reset: () => set(() => ({ count: 0 })),
      }),
      {
        name: 'persist-counter-storage', // Unique name for storage
      }
    ))
)

// Store using Devtools middleware + zusound
const useDevtoolsCounterStore = create<CounterState>()(
  zusound(
    // Outer: zusound intercepts final state changes
    devtools(
      // Inner: Devtools connects to browser extension
      set => ({
        count: 0,
        increment: () => set(state => ({ count: state.count + 1 }), false, 'INCREMENT'), // Add action names for Devtools
        decrement: () => set(state => ({ count: state.count - 1 }), false, 'DECREMENT'),
        reset: () => set(() => ({ count: 0 }), false, 'RESET'),
      }),
      { name: 'DevtoolsCounterStore' } // Name for devtools extension
    )
  )
)

// Store using a mix of middlewares + zusound
// Order matters: zusound -> devtools -> persist -> immer
const useMixedCounterStore = create<CounterState>()(
  zusound(
    // Outermost: zusound intercepts final changes
    devtools(
      // Next: Devtools logs actions/state
      persist(
        // Next: Persist saves/loads state
        immer(set => ({
          // Innermost: Immer handles state mutations
          count: 0,
          increment: () =>
            set(state => {
              state.count += 1
            }),
          decrement: () =>
            set(state => {
              state.count -= 1
            }),
          reset: () =>
            set(state => {
              state.count = 0
            }),
        })),
        {
          name: 'mixed-counter-storage', // Unique name for storage
        }
      ),
      { name: 'MixedCounterStoreDevtools' } // Name for devtools extension
    )
  )
)

// --- Main Component ---

function Middlewares() {
  // Get state and actions from each store
  const immerState = useImmerCounterStore()
  const persistState = usePersistCounterStore()
  const devtoolsState = useDevtoolsCounterStore()
  const mixedState = useMixedCounterStore()

  return (
    <div>
      <h1>Zustand Middleware Examples</h1>
      <p className="text-gray-600 mb-6">
        This demonstrates using `zusound` alongside other popular Zustand middlewares: `immer`,
        `persist`, and `devtools`. `zusound` should generally be placed as the outermost middleware
        to capture the final state changes after other middlewares have processed them. Interact
        with each counter to hear sounds and observe the specific effects of each middleware stack
        (e.g., check Redux DevTools, refresh the page for persist).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {' '}
        {/* Added mb-6 */}
        {/* Immer Counter */}
        <CounterUI
          title="zusound(immer(...))"
          description="Uses Immer for immutable updates within drafts. Sound reflects the final state change after Immer's processing."
          count={immerState.count}
          onIncrement={immerState.increment}
          onDecrement={immerState.decrement}
          onReset={immerState.reset}
        />
        {/* Persist Counter */}
        <CounterUI
          title="zusound(persist(...))"
          description="Uses Persist to save state to localStorage. Sound occurs on updates. Refresh page to see persisted state load (usually silently)."
          count={persistState.count}
          onIncrement={persistState.increment}
          onDecrement={persistState.decrement}
          onReset={persistState.reset}
        />
        {/* Devtools Counter */}
        <CounterUI
          title="zusound(devtools(...))"
          description="Uses Devtools middleware. Sound occurs on updates. Open Redux DevTools extension to see actions and state history."
          count={devtoolsState.count}
          onIncrement={devtoolsState.increment}
          onDecrement={devtoolsState.decrement}
          onReset={devtoolsState.reset}
        />
        {/* Mixed Counter */}
        <CounterUI
          title="zusound(devtools(persist(immer(...))))"
          description="Combines all three. Sound reflects final state. Check DevTools & refresh page to see combined effects."
          count={mixedState.count}
          onIncrement={mixedState.increment}
          onDecrement={mixedState.decrement}
          onReset={mixedState.reset}
        />
      </div>

      {/* Source Code Viewer */}
      <CodeViewer code={middlewaresSource} language="tsx" title="View Middlewares.tsx Source" />
    </div>
  )
}

export default Middlewares
