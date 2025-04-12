/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { diffToSonic, sonifyChanges } from '../sonification'
import { AUDIO_CONFIG } from '../constants'
import * as sonificationModule from '../sonification'
import { AudioContextManager } from '../utils'

// --- Global Mocks ---
// Mock AudioContextManager for jsdom environment
vi.mock('../utils', async importOriginal => {
  const original = await importOriginal<typeof import('../utils')>()
  const MockedAudioContextManager = vi.fn().mockImplementation(() => ({
    getContext: vi.fn(() => ({
      createOscillator: vi.fn(() => ({
        type: '',
        frequency: { setValueAtTime: vi.fn() },
        detune: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: vi.fn(),
        disconnect: vi.fn(),
      })),
      createGain: vi.fn(() => ({
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      })),
      destination: {},
      currentTime: 0,
      state: 'running',
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    })),
    cleanup: vi.fn().mockResolvedValue(undefined),
  }))
  return {
    ...original,
    AudioContextManager: MockedAudioContextManager,
    getInstance: vi.fn(() => new MockedAudioContextManager()),
  }
})
// --- End Global Mocks ---

// Mock playSonicChunk
vi.spyOn(sonificationModule, 'playSonicChunk').mockImplementation(() => {})

describe('sonification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('diffToSonic', () => {
    it('should return empty array for empty diff', () => {
      const chunks = diffToSonic({}, 100)
      expect(chunks).toEqual([])
    })

    it('should convert property changes to sonic chunks', () => {
      const diff = { count: 5 }
      const chunks = diffToSonic(diff, 100)

      expect(chunks).toHaveLength(1)
      expect(chunks[0]).toMatchObject({
        id: 'count',
        valueType: 'change',
        duration: 100,
      })
    })

    it('should handle different value types with different waveforms', () => {
      const diff = {
        numValue: 42,
        strValue: 'hello',
        boolValue: true,
        objValue: { nested: true },
        nullValue: null,
      }

      const chunks = diffToSonic(diff, 100)
      expect(chunks).toHaveLength(5)

      // Find chunks by id
      const numChunk = chunks.find(c => c.id === 'numValue')
      const strChunk = chunks.find(c => c.id === 'strValue')
      const boolChunk = chunks.find(c => c.id === 'boolValue')
      const objChunk = chunks.find(c => c.id === 'objValue')
      const nullChunk = chunks.find(c => c.id === 'nullValue')

      // Check waveform types
      expect(numChunk?.type).toBe('sine')
      expect(strChunk?.type).toBe('square')
      expect(boolChunk?.type).toBe('sawtooth')
      expect(objChunk?.type).toBe('triangle')
      expect(nullChunk?.type).toBe('triangle') // null is treated as "remove"
    })

    it('should use minimum duration if provided duration is too small', () => {
      const diff = { count: 1 }
      const chunks = diffToSonic(diff, 1) // Very small duration

      expect(chunks[0].duration).toBe(AUDIO_CONFIG.MIN_DURATION_MS)
    })
  })

  describe('sonifyChanges', () => {
    // This is a simplified test since we're mocking playSonicChunk
    it('should not call playSonicChunk for empty diff', () => {
      const playSonicChunkSpy = vi.spyOn(sonificationModule, 'playSonicChunk')

      sonifyChanges({}, 100)
      expect(playSonicChunkSpy).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const playSonicChunkSpy = vi.spyOn(sonificationModule, 'playSonicChunk')

      // Make diffToSonic throw an error
      vi.spyOn(sonificationModule, 'diffToSonic').mockImplementationOnce(() => {
        throw new Error('Test error')
      })

      // This should not throw
      sonifyChanges({ test: 1 }, 100)

      // TODO:: Fix this test
      expect(consoleSpy).toHaveBeenCalledWith('Sonification failed:', expect.any(String))
      expect(playSonicChunkSpy).not.toHaveBeenCalled()
    })
  })
})
