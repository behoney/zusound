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

export { traceImpl as trace } from './traceMiddleware'
