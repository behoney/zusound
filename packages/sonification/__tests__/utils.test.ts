/// <reference types="vitest" />
import { describe, it, expect } from 'vitest'
import { simpleHash } from '../utils'

describe('sonification/utils', () => {
  describe('simpleHash', () => {
    it('should return a positive integer for any string', () => {
      const hash = simpleHash('test')
      expect(hash).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(hash)).toBe(true)
    })

    it('should return consistent hash values for the same input', () => {
      const hash1 = simpleHash('consistent')
      const hash2 = simpleHash('consistent')
      expect(hash1).toBe(hash2)
    })

    it('should return different hash values for different inputs', () => {
      const hash1 = simpleHash('one')
      const hash2 = simpleHash('two')
      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty strings', () => {
      const hash = simpleHash('')
      expect(hash).toBe(0)
    })

    it('should handle special characters', () => {
      const hash = simpleHash('!@#$%^&*()')
      expect(hash).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(hash)).toBe(true)
    })
  })
})
