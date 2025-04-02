import type { StateCreator } from 'zustand'

/** Diff result representing changes between states */
interface DiffResult {
    added: Record<string, unknown>
    deleted: Record<string, unknown>
    updated: Record<string, [unknown, unknown]>
}

/**
 * zusound middleware for Zustand
 * Provides sound feedback on state changes
 */
export declare function zusound<T extends object>(
    initializer: StateCreator<T>,
    options?: {
        /** Enable/disable sound feedback (default: true in dev, false in prod) */
        enabled?: boolean
        /** Log state diffs to console (default: false) */
        logDiffs?: boolean
        /** Allow middleware to run in production (default: false) */
        allowInProduction?: boolean
        /** Optional name to identify this store in debug output */
        name?: string
        /** 
         * Custom callback for handling trace data 
         * @param traceData Contains diff information and timing
         */
        onTrace?: (traceData: {
            diff: DiffResult
            timestampStart: number
            duration: number
        }) => void
        /** 
         * Custom diffing function 
         * @param prevState Previous state
         * @param nextState New state
         * @returns Diff result object
         */
        diffFn?: (prevState: T, nextState: T) => DiffResult
    }
): StateCreator<T>

// Internal types used by Zustand
type StoreMutatorIdentifier = symbol | string 