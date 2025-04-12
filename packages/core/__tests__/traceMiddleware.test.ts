/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { traceImpl } from '../traceMiddleware'
import * as diffModule from '../../diff/diff' // Import specific functions if needed
import * as sonificationModule from '../../sonification/sonification'
import type { DiffResult, TraceData, TraceOptions } from '../types'

// --- Mocks ---
vi.mock('../../sonification/sonification', () => ({
  sonifyChanges: vi.fn(),
}))
// Mock diff without referencing an external variable to avoid hoisting issues
vi.mock('../../diff/diff', async importOriginal => {
  const original = await importOriginal<typeof diffModule>()
  const mockDiffFn = vi.fn((prev, next) => ({ changed: next.value }))
  return {
    ...original,
    calculateDiffBase: mockDiffFn,
    calculateSimpleDiff: mockDiffFn,
  }
})

// Access the mocked functions directly from the vi.mock return value
const mockCalculateDiff = vi.mocked(diffModule).calculateDiffBase

// --- Test Setup ---
interface TestState {
  count: number
  value?: string
}

const createTestStore = <T>(
  initializer: (set: (fn: (state: T) => T) => void, get: () => T, api: StoreApi<T>) => T,
  options?: TraceOptions<T>
) => {
  // Apply the middleware using traceImpl directly for testing implementation details
  return createStore<T>(traceImpl(initializer, options))
}

describe('traceMiddleware', () => {
  let sonifyChangesSpy
  let consoleErrorSpy

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    sonifyChangesSpy = vi.spyOn(sonificationModule, 'sonifyChanges')
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) // Suppress console.error
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore() // Restore console.error
  })

  it('should initialize the store correctly', () => {
    const store = createTestStore<TestState>(set => ({ count: 0 }))
    expect(store.getState()).toEqual({ count: 0 })
  })

  it('should intercept setState and call onTrace', () => {
    const onTraceMock = vi.fn()
    const store = createTestStore<TestState>(set => ({ count: 0 }), { onTrace: onTraceMock })

    const prevState = store.getState()
    store.setState({ count: 1 })
    const nextState = store.getState()

    expect(onTraceMock).toHaveBeenCalledTimes(1)
    const traceData = onTraceMock.mock.calls[0][0] as TraceData<TestState>

    expect(traceData.diff).toEqual({ changed: undefined }) // Based on mockCalculateDiff
    expect(traceData.timestampStart).toBeTypeOf('number')
    expect(traceData.duration).toBeGreaterThanOrEqual(0)
    expect(traceData.duration).toBeTypeOf('number')

    // Verify diffFn was called correctly
    expect(mockCalculateDiff).toHaveBeenCalledTimes(1)
    expect(mockCalculateDiff).toHaveBeenCalledWith(prevState, nextState)

    // Verify sonification was called
    expect(sonifyChangesSpy).toHaveBeenCalledTimes(1)
    expect(sonifyChangesSpy).toHaveBeenCalledWith(traceData.diff, traceData.duration)
  })

  it('should use the provided diffFn', () => {
    const customDiffFn = vi.fn((_prev: TestState, next: TestState) => ({ count: next.count }))
    const onTraceMock = vi.fn()
    const store = createTestStore<TestState>(set => ({ count: 0 }), {
      onTrace: onTraceMock,
      diffFn: customDiffFn,
    })

    const prevState = store.getState()
    store.setState({ count: 5 })
    const nextState = store.getState()

    expect(customDiffFn).toHaveBeenCalledTimes(1)
    expect(customDiffFn).toHaveBeenCalledWith(prevState, nextState)
    expect(mockCalculateDiff).not.toHaveBeenCalled() // Default should not be called

    expect(onTraceMock).toHaveBeenCalledTimes(1)
    const traceData = onTraceMock.mock.calls[0][0] as TraceData<TestState>
    expect(traceData.diff).toEqual({ count: 5 })

    expect(sonifyChangesSpy).toHaveBeenCalledWith({ count: 5 }, expect.any(Number))
  })

  it('should handle state updates via setter function', () => {
    const onTraceMock = vi.fn()
    const store = createTestStore<TestState>(set => ({ count: 0 }), { onTrace: onTraceMock })

    const prevState = store.getState()
    store.setState(state => ({ count: state.count + 1 }))
    const nextState = store.getState()

    expect(onTraceMock).toHaveBeenCalledTimes(1)
    expect(mockCalculateDiff).toHaveBeenCalledWith(prevState, nextState)
    expect(sonifyChangesSpy).toHaveBeenCalledTimes(1)
  })

  it('should run without errors if onTrace is not provided', () => {
    const store = createTestStore<TestState>(set => ({ count: 0 })) // No options

    expect(() => {
      store.setState({ count: 1 })
    }).not.toThrow()

    expect(mockCalculateDiff).toHaveBeenCalledTimes(1)
    expect(sonifyChangesSpy).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('should catch and log errors in the onTrace callback', () => {
    const error = new Error('Test onTrace error')
    const onTraceWithError = vi.fn(() => {
      throw error
    })
    const store = createTestStore<TestState>(set => ({ count: 0 }), { onTrace: onTraceWithError })

    expect(() => {
      store.setState({ count: 1 })
    }).not.toThrow() // Middleware should not throw

    expect(onTraceWithError).toHaveBeenCalledTimes(1)
    expect(sonifyChangesSpy).toHaveBeenCalledTimes(1) // Sonification should still run
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error in trace middleware 'onTrace' callback:",
      error
    )
  })

  it('should not trigger trace middleware when state reference is different but values are identical', () => {
    const onTraceMock = vi.fn()
    const store = createTestStore<TestState>(set => ({ count: 0, value: 'hello' }), {
      onTrace: onTraceMock,
    })

    // Reset all mocks to ensure clean state
    vi.clearAllMocks()

    // Create a new object with the same values but different reference
    const newState = { count: 0, value: 'hello' }

    // This should not trigger trace middleware since values are identical
    store.setState(newState)

    // Verify trace middleware was not triggered
    expect(onTraceMock).not.toHaveBeenCalled()
    expect(mockCalculateDiff).not.toHaveBeenCalled()
    expect(sonifyChangesSpy).not.toHaveBeenCalled()
  })

  it('should trace if state changes (even if shallow equal parts)', () => {
    const onTraceMock = vi.fn()
    const store = createTestStore<TestState>(set => ({ count: 0, value: 'hello' }), {
      onTrace: onTraceMock,
    })

    // Change one property
    store.setState({ count: 1, value: 'hello' })

    expect(onTraceMock).toHaveBeenCalledTimes(1)
    expect(mockCalculateDiff).toHaveBeenCalledTimes(1)
    expect(sonifyChangesSpy).toHaveBeenCalledTimes(1)
  })
})
