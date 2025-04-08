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
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <div className="space-y-4">
        <div className="text-lg">Count: {count}</div>
        <div className="flex gap-2">
          <button
            onClick={onIncrement}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Increment
          </button>
          <button
            onClick={onDecrement}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Decrement
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Reset
          </button>
        </div>
        <div className="text-sm text-gray-600">
          <p>{description}</p>
        </div>
      </div>
    </div>
  )
}

// Individual store implementations
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
    }))
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
        name: 'counter-storage',
      }
    )
  )
)

const useDevtoolsCounterStore = create<CounterState>()(
  zusound(
    devtools(set => ({
      count: 0,
      increment: () => set(state => ({ count: state.count + 1 })),
      decrement: () => set(state => ({ count: state.count - 1 })),
      reset: () => set(() => ({ count: 0 })),
    }))
  )
)

const useMixedCounterStore = create<CounterState>()(
  zusound(
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
          name: 'counter-storage-mixed',
        }
      )
    )
  )
)

function Middlewares() {
  // Get state and actions from each store
  const immerState = useImmerCounterStore()
  const persistState = usePersistCounterStore()
  const devtoolsState = useDevtoolsCounterStore()
  const mixedState = useMixedCounterStore()

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Zustand Middleware Examples</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Immer Counter */}
        <CounterUI
          title="Immer Counter"
          description="Uses Immer middleware for mutable state updates while maintaining immutability. Try incrementing/decrementing to see the effect."
          count={immerState.count}
          onIncrement={immerState.increment}
          onDecrement={immerState.decrement}
          onReset={immerState.reset}
        />

        {/* Persist Counter */}
        <CounterUI
          title="Persist Counter"
          description="Uses Persist middleware to save state to localStorage. Try changing the count and refreshing the page to see persistence."
          count={persistState.count}
          onIncrement={persistState.increment}
          onDecrement={persistState.decrement}
          onReset={persistState.reset}
        />

        {/* Devtools Counter */}
        <CounterUI
          title="Devtools Counter"
          description="Uses Devtools middleware for debugging. Open Redux DevTools to see state changes."
          count={devtoolsState.count}
          onIncrement={devtoolsState.increment}
          onDecrement={devtoolsState.decrement}
          onReset={devtoolsState.reset}
        />

        {/* Mixed Counter */}
        <CounterUI
          title="Mixed Counter"
          description="Combines all three middlewares: Immer for mutable updates, Persist for storage, and Devtools for debugging."
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
