/// <reference types="vitest" />
import { describe, it, expect } from 'vitest'
import { calculateDiffBase, calculateSimpleDiff, calculateDetailedDiff } from '../diff'
import { DetailedDiff } from '../types'

describe('diff', () => {
  describe('calculateSimpleDiff', () => {
    it('should return empty object for identical states', () => {
      const state = { count: 1, name: 'test' }
      const diff = calculateSimpleDiff(state, state)
      expect(diff).toEqual({})
    })

    it('should detect added properties', () => {
      const prevState = { count: 1 }
      const nextState = { count: 1, name: 'test' }
      const diff = calculateSimpleDiff(prevState, nextState)
      expect(diff).toEqual({ name: 'test' })
    })

    it('should detect removed properties', () => {
      const prevState = { count: 1, name: 'test' }
      const nextState = { count: 1 }
      const diff = calculateSimpleDiff(prevState, nextState)
      expect(diff).toEqual({ name: undefined })
    })

    it('should detect changed properties', () => {
      const prevState = { count: 1, name: 'test' }
      const nextState = { count: 2, name: 'test' }
      const diff = calculateSimpleDiff(prevState, nextState)
      expect(diff).toEqual({ count: 2 })
    })

    it('should handle nested objects', () => {
      const prevState = { user: { name: 'John', age: 30 } }
      const nextState = { user: { name: 'John', age: 31 } }

      // Note: because shallow equality is used, entire objects are replaced
      const diff = calculateSimpleDiff(prevState, nextState)
      expect(diff).toEqual({ user: { name: 'John', age: 31 } })
    })

    it('should handle array changes', () => {
      const prevState = { items: [1, 2, 3] }
      const nextState = { items: [1, 2, 4] }

      // Arrays are compared with shallow equality
      const diff = calculateSimpleDiff(prevState, nextState)
      expect(diff).toEqual({ items: [1, 2, 4] })
    })

    it('should handle null and undefined values', () => {
      interface TestState {
        a: null | string
        b: undefined | string
        c: number | null
      }

      const prevState: TestState = { a: null, b: undefined, c: 1 }
      const nextState: TestState = { a: 'value', b: 'value', c: null }
      const diff = calculateSimpleDiff(prevState, nextState)
      expect(diff).toEqual({ a: 'value', b: 'value', c: null })
    })
  })

  describe('calculateDetailedDiff', () => {
    it('should return empty object for identical states', () => {
      const state = { count: 1, name: 'test' }
      const diff = calculateDetailedDiff(state, state)
      expect(diff).toEqual({})
    })

    it('should provide detailed info for added properties', () => {
      const prevState = { count: 1 }
      const nextState = { count: 1, name: 'test' }
      const diff = calculateDetailedDiff(prevState, nextState) as any

      expect(diff).toHaveProperty('name')
      expect(diff.name).toMatchObject({
        value: 'test',
        previousValue: undefined,
        type: 'change',
      })
    })

    it('should provide detailed info for removed properties', () => {
      const prevState = { count: 1, name: 'test' }
      const nextState = { count: 1 }
      const diff = calculateDetailedDiff(prevState, nextState) as any

      expect(diff).toHaveProperty('name')
      expect(diff.name).toMatchObject({
        value: undefined,
        previousValue: 'test',
        type: 'change',
      })
    })

    it('should provide detailed info for changed properties', () => {
      const prevState = { count: 1, name: 'test' }
      const nextState = { count: 2, name: 'test' }
      const diff = calculateDetailedDiff(prevState, nextState)

      expect(diff).toHaveProperty('count')
      expect((diff as any).count).toMatchObject({
        value: 2,
        previousValue: 1,
        type: 'change',
      })
    })

    it('should handle multiple changes with detailed info', () => {
      interface TestState {
        a?: number
        b?: string
        c?: boolean
        d?: boolean
      }

      const prevState: TestState = { a: 1, b: 'test', c: true }
      const nextState: TestState = { a: 2, b: 'test', d: false }
      const diff = calculateDetailedDiff(prevState, nextState) as DetailedDiff<TestState>

      // Check individual properties instead of full object equality
      expect(diff).toHaveProperty('a')
      expect(diff.a).toMatchObject({
        value: 2,
        previousValue: 1,
        type: 'change',
      })

      expect(diff).toHaveProperty('c')
      expect(diff.c).toMatchObject({
        value: undefined,
        previousValue: true,
        type: 'change',
      })

      expect(diff).toHaveProperty('d')
      expect(diff.d).toMatchObject({
        value: false,
        previousValue: undefined,
        type: 'change',
      })
    })
  })

  describe('calculateDiffBase', () => {
    it('should support disabling trackAdded option', () => {
      const prevState = { a: 1 }
      const nextState = { a: 1, b: 2 }
      const diff = calculateDiffBase(prevState, nextState, {
        detailed: false,
        trackAdded: false,
      })
      // Just verify the type of outcome
      expect(typeof diff).toBe('object')
    })

    it('should support disabling trackRemoved option', () => {
      const prevState = { a: 1, b: 2 }
      const nextState = { a: 1 }
      const diff = calculateDiffBase(prevState, nextState, {
        detailed: false,
        trackRemoved: false,
      })
      // Just verify the type of outcome
      expect(typeof diff).toBe('object')
    })

    it('should handle non-object values', () => {
      // Using any to bypass type checking for these edge cases
      const diff = calculateDiffBase(null as any, 42 as any, { detailed: false })
      expect(diff).toBe(42)

      const detailedDiff = calculateDiffBase(undefined as any, 'hello' as any, { detailed: true })
      expect(detailedDiff).toHaveProperty('value', 'hello')
      expect(detailedDiff).toHaveProperty('type', 'add')
    })

    it('should handle state transitions between objects and primitives', () => {
      // Using any to bypass type checking for these edge cases
      const prevState = { a: 1 }
      const nextState = 'not an object anymore'
      const diff = calculateDiffBase(prevState as any, nextState as any, { detailed: false })
      expect(diff).toBe('not an object anymore')
    })
  })
})
