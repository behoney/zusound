// packages/middleware/__tests__/main.test.ts
import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
    type Mock,
    type MockInstance, // Use MockInstance instead of SpyInstance
} from 'vitest'
import { createStore, type StoreApi, type StateCreator } from 'zustand/vanilla'
import { zusound } from '../zusound' // Import the middleware implementation
import * as sonification from '../../sonification' // Import to spy on initSonificationListener
import { calculateDiff } from '../../diff' // Import default diff for comparison
import type { ZusoundOptions } from '../types'
import type { DiffResult } from '../../diff'
import type { TraceData, ZusoundTraceEventDetail } from '../../core'

// --- Test Types ---

interface TestState {
    count: number
    text?: string
    active: boolean
    nested?: { value: number } | null
}

type TestStore = StoreApi<TestState>

// --- Test Setup ---

const initialState: TestState = { count: 0, text: 'initial', active: false, nested: null }

// Helper to create a store with zusound middleware
const createZusoundStore = <T extends object>(
    initial: T,
    options?: ZusoundOptions<T>
): StoreApi<T> => {
    const baseCreator: StateCreator<T> = () => initial
    // Apply the zusound middleware
    const zusoundCreator = zusound(baseCreator, options)
    return createStore<T>()(zusoundCreator)
}

// --- Test Suite ---

