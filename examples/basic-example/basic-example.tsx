import { create } from 'zustand'
import { zusound } from '../../packages' // Assuming correct relative path
import { CodeViewer } from '../code-viewer' // Import the CodeViewer
import basicUsageSource from './basic-example.tsx?raw' // Import raw source code

// --- Zustand Stores ---

interface CountState {
  count: number
  increment: () => void
}

interface AnotherState {
  anotherText: string
  anotherCount: number
  anotherRandom: Record<string, number>
  anotherBoolean: boolean
  updateAnother: () => void
  updateTexts: (str: string) => void
}

const useCountStore = create<CountState>(
  zusound(
    set => ({
      count: 0,
      increment: () => set(state => ({ count: state.count + 1 })),
    }),
    { enabled: true }
  )
)

const useAnotherStore = create<AnotherState>()(
  zusound(
    set => ({
      anotherText: 'abc', // Initial text
      anotherCount: 0,
      anotherRandom: {},
      anotherBoolean: false,
      updateAnother: () =>
        set(state => ({
          anotherText: `${state.anotherText}${String.fromCharCode(97 + (state.anotherText.length % 26))}`, // Cycle through alphabet
          anotherCount: state.anotherCount + 1,
          anotherRandom: {
            ...state.anotherRandom,
            [Math.random().toString(36).substring(7)]: Math.random(), // Random key/value
          },
          anotherBoolean: !state.anotherBoolean,
        })),
      updateTexts: (str: string) => set({ anotherText: str }), // Simplified update
    }),
    {
      enabled: true,
    }
  )
)

// --- React Component ---

function BasicUsage() {
  const { count, increment } = useCountStore()
  const { anotherText, anotherCount, anotherBoolean, updateAnother, updateTexts } =
    useAnotherStore()

  return (
    <div>
      <h1>Basic Usage Demo</h1>
      <p className="text-gray-600 mb-6">
        This example demonstrates the fundamental integration of `zusound` with two simple Zustand
        stores. Interact with the buttons and input fields. Each state change (incrementing a count,
        updating text, toggling a boolean, adding an object property) will trigger the `zusound`
        middleware, producing distinct audible feedback based on the nature of the change. The
        second store also demonstrates the `logDiffs` option.
      </p>

      {/* Counter Store Section */}
      <section className="card mb-6">
        <div className="card-body">
          <h2 className="card-title">Counter Store</h2>
          <p className="card-description">
            Updates a single `count` number state. Click the button to increment and hear a sound
            mapped to number changes.
          </p>
          <p className="mb-4">
            Current count: <strong className="text-lg font-semibold">{count}</strong>
          </p>
          <button autoFocus onClick={increment} className="btn btn-primary">
            Increment Count
          </button>
        </div>
      </section>

      {/* Multiple State Properties Section */}
      <section className="card mb-6">
        <div className="card-body">
          <h2 className="card-title">Multiple State Properties Store</h2>
          <p className="card-description">
            Manages multiple state properties (`string`, `number`, `boolean`, `object`). Interact to
            hear sounds mapped to different data types and changes.
          </p>
          <div className="mb-4 space-y-1">
            <p>
              Count: <strong className="font-semibold">{anotherCount}</strong>
            </p>
            <p>
              Text: <strong className="font-semibold">{anotherText}</strong>
            </p>
            <p>
              Boolean: <strong className="font-semibold">{String(anotherBoolean)}</strong>
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="textInput" className="block text-sm font-medium text-gray-700 mb-1">
              Update Text:
            </label>
            <input
              id="textInput"
              type="text"
              value={anotherText}
              onChange={evt => updateTexts(evt.target.value)}
              className="form-input"
            />
          </div>

          <button onClick={updateAnother} className="btn btn-primary">
            Update Multiple Properties
          </button>
          <p className="text-xs text-gray-500 mt-2">
            This button updates text (string), count (number), a boolean, and adds a random entry to
            an object simultaneously, showcasing mixed sound feedback.
          </p>
        </div>
      </section>

      {/* Combined Actions Section */}
      <section className="card mb-6">
        {' '}
        {/* Added mb-6 for spacing */}
        <div className="card-body">
          <h2 className="card-title">Combined Actions</h2>
          <p className="card-description">
            Click the button to trigger updates in both stores concurrently. Listen for potentially
            overlapping sounds from independent store updates.
          </p>
          <button
            onClick={() => {
              increment()
              updateAnother()
            }}
            className="btn btn-secondary" // Use a different style
          >
            Update Both Stores
          </button>
        </div>
      </section>

      {/* Source Code Viewer */}
      <CodeViewer code={basicUsageSource} language="tsx" title="View BasicUsage.tsx Source" />
    </div>
  )
}

export default BasicUsage
