// packages/core/__tests__/traceMiddleware.test.ts
import { describe, it, expect, vi, beforeEach, afterEach, Mock, type MockInstance } from 'vitest'
import { createStore, type StoreApi, type StateCreator } from 'zustand/vanilla'
import { trace } from '../' // Import the public trace middleware API
import { calculateSimpleDiff } from '../../diff' // Import the actual simple diff for comparison if needed
import type { DiffResult, DetailedDiff } from '../../diff' // Import diff types
import type { TraceOptions, TraceData } from '../types' // Import core types

// --- Test Setup ---

// Define a consistent state shape for testing
interface TestState {
  count: number
  text?: string
  active: boolean
  nested?: { value: number } | null // Add null possibility for testing
}

// Define a standard initial state
const initialState: TestState = { count: 0, text: 'initial', active: false }

/**
 * Helper function to create a Zustand store with the trace middleware applied.
 * Encapsulates the middleware application logic.
 * @param state - The initial state for the store.
 * @param options - Optional trace middleware options.
 * @returns The Zustand StoreApi instance.
 */
const createTracedStore = <T extends object>( // Use a generic object constraint
  state: T,
  options?: TraceOptions<T>
): StoreApi<T> => {
  // Define the base creator
  const baseCreator: StateCreator<T> = () => state;
  // Apply the middleware
  const tracedCreator = trace(baseCreator, options);
  // Create the store
  return createStore<T>()(tracedCreator);
}

// --- Test Suite ---