describe('zusound Middleware', () => {
    let store: TestStore | undefined차
    let userOnTraceMock: Mock<(data: TraceData<TestState>) => void>
    let consoleErrorSpy: MockInstance
    let dispatchEventSpy: MockInstance
    let initSonificationListenerSpy: MockInstance

    // Helper to get the detail from the dispatched event
    const getDispatchedTraceData = (): TraceData<TestState> | undefined => {
        if (dispatchEventSpy.mock.calls.length > 0) {
            // Get the *last* dispatched event
            const event = dispatchEventSpy.mock.calls[dispatchEventSpy.mock.calls.length - 1][0] as CustomEvent<
                ZusoundTraceEventDetail<TestState>
            >
            // Ensure it's the correct event type before extracting data
            if (event.type === 'zusound:trace' && event.detail?.traceData) {
                return event.detail.traceData
            }
        }
        return undefined
    }

    beforeEach(() => {
        // --- Mocking & Spying ---
        vi.useFakeTimers() // Use fake timers for RAF/setTimeout control

        userOnTraceMock = vi.fn()
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
        // Spy on window.dispatchEvent - crucial for testing middleware's primary output
        dispatchEventSpy = vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true)
        // Spy on the function called internally for sonification setup
        initSonificationListenerSpy = vi.spyOn(sonification, 'initSonificationListener').mockImplementation(() => { })

        // --- Global State Reset ---
        // Reset logger if it exists from a previous test
        if (window['__zusound_logger__']) {
            delete window['__zusound_logger__']
        }
        // Store original NODE_ENV
        const originalNodeEnv = process.env.NODE_ENV
        vi.stubGlobal('process', { env: { NODE_ENV: 'development' } }) // Default to dev for most tests
        // Store the function to restore original NODE_ENV in afterEach
        vi.spyOn(process, 'env', 'get').mockReturnValue({ NODE_ENV: originalNodeEnv });


        // --- Local State Reset ---
        store = undefined // Reset store reference
    })

    afterEach(async () => {
        // --- Cleanup & Restore ---
        // Ensure all timers are cleared and restore real timers
        vi.clearAllTimers()
        vi.useRealTimers()

        // Restore original implementations of spies
        vi.restoreAllMocks()

        // Restore original globals stubbed in beforeEach
        vi.unstubAllGlobals()


        // Clean up the global logger if it was created
        if (window['__zusound_logger__']) {
            delete window['__zusound_logger__']
        }
        // Explicitly destroy store if it exists
        if (store) {
            // @ts-ignore - Zustand stores have destroy method but TypeScript doesn't know about it
            if (typeof store.destroy === 'function') {
                // @ts-ignore
                store.destroy();
            }
        }
        store = undefined

        // Allow any pending promises/microtasks to settle after cleanup
        await Promise.resolve()
    })

    // --- Initialization and Basic Behavior ---

    describe('Initialization and Basic Behavior', () => {
        it('should integrate with createStore and initialize state correctly', () => {
            // No async operation here, just creation and state check
            expect(() => {
                store = createZusoundStore({ ...initialState }, { onTrace: userOnTraceMock })
            }).not.toThrow()
            expect(store).toBeDefined()
            expect(store?.getState()).toEqual(initialState)
        })

        it('should NOT call onTrace or dispatch event during store initialization', () => {
            store = createZusoundStore({ ...initialState }, { onTrace: userOnTraceMock })
            // RAF for initSonification might be scheduled, but onTrace/dispatchEvent shouldn't happen yet
            expect(userOnTraceMock).not.toHaveBeenCalled()
            expect(dispatchEventSpy).not.toHaveBeenCalled()
        })

        it('should call initSonificationListener via RAF by default', async () => {
            store = createZusoundStore({ ...initialState })
            // initSonificationListener is called via requestAnimationFrame
            expect(initSonificationListenerSpy).not.toHaveBeenCalled() // Shouldn't be called synchronously
            await vi.runAllTimersAsync() // Advance timers to execute RAF callback
            expect(initSonificationListenerSpy).toHaveBeenCalledTimes(1)
        })

        it('should NOT call initSonificationListener if initSonification is false', async () => {
            store = createZusoundStore({ ...initialState }, { initSonification: false })
            await vi.runAllTimersAsync() // Advance timers to be sure RAF doesn't run
            expect(initSonificationListenerSpy).not.toHaveBeenCalled()
        })
    })

    // --- State Updates and Event Dispatching ---

    describe('State Updates and Event Dispatching', () => {
        beforeEach(() => {
            // Create store *before* each test in this block
            store = createZusoundStore({ ...initialState }, { onTrace: userOnTraceMock })
            // Advance timers *after* store creation in case initSonification runs (it does by default)
            vi.runAllTimers() // Use sync version here as we don't need await inside beforeEach
        })

        it('should dispatch "zusound:trace" event on state update (object merge)', () => {
            const changes = { count: 1 }
            const prevState = store!.getState()
            store!.setState(changes) // Use non-optional chaining as store is guaranteed by beforeEach
            const nextState = store!.getState()

            expect(nextState).toEqual({ ...prevState, ...changes }) // Verify state update
            expect(dispatchEventSpy).toHaveBeenCalledTimes(1) // Check event dispatch
            expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent))

            const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent
            expect(event.type).toBe('zusound:trace')
            expect(event.detail).toHaveProperty('traceData')

            const traceData = event.detail?.traceData as TraceData<TestState>
            expect(traceData.diff).toEqual({ count: 1 }) // Default simple diff
            expect(traceData.timestampStart).toBeTypeOf('number')
            expect(traceData.duration).toBeTypeOf('number')
            expect(traceData.action).toBeUndefined()
            expect(userOnTraceMock).toHaveBeenCalledTimes(1) // Check user callback
            expect(userOnTraceMock).toHaveBeenCalledWith(traceData) // Verify callback data
        })

        it('should dispatch "zusound:trace" event on state update (function update)', () => {
            store!.setState(state => ({ count: state.count + 5 }))
            const nextState = store!.getState()

            expect(nextState.count).toBe(5)
            expect(dispatchEventSpy).toHaveBeenCalledTimes(1)

            const traceData = getDispatchedTraceData()
            expect(traceData?.diff).toEqual({ count: 5 })
            expect(userOnTraceMock).toHaveBeenCalledTimes(1)
            expect(userOnTraceMock).toHaveBeenCalledWith(traceData)
        })

        it('should dispatch "zusound:trace" event on state update (replace)', () => {
            const prevState = store!.getState()
            const newState: TestState = { count: 100, text: 'replaced', active: true }
            store!.setState(newState, true) // Replace = true
            const nextState = store!.getState()

            expect(nextState).toEqual(newState)
            expect(dispatchEventSpy).toHaveBeenCalledTimes(1)

            const traceData = getDispatchedTraceData()
            const expectedDiff = calculateDiff(prevState, nextState) // Calculate expected default diff
            expect(traceData?.diff).toEqual(expectedDiff)
            expect(userOnTraceMock).toHaveBeenCalledTimes(1)
            expect(userOnTraceMock).toHaveBeenCalledWith(traceData)
        })

        it('should include action name/object in traceData if provided via setState', () => {
            // Cast setState to include the third 'action' parameter
            const setStateWithAction = store!.setState as (
                partial: TestState | Partial<TestState> | ((state: TestState) => TestState | Partial<TestState>),
                replace?: boolean,
                action?: string | object
            ) => void

            // Test with action string
            const actionName = 'INCREMENT'
            setStateWithAction(prev => ({ count: prev.count + 1 }), false, actionName)
            expect(dispatchEventSpy).toHaveBeenCalledTimes(1)
            let traceData = getDispatchedTraceData()
            expect(traceData?.action).toBe(actionName)
            expect(traceData?.diff).toEqual({ count: 1 })
            expect(userOnTraceMock).toHaveBeenCalledTimes(1)
            expect(userOnTraceMock).toHaveBeenCalledWith(traceData)

            // Test with action object
            const actionObject = { type: 'UPDATE_TEXT', payload: 'new' }
            setStateWithAction({ text: 'new' }, false, actionObject)
            expect(dispatchEventSpy).toHaveBeenCalledTimes(2) // Total calls
            traceData = getDispatchedTraceData() // Gets the *last* trace data
            expect(traceData?.action).toBe(actionObject)
            expect(traceData?.diff).toEqual({ text: 'new' })
            expect(userOnTraceMock).toHaveBeenCalledTimes(2) // Total calls
            expect(userOnTraceMock).toHaveBeenNthCalledWith(2, traceData) // Check second call data
        })

        it('should NOT dispatch event if setState results in the exact same state object reference', () => {
            const currentState = store!.getState()
            store!.setState(currentState) // Set state to the exact same object reference
            expect(dispatchEventSpy).not.toHaveBeenCalled()
            expect(userOnTraceMock).not.toHaveBeenCalled()
        })

        it('should dispatch event if setState changes reference but values are shallowly equal', () => {
            const currentState = { ...store!.getState() } as TestState // Create shallow copy
            store!.setState(currentState)
            expect(dispatchEventSpy).toHaveBeenCalledTimes(1)
            const traceData = getDispatchedTraceData()
            expect(traceData?.diff).toEqual({}) // Diff should be empty because values are same
            expect(userOnTraceMock).toHaveBeenCalledTimes(1)
            expect(userOnTraceMock).toHaveBeenCalledWith(traceData)
        })
    })

    // --- Options Handling ---

    describe('Options Handling', () => {
        // Note: store setup happens within each test here, as options vary

        it('should use custom diffFn when provided', () => {
            const customDiffResult = { custom: 'my diff' } as DiffResult<TestState>
            const customDiffFn = vi.fn().mockReturnValue(customDiffResult)
            store = createZusoundStore({ ...initialState }, { diffFn: customDiffFn })
            vi.runAllTimers() // Advance timers for potential init

            const prevState = store.getState()
            const changes = { count: 1 }
            store.setState(changes)
            const nextState = store.getState()

            expect(customDiffFn).toHaveBeenCalledTimes(1) // Custom diff should be called
            expect(customDiffFn).toHaveBeenCalledWith(prevState, nextState)
            expect(dispatchEventSpy).toHaveBeenCalledTimes(1) // Event should still dispatch

            const traceData = getDispatchedTraceData()
            expect(traceData?.diff).toBe(customDiffResult) // Diff result should be from custom function
        })

        it('should call user onTrace callback AFTER dispatching event', () => {
            let eventDispatchedBeforeOnTrace = false
            // Mock implementation to check call order
            dispatchEventSpy.mockImplementation(() => {
                // Check if userOnTraceMock has been called *yet*
                eventDispatchedBeforeOnTrace = userOnTraceMock.mock.calls.length === 0
                return true // Allow original dispatch behavior (return true)
            })

            // Recreate store with the userOnTraceMock
            store = createZusoundStore({ ...initialState }, { onTrace: userOnTraceMock })
            vi.runAllTimers() // Advance timers for potential init

            store.setState({ count: 1 })

            expect(dispatchEventSpy).toHaveBeenCalledTimes(1)
            expect(userOnTraceMock).toHaveBeenCalledTimes(1)
            // Check the flag set during dispatchEvent's mock implementation
            expect(eventDispatchedBeforeOnTrace).toBe(true)

            const traceDataFromEvent = getDispatchedTraceData()
            const traceDataFromCallback = userOnTraceMock.mock.calls[0][0]
            expect(traceDataFromCallback).toEqual(traceDataFromEvent) // Ensure same data passed
            expect(traceDataFromCallback.diff).toEqual({ count: 1 })
        })

        it('should catch and log errors in user onTrace without crashing', () => {
            const error = new Error('User callback failed!')
            const faultyUserOnTrace = vi.fn(() => { throw error })
            store = createZusoundStore({ ...initialState }, { onTrace: faultyUserOnTrace })
            vi.runAllTimers() // Advance timers for potential init

            expect(() => {
                store?.setState({ count: 1 })
            }).not.toThrow() // Middleware itself should not throw

            expect(faultyUserOnTrace).toHaveBeenCalledTimes(1) // The faulty callback was called
            expect(dispatchEventSpy).toHaveBeenCalledTimes(1) // Event should still dispatch BEFORE the callback error
            expect(consoleErrorSpy).toHaveBeenCalledTimes(1) // Error should be logged
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("[Zusound Middleware] Error in user-provided 'onTrace' callback:"),
                error // Check the correct error was logged
            )
        })

        it('should push trace data to window.__zusound_logger__ if logDiffs is true', () => {
            store = createZusoundStore({ ...initialState }, { logDiffs: true })
            vi.runAllTimers() // Advance timers for potential init

            expect(window['__zusound_logger__']).toBeDefined()
            expect(window['__zusound_logger__']).toEqual([]) // Should be initialized as empty array

            store.setState({ count: 1 })
            expect(dispatchEventSpy).toHaveBeenCalledTimes(1) // Event should still dispatch
            expect(window['__zusound_logger__']).toHaveLength(1) // Logger should have one entry

            const loggedData = window['__zusound_logger__'][0]
            const dispatchedData = getDispatchedTraceData()

            // Compare stringified versions as the logger pushes a JSON copy
            expect(JSON.stringify(loggedData)).toEqual(JSON.stringify(dispatchedData))
            expect(loggedData.diff).toEqual({ count: 1 })

            // Test second update
            store.setState({ active: true })
            expect(dispatchEventSpy).toHaveBeenCalledTimes(2)
            expect(window['__zusound_logger__']).toHaveLength(2)
            expect(window['__zusound_logger__'][1].diff).toEqual({ active: true }) // Check second entry's diff
        })

        it('should NOT add to logger if logDiffs is false (default)', () => {
            store = createZusoundStore({ ...initialState }) // logDiffs is false by default
            vi.runAllTimers() // Advance timers for potential init

            store.setState({ count: 1 })
            expect(window['__zusound_logger__']).toBeUndefined() // Logger should not be created
            expect(dispatchEventSpy).toHaveBeenCalledTimes(1) // Event dispatch is independent of logger
        })
    })

    // --- Production / Enabled Handling ---

    describe('Production / Enabled Handling', () => {
        // No need for originalNodeEnv tracking here, as vi.stubGlobal handles it per test
        // and vi.unstubAllGlobals cleans up in afterEach.

        it('should be enabled by default in non-production (development)', async () => {
            // Note: beforeEach already sets NODE_ENV to 'development'
            store = createZusoundStore({ ...initialState })
            await vi.runAllTimersAsync() // Advance timers for init

            store.setState({ count: 1 })
            expect(dispatchEventSpy).toHaveBeenCalled() // Event should be dispatched
            expect(initSonificationListenerSpy).toHaveBeenCalledTimes(1) // Sonification should init
        })

        it('should be disabled by default in production', async () => {
            vi.stubGlobal('process', { env: { NODE_ENV: 'production' } }) // Override for this test
            store = createZusoundStore({ ...initialState }, { onTrace: userOnTraceMock })
            await vi.runAllTimersAsync() // Advance timers

            store.setState({ count: 1 })
            expect(dispatchEventSpy).not.toHaveBeenCalled() // Event should NOT be dispatched
            expect(userOnTraceMock).not.toHaveBeenCalled() // User callback shouldn't run
            expect(initSonificationListenerSpy).not.toHaveBeenCalled() // Sonification should NOT init
        })

        it('should be enabled in production if allowInProduction is true', async () => {
            vi.stubGlobal('process', { env: { NODE_ENV: 'production' } })
            store = createZusoundStore({ ...initialState }, { allowInProduction: true, onTrace: userOnTraceMock })
            await vi.runAllTimersAsync() // Advance timers for init

            store.setState({ count: 1 })
            expect(dispatchEventSpy).toHaveBeenCalled() // Event SHOULD be dispatched
            expect(userOnTraceMock).toHaveBeenCalled() // User callback SHOULD run
            expect(initSonificationListenerSpy).toHaveBeenCalledTimes(1) // Sonification SHOULD init
        })

        it('should be disabled if enabled is explicitly false (even in dev)', async () => {
            // NODE_ENV is 'development' by default from beforeEach
            store = createZusoundStore({ ...initialState }, { enabled: false, onTrace: userOnTraceMock })
            await vi.runAllTimersAsync() // Advance timers

            store.setState({ count: 1 })
            expect(dispatchEventSpy).not.toHaveBeenCalled() // Event should NOT be dispatched
            expect(userOnTraceMock).not.toHaveBeenCalled() // User callback shouldn't run
            expect(initSonificationListenerSpy).not.toHaveBeenCalled() // Sonification should NOT init
        })

        it('should be enabled if enabled is explicitly true (even in prod without allowInProduction)', async () => {
            // 'enabled: true' should override the production check
            vi.stubGlobal('process', { env: { NODE_ENV: 'production' } })
            store = createZusoundStore({ ...initialState }, { enabled: true, onTrace: userOnTraceMock })
            await vi.runAllTimersAsync() // Advance timers for init

            store.setState({ count: 1 })
            expect(dispatchEventSpy).toHaveBeenCalled() // Event SHOULD be dispatched
            expect(userOnTraceMock).toHaveBeenCalled() // User callback SHOULD run
            expect(initSonificationListenerSpy).toHaveBeenCalledTimes(1) // Sonification SHOULD init
        })
    })
})