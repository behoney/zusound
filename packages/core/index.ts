/**
 * Core module for the Zustand state tracking middleware.
 *
 * This module serves as the central orchestration point that:
 * - Tracks state changes in Zustand stores
 * - Calculates meaningful differences between state versions
 * - Triggers audio feedback (sonification) based on those changes (indirectly via event)
 *
 * The middleware pattern provides a clean, minimal API surface while
 * internally coordinating the diff calculation and sonification logic
 * from their respective packages.
 */


// Import the implementation function
import { traceImpl as traceMiddlewareImpl } from './traceMiddleware'
// Import public type definitions from the types file
import type { Trace, TraceOptions, TraceData, ZusoundTraceEventDetail, ZusoundMutatorTuple } from './types' // Import ZusoundMutatorTuple
import type { DiffResult } from '../diff' // Explicitly import DiffResult for re-export if needed

// Export the implementation but assert its type to the public Trace signature
// This assertion is less of a 'lie' now that traceImpl's signature is Trace
export const trace = traceMiddlewareImpl as Trace

// Re-export types for consumers of the core package
export type { TraceOptions, TraceData, Trace, ZusoundTraceEventDetail, ZusoundMutatorTuple } // Re-export ZusoundMutatorTuple
// Re-export DiffResult from its source package
export type { DiffResult } from '../diff'