import { create } from 'zustand'
import { zusound } from '../../packages'

// Define types for our store state and actions
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

// Create stores with proper typing
const useCountStore = create<CountState>(
  zusound(set => ({
    count: 0,
    increment: () => set(state => ({ count: state.count + 1 })),
  }))
)

const useAnotherStore = create<AnotherState>(
  zusound(
    set => ({
      anotherText: 'a',
      anotherCount: 0,
      anotherRandom: {},
      anotherBoolean: false,
      updateAnother: () =>
        set(state => ({
          anotherText: `${state.anotherText}a`,
          anotherCount: state.anotherCount + 1,
          anotherRandom: {
            ...state.anotherRandom,
            [Math.random()]: Math.random(),
          },
          anotherBoolean: !state.anotherBoolean,
        })),
      updateTexts: (str: string) =>
        set(state => ({
          ...state,
          anotherText: str,
        })),
    }),
    {
      logDiffs: true,
    }
  )
)

function BasicUsage() {
  const { count, increment } = useCountStore()
  const { anotherText, anotherCount, anotherBoolean, updateAnother, updateTexts } =
    useAnotherStore()

  return (
    <div
      style={{
        fontFamily: 'sans-serif',
        maxWidth: '600px',
        margin: 'auto',
        padding: '20px',
        border: '1px solid #eee',
        borderRadius: '8px',
      }}
    >
      <h1 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        zusound Basic Usage Demo
      </h1>

      <section
        style={{
          margin: '20px 0',
          padding: '15px',
          backgroundColor: '#f9f9f9',
          borderRadius: '6px',
        }}
      >
        <h2>Counter Store</h2>
        <p>
          Current count: <strong>{count}</strong>
        </p>
        <p>Listen for the sound when the state changes!</p>
        <button
          autoFocus
          onClick={increment}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Increment
        </button>
      </section>

      <section
        style={{
          margin: '20px 0',
          padding: '15px',
          backgroundColor: '#f0f8ff',
          borderRadius: '6px',
        }}
      >
        <h2>Multiple State Properties</h2>
        <div style={{ marginBottom: '10px' }}>
          <p>
            Count: <strong>{anotherCount}</strong>
          </p>
          <p>
            Text: <strong>{anotherText}</strong>
          </p>
          <p>
            Boolean: <strong>{String(anotherBoolean)}</strong>
          </p>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="textInput" style={{ display: 'block', marginBottom: '5px' }}>
            Update Text:
          </label>
          <input
            id="textInput"
            type="text"
            value={anotherText}
            onChange={evt => updateTexts(evt.target.value)}
            style={{
              padding: '8px',
              marginRight: '10px',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          />
        </div>

        <button
          onClick={updateAnother}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px',
            cursor: 'pointer',
          }}
        >
          Update Multiple Properties
        </button>
      </section>

      <section
        style={{
          margin: '20px 0',
          padding: '15px',
          backgroundColor: '#fff3f0',
          borderRadius: '6px',
        }}
      >
        <h2>Combined Actions</h2>
        <p>Click to update both stores simultaneously</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              increment()
              updateAnother()
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#9C27B0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Update Both Stores
          </button>
        </div>
      </section>
    </div>
  )
}

export default BasicUsage
