/**
 * zusound Diff Module
 *
 * This module provides utilities for calculating differences between two state objects.
 * It includes both simple and detailed diff calculation functions.
 *
 * The diff result is used by the sonification module to create sound representations
 * of state changes.
 */

// Import implementation functions from diff.ts
import { calculateDiffBase, calculateSimpleDiff, calculateDetailedDiff } from './diff'

// Import types from types.d.ts
import type { ChangeType, DiffEntry, DetailedDiff, DiffOptions, DiffResult } from './types'

// Core diffing functions
export { calculateDiffBase, calculateSimpleDiff, calculateDetailedDiff }

// Default export for backward compatibility or simple usage
export const calculateDiff = calculateSimpleDiff

// Types
export type { ChangeType, DiffEntry, DetailedDiff, DiffOptions, DiffResult }