describe('trace Middleware', () => {
  // Declare store variable outside beforeEach so it can be accessed in afterEach
  let store: StoreApi<TestState> | undefined; // Allow undefined for cleanup check
  // Mock function to act as the onTrace callback
  let onTraceMock: Mock<(data: TraceData<TestState>) => void>
  // Spy on console.error to check for logged errors
  let consoleErrorSpy: MockInstance

  // Setup before each test
  beforeEach(() => {
    // Reset mocks if any were used in previous tests (like consoleErrorSpy or customDiffFn)
    vi.clearAllMocks()
    // Create a new mock instance for onTrace for each test
    onTraceMock = vi.fn()
    // Spy on console.error and suppress its output during tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
    // Ensure store is undefined before each test run that defines it
    store = undefined;
  })

  // Cleanup after each test
  afterEach(() => {
    // Restore the original console.error implementation
    consoleErrorSpy.mockRestore()
    // Clean up the store instance if it was created
    if (store) {
      // Use type assertion to access the destroy method if available (added by createStore)
      ; (store as unknown as { destroy?: () => void }).destroy?.()
      store = undefined; // Reset store variable
    }
  })

  // --- Initialization Tests ---

  describe('Initialization', () => {
    it('should initialize the store with the provided initial state', () => {
      store = createTracedStore({ ...initialState }) // Use spread for a new object
      expect(store.getState()).toEqual(initialState)
    })

    it('should not call onTrace during initialization', () => {
      store = createTracedStore({ ...initialState }, { onTrace: onTraceMock })
      expect(onTraceMock).not.toHaveBeenCalled()
    })
  })

  // --- State Update and Tracing Tests (Using Default Diff Behavior) ---

  describe('State Updates and Tracing (Default Behavior)', () => {
    // Create the store with the onTrace mock before each test in this describe block
    beforeEach(() => {
      // This setup ensures a fresh store for each test in this block
      store = createTracedStore({ ...initialState }, { onTrace: onTraceMock })
    })

    it('should call onTrace with correct trace data (including diff) when state is updated via object merge', () => {
      // TODO: This test fails - onTraceMock is not called. Investigate middleware wrapping/execution.
      if (!store) throw new Error("Store not initialized in beforeEach");
      const prevState = store.getState()
      const changes: Partial<TestState> = { count: 1, active: true }
      const expectedDiff: DiffResult<TestState> = calculateSimpleDiff(prevState, {
        ...prevState,
        ...changes,
      })

      store.setState(changes)
      const nextState = store.getState()

      // Check if state reference changed (it should)
      expect(prevState).not.toBe(nextState);

      expect(onTraceMock).toHaveBeenCalledTimes(1) // This fails
      if (onTraceMock.mock.calls.length > 0) {
        const traceData = onTraceMock.mock.calls[0][0] as TraceData<TestState>
        expect(traceData.diff).toEqual(expectedDiff)
        expect(traceData.timestampStart).toBeTypeOf('number')
        expect(traceData.duration).toBeGreaterThanOrEqual(0)
        expect(traceData.duration).toBeTypeOf('number')
        expect(traceData.action).toBeUndefined()
      }
    })

    it('should call onTrace with correct trace data when state is updated via function', () => {
      // TODO: This test fails - onTraceMock is not called. Investigate middleware wrapping/execution.
      if (!store) throw new Error("Store not initialized in beforeEach");
      const prevState = store.getState()
      store.setState(state => ({ count: state.count + 5 }))
      const nextState = store.getState()
      const expectedDiff: DiffResult<TestState> = calculateSimpleDiff(prevState, nextState)

      expect(prevState).not.toBe(nextState);
      expect(onTraceMock).toHaveBeenCalledTimes(1) // This fails
      if (onTraceMock.mock.calls.length > 0) {
        const traceData = onTraceMock.mock.calls[0][0] as TraceData<TestState>
        expect(traceData.diff).toEqual(expectedDiff)
        expect(traceData.duration).toBeGreaterThanOrEqual(0)
      }
    })

    it('should call onTrace with correct trace data when state is replaced', () => {
      // TODO: This test fails - onTraceMock is not called. Investigate middleware wrapping/execution.
      if (!store) throw new Error("Store not initialized in beforeEach");
      const prevState = store.getState()
      const newState: TestState = { count: 100, text: 'replaced', active: true }
      const expectedDiff: DiffResult<TestState> = calculateSimpleDiff(prevState, newState)

      store.setState(newState, true)
      const nextState = store.getState()

      expect(nextState).toEqual(newState)
      expect(nextState).not.toBe(prevState)

      expect(onTraceMock).toHaveBeenCalledTimes(1) // This fails
      if (onTraceMock.mock.calls.length > 0) {
        const traceData = onTraceMock.mock.calls[0][0] as TraceData<TestState>
        expect(traceData.diff).toEqual(expectedDiff)
      }
    })

    it('should include the action name/object in traceData if provided via setState', () => {
      // TODO: This test fails - onTraceMock is not called. Investigate middleware wrapping/execution.
      if (!store) throw new Error("Store not initialized in beforeEach");
      const setStateWithAction = store.setState as (
        partial: TestState | Partial<TestState> | ((state: TestState) => TestState | Partial<TestState>),
        replace?: boolean,
        action?: string | object
      ) => void

      // Test with action string
      const prevState1 = store.getState()
      const actionName = 'INCREMENT_COUNT'
      const changes1: Partial<TestState> = { count: prevState1.count + 1 }
      const expectedDiff1: DiffResult<TestState> = calculateSimpleDiff(prevState1, {
        ...prevState1,
        ...changes1,
      })

      setStateWithAction(changes1, false, actionName)
      const nextState1 = store.getState();
      expect(prevState1).not.toBe(nextState1);

      expect(onTraceMock).toHaveBeenCalledTimes(1) // This fails (for the first call)
      if (onTraceMock.mock.calls.length > 0) {
        const traceData1 = onTraceMock.mock.calls[0][0] as TraceData<TestState>
        expect(traceData1.action).toBe(actionName)
        expect(traceData1.diff).toEqual(expectedDiff1)
      }

      // Test with action object
      const prevState2 = store.getState() // State after first update
      const actionObject = { type: 'UPDATE_TEXT', payload: 'new text' }
      const changes2: Partial<TestState> = { text: 'new text' }
      const expectedDiff2: DiffResult<TestState> = calculateSimpleDiff(prevState2, {
        ...prevState2,
        ...changes2,
      })

      setStateWithAction(changes2, false, actionObject)
      const nextState2 = store.getState();
      expect(prevState2).not.toBe(nextState2);

      expect(onTraceMock).toHaveBeenCalledTimes(2) // This fails (checks total calls)
      if (onTraceMock.mock.calls.length > 1) {
        const traceData2 = onTraceMock.mock.calls[1][0] as TraceData<TestState>
        expect(traceData2.action).toBe(actionObject)
        expect(traceData2.diff).toEqual(expectedDiff2)
      }
    })

    it('should not call onTrace if setState results in the exact same state object reference', () => {
      // This test passes, confirming the bail-out condition works.
      if (!store) throw new Error("Store not initialized in beforeEach");
      const currentState = store.getState()
      store.setState(currentState)
      expect(onTraceMock).not.toHaveBeenCalled()
    })

    it('should call onTrace if state values are shallowly equal but object reference changed', () => {
      // TODO: This test fails - onTraceMock is not called. Investigate middleware wrapping/execution.
      // This failure is particularly confusing because the state reference *does* change,
      // so the `prevState === nextState` check in the middleware should be false.
      if (!store) throw new Error("Store not initialized in beforeEach");
      const prevState = store.getState()
      store.setState({ ...prevState })
      const nextState = store.getState()

      expect(prevState).not.toBe(nextState)
      expect(prevState).toEqual(nextState)

      const expectedDiff: DiffResult<TestState> = calculateSimpleDiff(prevState, nextState) // Should be {}

      expect(onTraceMock).toHaveBeenCalledTimes(1) // This fails
      if (onTraceMock.mock.calls.length > 0) {
        const traceData = onTraceMock.mock.calls[0][0] as TraceData<TestState>
        expect(traceData.diff).toEqual(expectedDiff)
        expect(traceData.diff).toEqual({})
      }
    })

    it('should handle updates resulting in undefined/null values correctly', () => {
      // TODO: This test fails - onTraceMock is not called. Investigate middleware wrapping/execution.
      if (!store) throw new Error("Store not initialized in beforeEach");
      const prevState1 = store.getState()
      const changes1: Partial<TestState> = { text: undefined }
      const nextState1 = { ...prevState1, ...changes1 }
      const expectedDiff1: DiffResult<TestState> = calculateSimpleDiff(prevState1, nextState1)

      store.setState(changes1)
      expect(prevState1).not.toBe(store.getState());

      expect(onTraceMock).toHaveBeenCalledTimes(1) // Fails first call
      if (onTraceMock.mock.calls.length > 0) {
        expect((onTraceMock.mock.calls[0][0] as TraceData<TestState>).diff).toEqual(expectedDiff1)
      }

      const prevState2 = store.getState() // State now includes text: undefined
      const changes2 = { nested: null } as Partial<TestState>
      const nextState2 = { ...prevState2, ...changes2 }
      const expectedDiff2: DiffResult<TestState> = calculateSimpleDiff(prevState2, nextState2)

      store.setState(changes2)
      expect(prevState2).not.toBe(store.getState());

      expect(onTraceMock).toHaveBeenCalledTimes(2) // Fails second call
      if (onTraceMock.mock.calls.length > 1) {
        expect((onTraceMock.mock.calls[1][0] as TraceData<TestState>).diff).toEqual(expectedDiff2)
      }
    })

    it('should handle state transitions from object to non-object', () => {
      // TODO: This test fails - onTraceMock is not called. Investigate middleware wrapping/execution.
      // Need to clean up the specific store created here
      const stateWithNested: TestState = { count: 1, active: true, nested: { value: 10 } }
      const objectToPrimitiveStore = createTracedStore(stateWithNested, { onTrace: onTraceMock })

      const prevState = objectToPrimitiveStore.getState()
      const newState = 'not an object anymore'

        ; (objectToPrimitiveStore.setState as (partial: any, replace?: boolean) => void)(newState, true)
      const nextState = objectToPrimitiveStore.getState()

      expect(nextState).toBe(newState)
      expect(prevState).not.toBe(nextState); // Check ref change

      const expectedDiff = calculateSimpleDiff(prevState, nextState)

      expect(onTraceMock).toHaveBeenCalledTimes(1) // This fails
      if (onTraceMock.mock.calls.length > 0) {
        const traceData = onTraceMock.mock.calls[0][0]
        expect(traceData.diff).toEqual(expectedDiff)
        expect(traceData.diff).toBe(newState)
      }
      ; (objectToPrimitiveStore as unknown as { destroy?: () => void }).destroy?.() // Cleanup specific store
    })

    it('should handle state transitions from non-object to object', () => {
      // TODO: This test fails - onTraceMock is not called. Investigate middleware wrapping/execution.
      const createStringStore = <T>(state: T, options?: TraceOptions<T>) =>
        createStore<T>()(trace(() => state, options))

      let nonObjectStore = createStringStore('initial string state', {
        onTrace: onTraceMock as any,
      })

      const prevState = nonObjectStore.getState()
      const newState: TestState = { count: 5, text: 'back to object', active: true }

        ; (nonObjectStore.setState as (partial: any, replace?: boolean) => void)(newState, true)
      const nextState = nonObjectStore.getState()

      expect(nextState).toEqual(newState)
      expect(prevState).not.toBe(nextState); // Check ref change

      const expectedDiff = calculateSimpleDiff(prevState, nextState)

      expect(onTraceMock).toHaveBeenCalledTimes(1) // This fails
      if (onTraceMock.mock.calls.length > 0) {
        const traceData = onTraceMock.mock.calls[0][0]
        expect(traceData.diff).toEqual(expectedDiff)
        expect(traceData.diff).toEqual(newState)
      }

      ; (nonObjectStore as unknown as { destroy?: () => void }).destroy?.()
    })
  })

  // --- Options Tests ---

  describe('Options Handling', () => {
    it('should use the provided custom diffFn and return its result in traceData', () => {
      // TODO: This test fails - customDiffFn/onTraceMock not called. Investigate middleware option handling/execution.
      const customDiffResult: DetailedDiff<TestState> = {
        count: { value: 1, previousValue: 0, type: 'change' },
        active: { value: true, previousValue: undefined, type: 'add' },
      } as DetailedDiff<TestState>

      const customDiffFn = vi.fn(
        (prev: TestState, next: TestState): DiffResult<TestState> => {
          return customDiffResult as DiffResult<TestState>
        }
      )

      store = createTracedStore(
        { ...initialState },
        {
          onTrace: onTraceMock,
          diffFn: customDiffFn,
        }
      )
      if (!store) throw new Error("Store not initialized"); // Type guard


      const prevState = store.getState()
      store.setState({ count: 1, active: true })
      const nextState = store.getState()
      expect(prevState).not.toBe(nextState); // Check ref change

      expect(customDiffFn).toHaveBeenCalledTimes(1) // This fails
      expect(customDiffFn).toHaveBeenCalledWith(prevState, nextState)

      expect(onTraceMock).toHaveBeenCalledTimes(1) // This likely fails too
      if (onTraceMock.mock.calls.length > 0) {
        const traceData = onTraceMock.mock.calls[0][0] as TraceData<TestState>
        expect(traceData.diff).toEqual(customDiffResult)
      }
    })

    it('should run without errors if onTrace callback is not provided', () => {
      // This test passes, suggesting the middleware applies correctly when onTrace is absent.
      store = createTracedStore({ ...initialState }, {})
      if (!store) throw new Error("Store not initialized"); // Type guard

      expect(() => {
        store?.setState({ count: 1 })
      }).not.toThrow()
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should catch and log errors in the onTrace callback without crashing the middleware', () => {
      // TODO: This test fails - faultyOnTrace is not called. Investigate middleware wrapping/execution.
      const error = new Error('Simulated error inside onTrace callback')
      const faultyOnTrace = vi.fn(() => {
        throw error
      })
      store = createTracedStore({ ...initialState }, { onTrace: faultyOnTrace })
      if (!store) throw new Error("Store not initialized"); // Type guard

      const prevState = store.getState()
      expect(() => {
        store?.setState({ count: 1 })
      }).not.toThrow()
      const nextState = store.getState()
      expect(prevState).not.toBe(nextState); // Check ref change

      expect(faultyOnTrace).toHaveBeenCalledTimes(1) // This fails

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1) // This likely fails too
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Zusound Core] Error in onTrace callback:'),
        error
      )
    })
  })
})