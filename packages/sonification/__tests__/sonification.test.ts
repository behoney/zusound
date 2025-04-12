/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { diffToSonic, sonifyChanges, playSonicChunk } from '../sonification'
import * as sonificationModule from '../sonification' // Import the module itself
import { AUDIO_CONFIG } from '../constants'
import { AudioContextManager } from '../utils'

// --- Mocks ---

// Mock AudioContextManager and its static getInstance method
// Keep track of the mock context instance for detailed checks later
let mockAudioContextInstance: any
let mockGetInstance: ReturnType<typeof vi.fn>

vi.mock('../utils', async importOriginal => {
  const original = await importOriginal<typeof import('../utils')>()

  // Create mocks for the context and its methods *outside* the class mock
  // This allows us to spy on them easily in tests
  const mockOscillator = {
    type: '',
    frequency: { setValueAtTime: vi.fn() },
    detune: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null, // Use null initially, assign function in tests if needed
    disconnect: vi.fn(),
  }
  const mockGain = {
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }
  mockAudioContextInstance = {
    createOscillator: vi.fn(() => mockOscillator),
    createGain: vi.fn(() => mockGain),
    destination: {},
    currentTime: 0,
    state: 'running',
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    // Add reset helpers for mocks
    _resetMocks: () => {
      mockAudioContextInstance.createOscillator.mockClear()
      mockAudioContextInstance.createGain.mockClear()
      mockAudioContextInstance.resume.mockClear()
      mockOscillator.frequency.setValueAtTime.mockClear()
      mockOscillator.detune.setValueAtTime.mockClear()
      mockOscillator.connect.mockClear()
      mockOscillator.start.mockClear()
      mockOscillator.stop.mockClear()
      mockOscillator.disconnect.mockClear()
      mockGain.gain.setValueAtTime.mockClear()
      mockGain.gain.exponentialRampToValueAtTime.mockClear()
      mockGain.gain.linearRampToValueAtTime.mockClear()
      mockGain.connect.mockClear()
      mockGain.disconnect.mockClear()
      mockAudioContextInstance.state = 'running' // Reset state
      mockAudioContextInstance.currentTime = 0 // Reset time
    },
    // Expose nested mocks for direct assertion
    _mocks: {
      oscillator: mockOscillator,
      gain: mockGain,
    },
  }

  // Mock the static getInstance method
  mockGetInstance = vi.fn(() => ({
    getContext: vi.fn(() => mockAudioContextInstance),
    cleanup: vi.fn().mockResolvedValue(undefined),
  }))

  // Mock the class itself if needed, but focus on mocking the static method
  const MockAudioContextManager = {
    getInstance: mockGetInstance,
  }

  return {
    ...original,
    AudioContextManager: MockAudioContextManager, // Provide the mock object
  }
})

// --- Test Suites ---

