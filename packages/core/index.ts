/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Core module for the Zustand state tracking middleware.
 *
 * This module serves as the central orchestration point that:
 * - Tracks state changes in Zustand stores
 * - Calculates meaningful differences between state versions
 * - Triggers audio feedback (sonification) based on those changes
 *
 * The middleware pattern provides a clean, minimal API surface while
 * internally coordinating the diff calculation and sonification logic
 * from their respective packages.
 */

// Import the implementation function
import { traceImpl as traceMiddlewareImpl } from './traceMiddleware'
// Import the public type definition and other necessary types
import type { Trace, ZusoundMutator, TraceOptions, DiffResult } from './types.d.ts'

// Export the implementation but assert its type to the public Trace signature
export const trace = traceMiddlewareImpl as Trace

// Re-export types
export type { ZusoundMutator, TraceOptions, DiffResult, TraceData } from './types.d.ts'
