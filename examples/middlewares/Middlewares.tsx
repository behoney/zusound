import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { devtools } from 'zustand/middleware'
import { zusound } from '../../packages'

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

const useImmerCounterStore = create<CounterState>()(
  zusound(
    immer(set => ({
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
    { name: 'ImmerStore' }
  )
)

const usePersistCounterStore = create<CounterState>()(
  zusound(
    persist(
      set => ({
        count: 0,
        increment: () => set(state => ({ count: state.count + 1 })),
        decrement: () => set(state => ({ count: state.count - 1 })),
        reset: () => set(() => ({ count: 0 })),
      }),
      {
        name: 'persist-counter-storage', // Unique name for storage
      }
    ),
    { name: 'PersistStore' }
  )
)

const useDevtoolsCounterStore = create<CounterState>()(
  zusound(
    devtools(
      set => ({
        count: 0,
        increment: () => set(state => ({ count: state.count + 1 })),
        decrement: () => set(state => ({ count: state.count - 1 })),
        reset: () => set(() => ({ count: 0 })),
      }),
      { name: 'DevtoolsCounterStore' } // Name for devtools
    ),
    { name: 'DevtoolsStore' } // Name for zusound (optional but good practice)
  )
)

const useMixedCounterStore = create<CounterState>()(
  zusound(
    // Order: Outer middlewares wrap inner ones
    devtools(
      persist(
        immer(set => ({
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
      { name: 'MixedCounterStoreDevtools' } // Name for devtools
    ),
    { name: 'MixedStore' } // Name for zusound
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
        Demonstrates using `zusound` alongside other popular Zustand middlewares like `immer`,
        `persist`, and `devtools`. Interact with each counter to hear sounds and observe the
        middleware effects (e.g., check Redux DevTools, refresh the page for persist).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Immer Counter */}
        <CounterUI
          title="Immer Counter"
          description="Uses Immer middleware for drafts-based state updates."
          count={immerState.count}
          onIncrement={immerState.increment}
          onDecrement={immerState.decrement}
          onReset={immerState.reset}
        />

        {/* Persist Counter */}
        <CounterUI
          title="Persist Counter"
          description="Uses Persist middleware to save state to localStorage. Refresh page to test."
          count={persistState.count}
          onIncrement={persistState.increment}
          onDecrement={persistState.decrement}
          onReset={persistState.reset}
        />

        {/* Devtools Counter */}
        <CounterUI
          title="Devtools Counter"
          description="Uses Devtools middleware. Open Redux DevTools extension to see actions."
          count={devtoolsState.count}
          onIncrement={devtoolsState.increment}
          onDecrement={devtoolsState.decrement}
          onReset={devtoolsState.reset}
        />

        {/* Mixed Counter */}
        <CounterUI
          title="Mixed Counter (Devtools > Persist > Immer)"
          description="Combines Immer, Persist, and Devtools. Check DevTools & refresh page."
          count={mixedState.count}
          onIncrement={mixedState.increment}
          onDecrement={mixedState.decrement}
          onReset={mixedState.reset}
        />
      </div>
    </div>
  )
}

export default Middlewares