describe('sonification', () => {
  beforeEach(() => {
    // Reset mocks before each test in the top-level describe
    vi.clearAllMocks()
    // Reset the internal state of the mock audio context
    if (mockAudioContextInstance?._resetMocks) {
      mockAudioContextInstance._resetMocks()
    }
  })

  // --- diffToSonic Tests --- (These seemed okay, keeping them as is)
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
        nullValue: null, // Represents removal
      }

      const chunks = diffToSonic(diff, 100)
      expect(chunks).toHaveLength(5)

      const findChunk = (id: string) => chunks.find(c => c.id === id)

      // Check waveform types and value types
      expect(findChunk('numValue')).toMatchObject({ type: 'sine', valueType: 'change' })
      expect(findChunk('strValue')).toMatchObject({ type: 'square', valueType: 'change' })
      expect(findChunk('boolValue')).toMatchObject({ type: 'sawtooth', valueType: 'change' })
      expect(findChunk('objValue')).toMatchObject({ type: 'triangle', valueType: 'change' })
      // Null/undefined values result in 'remove' valueType and specific magnitude/waveform
      expect(findChunk('nullValue')).toMatchObject({ type: 'triangle', valueType: 'remove' })
    })

    it('should use minimum duration if provided duration is too small', () => {
      const diff = { count: 1 }
      const chunks = diffToSonic(diff, 1) // Very small duration

      expect(chunks[0].duration).toBe(AUDIO_CONFIG.MIN_DURATION_MS)
    })

    it('should handle nested object keys with frequency adjustment', () => {
      const diff = { 'user.profile.age': 30 }
      const chunks = diffToSonic(diff, 100)

      expect(chunks).toHaveLength(1)
      expect(chunks[0].id).toBe('user.profile.age')
      // Frequency adjustment logic should result in a different frequency
      const baseFreqForAge =
        AUDIO_CONFIG.BASE_FREQUENCY *
        Math.pow(2, Math.floor(3205892 / 100) % 3) * // Calculated hash/octave for 'user.profile.age'
        AUDIO_CONFIG.SCALE[3205892 % AUDIO_CONFIG.SCALE.length] // Calculated scale index
      const expectedFreq = baseFreqForAge * (1 + 2 * 0.05) // Depth is 2
      expect(chunks[0].frequency).toBeCloseTo(expectedFreq) // Use toBeCloseTo for float comparison
    })

    it('should calculate detune based on number magnitude', () => {
      const diff = { small: 1, large: 1000 }
      const chunks = diffToSonic(diff, 100)

      const smallChunk = chunks.find(c => c.id === 'small')!
      const largeChunk = chunks.find(c => c.id === 'large')!

      expect(smallChunk.detune).toBeLessThan(largeChunk.detune)
      expect(largeChunk.detune).toBeGreaterThan(0)
      // Check capping
      expect(largeChunk.detune).toBeLessThanOrEqual(600)
    })

    it('should calculate detune based on string length', () => {
      const diff = { short: 'hi', long: 'this is a very long string' }
      const chunks = diffToSonic(diff, 100)

      const shortChunk = chunks.find(c => c.id === 'short')!
      const longChunk = chunks.find(c => c.id === 'long')!

      expect(shortChunk.detune).toBeLessThan(longChunk.detune)
      expect(longChunk.detune).toBeGreaterThan(0)
      // Check capping
      expect(longChunk.detune).toBeLessThanOrEqual(300)
    })
  })

  // --- sonifyChanges Tests ---
  describe('sonifyChanges', () => {
    let playSonicChunkSpy: ReturnType<typeof vi.spyOn>
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      // Spy on playSonicChunk *within this suite*
      playSonicChunkSpy = vi
        .spyOn(sonificationModule, 'playSonicChunk')
        .mockImplementation(() => {})
      // Spy on console.error
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      // Use fake timers for tests involving setTimeout
      vi.useFakeTimers()
    })

    afterEach(() => {
      // Restore original implementations and timers
      vi.restoreAllMocks() // Use restoreAllMocks to clean up spies properly
      vi.useRealTimers()
    })

    it('should not call playSonicChunk for empty diff', () => {
      sonifyChanges({}, 100)
      vi.advanceTimersByTime(1000) // Advance time just in case
      expect(playSonicChunkSpy).not.toHaveBeenCalled()
    })

    it('should handle synchronous errors gracefully (e.g., in diffToSonic)', () => {
      const testError = new Error('Test diffToSonic error')
      // Temporarily mock diffToSonic to throw an error for this test
      const diffToSonicSpy = vi
        .spyOn(sonificationModule, 'diffToSonic')
        .mockImplementationOnce(() => {
          throw testError
        })

      // Expect sonifyChanges *not* to throw, but to log an error
      expect(() => {
        sonifyChanges({ test: 1 }, 100)
      }).not.toThrow()

      // Check if console.error was called with the expected message
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Sonification failed:', testError.message)
      expect(playSonicChunkSpy).not.toHaveBeenCalled()

      diffToSonicSpy.mockRestore() // Clean up the specific mock
    })

    it('should handle asynchronous errors from playSonicChunk', () => {
      const asyncError = new Error('Async playback error')
      // Make the spied playSonicChunk throw an error
      playSonicChunkSpy.mockImplementation(() => {
        throw asyncError
      })

      sonifyChanges({ test: 1 }, 100)

      // Advance timers to trigger the setTimeout callback
      vi.advanceTimersByTime(AUDIO_CONFIG.STAGGER_DELAY_MS + 10)

      // Check if console.error was called with the expected message
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Sonification failed during playback for chunk test:`,
        asyncError.message
      )
    })

    it('should stagger playback of multiple chunks', () => {
      const diff = { a: 1, b: 2, c: 3 }
      const chunks = diffToSonic(diff, 100) // Get expected chunks

      sonifyChanges(diff, 100)

      // Check calls at specific times
      expect(playSonicChunkSpy).not.toHaveBeenCalled()

      vi.advanceTimersByTime(AUDIO_CONFIG.STAGGER_DELAY_MS / 2) // Before first call
      expect(playSonicChunkSpy).not.toHaveBeenCalled()

      vi.advanceTimersByTime(AUDIO_CONFIG.STAGGER_DELAY_MS / 2) // Exactly at first call time (0 * delay)
      expect(playSonicChunkSpy).toHaveBeenCalledTimes(1)
      expect(playSonicChunkSpy).toHaveBeenCalledWith(expect.objectContaining({ id: chunks[0].id }))

      vi.advanceTimersByTime(AUDIO_CONFIG.STAGGER_DELAY_MS) // Advance to second call time (1 * delay)
      expect(playSonicChunkSpy).toHaveBeenCalledTimes(2)
      expect(playSonicChunkSpy).toHaveBeenCalledWith(expect.objectContaining({ id: chunks[1].id }))

      vi.advanceTimersByTime(AUDIO_CONFIG.STAGGER_DELAY_MS) // Advance to third call time (2 * delay)
      expect(playSonicChunkSpy).toHaveBeenCalledTimes(3)
      expect(playSonicChunkSpy).toHaveBeenCalledWith(expect.objectContaining({ id: chunks[2].id }))
    })
  })

  // --- playSonicChunk Tests ---
  describe('playSonicChunk', () => {
    // No need to spy on playSonicChunk here, we test its implementation

    beforeEach(() => {
      // Ensure the mock context is reset before each playSonicChunk test
      mockAudioContextInstance._resetMocks()
    })

    it('should get audio context via AudioContextManager', () => {
      const chunk = diffToSonic({ value: 1 }, 100)[0]
      playSonicChunk(chunk)
      expect(mockGetInstance).toHaveBeenCalled() // Check if getInstance was called
      expect(mockGetInstance().getContext).toHaveBeenCalled() // Check if getContext was called on the manager instance
    })

    it('should configure oscillator with correct type, frequency, and detune', () => {
      const chunk = diffToSonic({ value: 440 }, 200)[0] // Use a number for easier freq check
      chunk.type = 'square' // Override for testing
      chunk.detune = 50 // Override for testing

      playSonicChunk(chunk)

      const mockOsc = mockAudioContextInstance._mocks.oscillator
      expect(mockAudioContextInstance.createOscillator).toHaveBeenCalled()
      expect(mockOsc.type).toBe('square')
      // Frequency calculation depends on hash, check it was called with *a* number
      expect(mockOsc.frequency.setValueAtTime).toHaveBeenCalledWith(
        expect.any(Number),
        mockAudioContextInstance.currentTime
      )
      // Check the specific frequency derived from 'value' key hash
      const expectedFreq =
        AUDIO_CONFIG.BASE_FREQUENCY *
        Math.pow(2, Math.floor(3599795 / 100) % 3) *
        AUDIO_CONFIG.SCALE[3599795 % AUDIO_CONFIG.SCALE.length] *
        (1 + 0 * 0.05) // Depth 0
      expect(mockOsc.frequency.setValueAtTime).toHaveBeenCalledWith(
        expectedFreq,
        mockAudioContextInstance.currentTime
      )
      expect(mockOsc.detune.setValueAtTime).toHaveBeenCalledWith(
        chunk.detune,
        mockAudioContextInstance.currentTime
      )
    })

    it('should apply correct ADSR envelope for normal duration (>20ms)', () => {
      const chunk = diffToSonic({ value: 1 }, 200)[0] // duration 200ms = 0.2s
      chunk.magnitude = 0.6 // Set specific magnitude

      playSonicChunk(chunk)

      const mockGn = mockAudioContextInstance._mocks.gain.gain
      const now = mockAudioContextInstance.currentTime // Should be 0
      const durationSec = chunk.duration / 1000 // 0.2s
      const attackTime = Math.min(0.01, durationSec * 0.2) // 0.01s
      const releaseTime = Math.min(0.08, durationSec * 0.3) // 0.06s
      const sustainTime = durationSec - attackTime - releaseTime // 0.2 - 0.01 - 0.06 = 0.13s

      expect(mockGn.setValueAtTime).toHaveBeenCalledWith(0, now) // Initial gain
      // Attack
      expect(mockGn.exponentialRampToValueAtTime).toHaveBeenCalledWith(
        chunk.magnitude,
        now + attackTime
      )
      // Sustain (implicit hold, explicit set value before release)
      expect(mockGn.setValueAtTime).toHaveBeenCalledWith(
        chunk.magnitude,
        now + attackTime + sustainTime
      )
      // Release
      expect(mockGn.exponentialRampToValueAtTime).toHaveBeenCalledWith(
        0.001, // Target value for release
        now + durationSec // End time
      )
    })

    it('should apply simpler linear envelope for very short duration (<=20ms)', () => {
      // Use MIN_DURATION_MS which is >= 20ms. Let's force a shorter one for test
      const chunk = { ...diffToSonic({ value: 1 }, 50)[0], duration: 15 } // 15ms = 0.015s
      chunk.magnitude = 0.7

      playSonicChunk(chunk)

      const mockGn = mockAudioContextInstance._mocks.gain.gain
      const now = mockAudioContextInstance.currentTime // 0
      const durationSec = chunk.duration / 1000 // 0.015s

      expect(mockGn.setValueAtTime).toHaveBeenCalledWith(0, now) // Initial gain
      // Ramp up
      expect(mockGn.linearRampToValueAtTime).toHaveBeenCalledWith(
        chunk.magnitude,
        now + durationSec * 0.5 // Midpoint
      )
      // Ramp down
      expect(mockGn.linearRampToValueAtTime).toHaveBeenCalledWith(
        0, // Target value
        now + durationSec // End time
      )
      // Ensure exponential ramps were NOT called
      expect(mockGn.exponentialRampToValueAtTime).not.toHaveBeenCalled()
    })

    it('should connect nodes correctly (osc -> gain -> destination)', () => {
      const chunk = diffToSonic({ value: 1 }, 100)[0]
      playSonicChunk(chunk)

      const mockOsc = mockAudioContextInstance._mocks.oscillator
      const mockGain = mockAudioContextInstance._mocks.gain

      expect(mockOsc.connect).toHaveBeenCalledWith(mockGain)
      expect(mockGain.connect).toHaveBeenCalledWith(mockAudioContextInstance.destination)
    })

    it('should start and stop oscillator', () => {
      const chunk = diffToSonic({ value: 1 }, 100)[0] // 0.1s
      playSonicChunk(chunk)

      const mockOsc = mockAudioContextInstance._mocks.oscillator
      const now = mockAudioContextInstance.currentTime // 0
      const durationSec = chunk.duration / 1000 // 0.1s

      expect(mockOsc.start).toHaveBeenCalledWith(now)
      expect(mockOsc.stop).toHaveBeenCalledWith(now + durationSec)
    })

    it('should attempt to resume suspended context', () => {
      mockAudioContextInstance.state = 'suspended'
      const chunk = diffToSonic({ value: 1 }, 100)[0]

      playSonicChunk(chunk)

      expect(mockAudioContextInstance.resume).toHaveBeenCalled()
    })

    it('should assign onended handler to disconnect nodes', () => {
      const chunk = diffToSonic({ value: 1 }, 100)[0]
      playSonicChunk(chunk)

      const mockOsc = mockAudioContextInstance._mocks.oscillator
      const mockGain = mockAudioContextInstance._mocks.gain

      // Check that onended is assigned a function
      expect(mockOsc.onended).toBeInstanceOf(Function)

      // Simulate the 'ended' event by calling the function
      mockOsc.onended()

      // Verify disconnect was called
      expect(mockOsc.disconnect).toHaveBeenCalled()
      expect(mockGain.disconnect).toHaveBeenCalled()
    })

    it('should throw error if context creation fails (handled by mock setup)', () => {
      // Simulate getContext throwing an error
      const contextError = new Error('Failed to create context')
      mockGetInstance.mockReturnValueOnce({
        getContext: vi.fn(() => {
          throw contextError
        }),
      })
      const chunk = diffToSonic({ value: 1 }, 100)[0]

      // Use expect().toThrow() to catch the error propagated by playSonicChunk
      expect(() => playSonicChunk(chunk)).toThrow(`Failed to play audio: ${contextError.message}`)
    })
  })
})
