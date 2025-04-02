/**
 * zusound Diff Module
 *
 * This module provides utilities for calculating differences between two state objects.
 * It includes both simple and detailed diff calculation functions.
 *
 * The diff result is used by the sonification module to create sound representations
 * of state changes.
 */

// Import for re-export as calculateDiff
import { calculateSimpleDiff } from './diff'

// Core diffing functions
export { calculateDiffBase, calculateSimpleDiff, calculateDetailedDiff } from './diff'

// Types
export type { ChangeType, DiffEntry, DetailedDiff, DiffOptions } from './types'

// Default export for backward compatibility
export const calculateDiff = calculateSimpleDiff
