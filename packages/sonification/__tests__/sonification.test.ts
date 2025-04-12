/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { diffToSonic, playSonicChunk, sonifyChanges } from '../sonification'
import * as sonificationModule from '../sonification' // Import the module itself
import { AUDIO_CONFIG } from '../constants'
import { SonicChunk } from '../types'

// --- Mock Setup ---

// 1. Define mock functions/objects outside
const mockSetValueAtTime = vi.fn()
const mockExponentialRamp = vi.fn()
const mockLinearRamp = vi.fn()
const mockConnect = vi.fn()
const mockDisconnect = vi.fn()
const mockStart = vi.fn()
const mockStop = vi.fn()
const mockResume = vi.fn().mockResolvedValue(undefined)

// Define a mutable mock object for the oscillator to track properties like 'onended' and 'type'
const mockOscillator = {
  frequency: { setValueAtTime: mockSetValueAtTime },
  detune: { setValueAtTime: mockSetValueAtTime }, // Can reuse or create separate mock
  connect: mockConnect,
  start: mockStart,
  stop: mockStop,
  disconnect: mockDisconnect,
  onended: null as (() => void) | null, // Explicitly type onended
  type: 'sine' as OscillatorType, // Add type property and initialize
}
const mockGainNode = {
  gain: {
    setValueAtTime: mockSetValueAtTime, // Reuse
    exponentialRampToValueAtTime: mockExponentialRamp,
    linearRampToValueAtTime: mockLinearRamp,
  },
  connect: mockConnect, // Reuse
  disconnect: mockDisconnect, // Reuse
}
const mockCreateOscillator = vi.fn(() => mockOscillator)
const mockCreateGain = vi.fn(() => mockGainNode)

// Define a base mock context object
const baseMockAudioContext = {
  createOscillator: mockCreateOscillator,
  createGain: mockCreateGain,
  destination: {},
  currentTime: 0,
  state: 'running' as AudioContextState,
  resume: mockResume,
}

const mockGetContext = vi.fn(() => baseMockAudioContext)
const mockGetInstance = vi.fn(() => ({
  getContext: mockGetContext,
}))
const mockSimpleHash = vi.fn((str: string): number => {
  // Simple predictable hash for testing consistency
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to 32bit integer
  }
  return Math.abs(hash)
})

// Now mock the module itself
vi.mock('../utils', async importOriginal => {
  const original = await importOriginal<typeof import('../utils')>()

  // Mock the class itself if needed, but focus on mocking the static method
  const MockAudioContextManager = {
    getInstance: mockGetInstance,
  }

  return {
    ...original,
    AudioContextManager: MockAudioContextManager, // Provide the mock object
  }
})

// --- Test Suite ---

describe('sonification', () => {
  // Use fake timers for testing setTimeout in sonifyChanges
  vi.useFakeTimers()

  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mutable properties of mock objects
    mockOscillator.onended = null
    mockOscillator.type = 'sine'
    // Reset mock return values if they might have been changed by specific tests
    mockGetContext.mockReturnValue(baseMockAudioContext)
    mockGetInstance.mockReturnValue({ getContext: mockGetContext })
    // Reset hash mock (optional, depends if specific tests modify it)
    mockSimpleHash.mockImplementation((str: string): number => {
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash |= 0
      }
      return Math.abs(hash)
    })
  })

  describe('diffToSonic', () => {
    it('should return empty array for empty or null diff', () => {
      expect(diffToSonic({}, 100)).toEqual([])
      expect(diffToSonic(null as any, 100)).toEqual([])
      expect(diffToSonic(undefined as any, 100)).toEqual([])
    })

    it('should convert added property (detected as change with value)', () => {
      const diff = { newKey: 'value' }
      const chunks = diffToSonic(diff, 100)
      expect(chunks).toHaveLength(1)
      expect(mockSimpleHash).toHaveBeenCalledWith('newKey')
      expect(chunks[0]).toMatchObject({
        id: 'newKey',
        valueType: 'change', // Since value is defined, it's treated as 'change'
        type: 'square', // Based on string type
        duration: 100,
        magnitude: AUDIO_CONFIG.DEFAULT_MAGNITUDE.CHANGE,
      })
      expect(chunks[0].frequency).toBeGreaterThan(0)
      expect(chunks[0].detune).toBeGreaterThan(0) // String length > 0
    })

    it('should convert removed property (value is undefined)', () => {
      const diff = { oldKey: undefined }
      const chunks = diffToSonic(diff, 100)
      expect(chunks).toHaveLength(1)
      expect(mockSimpleHash).toHaveBeenCalledWith('oldKey')
      expect(chunks[0]).toMatchObject({
        id: 'oldKey',
        valueType: 'remove',
        type: 'triangle', // Based on remove type
        duration: 100,
        magnitude: AUDIO_CONFIG.DEFAULT_MAGNITUDE.REMOVE,
        detune: 0, // Detune is 0 for removals
      })
      expect(chunks[0].frequency).toBeGreaterThan(0)
    })

    it('should convert removed property (value is null)', () => {
      const diff = { oldKey: null }
      const chunks = diffToSonic(diff, 100)
      expect(chunks).toHaveLength(1)
      expect(mockSimpleHash).toHaveBeenCalledWith('oldKey')
      expect(chunks[0]).toMatchObject({
        id: 'oldKey',
        valueType: 'remove', // null is treated as remove
        type: 'triangle',
        duration: 100,
        magnitude: AUDIO_CONFIG.DEFAULT_MAGNITUDE.REMOVE,
        detune: 0,
      })
      expect(chunks[0].frequency).toBeGreaterThan(0)
    })

    it('should convert changed number property and respect MIN_DURATION_MS', () => {
      const diff = { count: 10 }
      const duration = 5 // Less than default min duration
      const chunks = diffToSonic(diff, duration)
      expect(chunks).toHaveLength(1)
      expect(mockSimpleHash).toHaveBeenCalledWith('count')
      expect(chunks[0]).toMatchObject({
        id: 'count',
        valueType: 'change',
        type: 'sine', // Based on number type
        duration: AUDIO_CONFIG.MIN_DURATION_MS, // Uses min duration
        magnitude: AUDIO_CONFIG.DEFAULT_MAGNITUDE.CHANGE,
      })
      expect(chunks[0].frequency).toBeGreaterThan(0)
      // Check detune calculation (logarithmic scale for number magnitude)
      expect(chunks[0].detune).toBeCloseTo(Math.min(Math.log1p(10) * 50, 600))
    })

    it('should convert changed boolean property (true)', () => {
      const diff = { isActive: true }
      const chunks = diffToSonic(diff, 120)
      expect(chunks).toHaveLength(1)
      expect(mockSimpleHash).toHaveBeenCalledWith('isActive')
      expect(chunks[0]).toMatchObject({
        id: 'isActive',
        valueType: 'change',
        type: 'sawtooth', // Based on boolean type
        duration: 120,
        magnitude: AUDIO_CONFIG.DEFAULT_MAGNITUDE.CHANGE,
        detune: 25, // Specific detune for true
      })
    })

    it('should convert changed boolean property (false)', () => {
      const diff = { isActive: false }
      const chunks = diffToSonic(diff, 120)
      expect(chunks).toHaveLength(1)
      expect(mockSimpleHash).toHaveBeenCalledWith('isActive')
      expect(chunks[0]).toMatchObject({
        id: 'isActive',
        valueType: 'change',
        type: 'sawtooth',
        duration: 120,
        magnitude: AUDIO_CONFIG.DEFAULT_MAGNITUDE.CHANGE,
        detune: -25, // Specific detune for false
      })
    })

    it('should convert changed object property', () => {
      const diff = { user: { name: 'test' } }
      const chunks = diffToSonic(diff, 100)
      expect(chunks).toHaveLength(1)
      expect(mockSimpleHash).toHaveBeenCalledWith('user')
      expect(chunks[0]).toMatchObject({
        id: 'user',
        valueType: 'change',
        type: 'triangle', // Default for objects
        duration: 100,
        magnitude: AUDIO_CONFIG.DEFAULT_MAGNITUDE.CHANGE,
        detune: 0, // No detune for objects currently
      })
    })

    it('should handle nested keys affecting frequency', () => {
      const diff = { 'user.profile.name': 'test' }
      const chunks = diffToSonic(diff, 100)
      const diffShallow = { name: 'test' }
      const chunksShallow = diffToSonic(diffShallow, 100)

      expect(chunks).toHaveLength(1)
      expect(chunksShallow).toHaveLength(1)
      expect(mockSimpleHash).toHaveBeenCalledWith('user.profile.name')
      expect(mockSimpleHash).toHaveBeenCalledWith('name')
      // Verify frequency is higher for deeper key (assuming hash doesn't collide badly)
      // This relies on the simpleHash mock being consistent
      expect(chunks[0].frequency).toBeGreaterThan(0)
      expect(chunksShallow[0].frequency).toBeGreaterThan(0)
      // Exact comparison depends heavily on hash and scale logic,
      // but we can check the depth multiplier effect exists.
      // freq = base * 2^oct * scale[idx] * (1 + depth * 0.05)
      // Assuming same base/octave/scaleIdx, freqDeep / freqShallow ~= (1 + 2*0.05) / (1 + 0*0.05) = 1.1
      // This is a loose check:
      expect(chunks[0].frequency).not.toEqual(chunksShallow[0].frequency)
      expect(chunks[0].type).toBe('square') // string
    })

    it('should cap detune for large numbers', () => {
      const diff = { largeNum: 1e9 }
      const chunks = diffToSonic(diff, 100)
      expect(chunks[0].detune).toBeCloseTo(600) // Max detune for numbers
    })

    it('should cap detune for long strings', () => {
      const longString = 'a'.repeat(1000)
      const diff = { longStr: longString }
      const chunks = diffToSonic(diff, 100)
      expect(chunks[0].detune).toBeCloseTo(300) // Max detune for strings
    })
  })

  describe('playSonicChunk', () => {
    const testChunk: SonicChunk = {
      id: 'test',
      type: 'sine',
      valueType: 'change',
      frequency: 440,
      magnitude: 0.5,
      duration: 100, // 100ms = 0.1s
      detune: 50,
    }

    it('should create oscillator and gain node', () => {
      playSonicChunk(testChunk)
      expect(mockGetInstance).toHaveBeenCalledTimes(1)
      expect(mockGetContext).toHaveBeenCalledTimes(1)
      expect(mockCreateOscillator).toHaveBeenCalledTimes(1)
      expect(mockCreateGain).toHaveBeenCalledTimes(1)
    })

    it('should configure oscillator correctly', () => {
      playSonicChunk(testChunk)
      expect(mockOscillator.type).toBe(testChunk.type)
      // Oscillator frequency and detune are set via setValueAtTime
      expect(mockSetValueAtTime).toHaveBeenCalledWith(
        testChunk.frequency,
        baseMockAudioContext.currentTime
      )
      expect(mockSetValueAtTime).toHaveBeenCalledWith(
        testChunk.detune,
        baseMockAudioContext.currentTime
      )
    })

    it('should connect nodes: oscillator -> gain -> destination', () => {
      playSonicChunk(testChunk)
      // Check connections using the mock connect function
      expect(mockConnect).toHaveBeenCalledWith(mockGainNode) // oscillator -> gain
      expect(mockConnect).toHaveBeenCalledWith(baseMockAudioContext.destination) // gain -> destination
      // Verify the order if necessary (more complex mocking needed)
    })

    it('should apply exponential envelope correctly for standard duration', () => {
      const durationSeconds = testChunk.duration / 1000 // 0.1s
      const attackTime = Math.min(0.01, durationSeconds * 0.2) // 0.01
      const releaseTime = Math.min(0.08, durationSeconds * 0.3) // 0.03
      const sustainTime = durationSeconds - attackTime - releaseTime // 0.1 - 0.01 - 0.03 = 0.06
      const now = baseMockAudioContext.currentTime // 0

      playSonicChunk(testChunk)

      // Check gain envelope calls
      expect(mockSetValueAtTime).toHaveBeenCalledWith(0, now) // Initial gain set to 0
      expect(mockExponentialRamp).toHaveBeenCalledWith(testChunk.magnitude, now + attackTime) // Attack ramp
      expect(mockSetValueAtTime).toHaveBeenCalledWith(
        testChunk.magnitude,
        now + attackTime + sustainTime
      ) // Sustain level set
      expect(mockExponentialRamp).toHaveBeenCalledWith(0.001, now + durationSeconds) // Release ramp
      expect(mockLinearRamp).not.toHaveBeenCalled() // Ensure linear ramp wasn't used
    })

    it('should apply linear envelope for very short duration (< 20ms)', () => {
      const shortChunk: SonicChunk = { ...testChunk, duration: 10 } // 10ms = 0.01s
      const durationSeconds = shortChunk.duration / 1000 // 0.01s
      const now = baseMockAudioContext.currentTime // 0

      playSonicChunk(shortChunk)

      // Check gain envelope calls
      expect(mockSetValueAtTime).toHaveBeenCalledWith(0, now) // Initial gain
      expect(mockLinearRamp).toHaveBeenCalledWith(shortChunk.magnitude, now + durationSeconds * 0.5) // Ramp up
      expect(mockLinearRamp).toHaveBeenCalledWith(0, now + durationSeconds) // Ramp down
      expect(mockExponentialRamp).not.toHaveBeenCalled() // Ensure exponential ramp wasn't used
    })

    it('should start and schedule stop for oscillator', () => {
      const durationSeconds = testChunk.duration / 1000
      const now = baseMockAudioContext.currentTime // 0
      playSonicChunk(testChunk)
      expect(mockStart).toHaveBeenCalledWith(now)
      expect(mockStop).toHaveBeenCalledWith(now + durationSeconds)
    })

    it('should set up onended handler for cleanup and call it', () => {
      playSonicChunk(testChunk)
      // Check that onended is assigned a function
      expect(mockOscillator.onended).toBeInstanceOf(Function)

      // Simulate oscillator ending by manually calling the assigned handler
      if (mockOscillator.onended) {
        mockOscillator.onended()
      }

      // Verify disconnect was called for both nodes
      expect(mockDisconnect).toHaveBeenCalledTimes(2)
      // Optionally check which objects disconnect was called on if mockConnect tracked 'this' or context
    })

    it('should attempt to resume suspended context', () => {
      // Setup suspended context for this specific call
      const suspendedContext = { ...baseMockAudioContext, state: 'suspended' as AudioContextState }
      mockGetContext.mockReturnValueOnce(suspendedContext)

      playSonicChunk(testChunk)
      expect(mockResume).toHaveBeenCalledTimes(1)
    })

    it('should not attempt to resume running context', () => {
      // Ensure context is running (default mock state)
      mockGetContext.mockReturnValueOnce({
        ...baseMockAudioContext,
        state: 'running' as AudioContextState,
      })
      playSonicChunk(testChunk)
      expect(mockResume).not.toHaveBeenCalled()
    })

    it('should throw error if AudioContext creation fails', () => {
      const contextError = new Error('Failed to create AudioContext')
      mockGetInstance.mockImplementationOnce(() => {
        throw contextError
      })
      expect(() => playSonicChunk(testChunk)).toThrow(
        `Failed to play audio: ${contextError.message}`
      )
    })

    it('should handle errors during oscillator start', () => {
      const startError = new Error('Audio engine failed')
      mockStart.mockImplementationOnce(() => {
        throw startError
      })

      expect(() => playSonicChunk(testChunk)).toThrow(`Failed to play audio: ${startError.message}`)
      // Ensure cleanup is still attempted or handled gracefully (depends on implementation)
      // In the current code, the error likely prevents onended setup.
    })

    it('should handle non-Error throws during playback', () => {
      // Simulate throwing a string instead of an Error object
      const stringError = 'plain string error'
      mockStart.mockImplementationOnce(() => {
        throw stringError
      })
      expect(() => playSonicChunk(testChunk)).toThrow('Failed to play audio')
    })
  })

  describe('sonifyChanges', () => {
    // Suppress console.error logs during these tests
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      ;(console.error as vi.Mock).mockRestore()
      vi.restoreAllMocks() // Use restoreAllMocks to clean up spies properly
      vi.useRealTimers()
    })

    it('should not call playSonicChunk for empty diff', () => {
      sonifyChanges({}, 100)
      expect(mockGetInstance).not.toHaveBeenCalled()
      vi.runAllTimers() // Ensure no setTimeout calls trigger playback
      expect(mockGetInstance).not.toHaveBeenCalled()
    })

    it('should call playSonicChunk for each generated chunk with stagger delay', () => {
      const diff = { a: 1, b: 'two', c: false }
      const duration = 100
      sonifyChanges(diff, duration)

      // Immediately after call, nothing should have played
      expect(mockCreateOscillator).not.toHaveBeenCalled()

      // Advance time for first chunk
      vi.advanceTimersByTime(AUDIO_CONFIG.STAGGER_DELAY_MS)
      expect(mockCreateOscillator).toHaveBeenCalledTimes(1) // First chunk plays

      // Advance time for second chunk
      vi.advanceTimersByTime(AUDIO_CONFIG.STAGGER_DELAY_MS)
      expect(mockCreateOscillator).toHaveBeenCalledTimes(2) // Second chunk plays

      // Advance time for third chunk
      vi.advanceTimersByTime(AUDIO_CONFIG.STAGGER_DELAY_MS)
      expect(mockCreateOscillator).toHaveBeenCalledTimes(3) // Third chunk plays

      // Ensure no more timers are pending
      vi.runAllTimers()
      expect(mockCreateOscillator).toHaveBeenCalledTimes(3)
    })

    it('should log error and not play if diffToSonic throws', () => {
      // Force diffToSonic to fail by making simpleHash throw
      const hashError = new Error('Hashing failed')
      mockSimpleHash.mockImplementationOnce(() => {
        throw hashError
      })

      const diff = { a: 1 }
      sonifyChanges(diff, 100)

      expect(console.error).toHaveBeenCalledWith('Sonification failed:', hashError.message)
      expect(mockCreateOscillator).not.toHaveBeenCalled()
      vi.runAllTimers() // Ensure no playback happens
      expect(mockCreateOscillator).not.toHaveBeenCalled()
    })

    it('should log error if playSonicChunk throws inside setTimeout, but continue other sounds', () => {
      const diff = { a: 1, b: 2, c: 3 } // 3 chunks
      const playbackError = new Error('Playback failed for chunk b')

      // Make the second call to playSonicChunk (via createOscillator) fail
      let callCount = 0
      mockCreateOscillator.mockImplementation(() => {
        callCount++
        if (callCount === 2) {
          throw playbackError // Fail on the second sound
        }
        return mockOscillator // Succeed otherwise
      })

      sonifyChanges(diff, 100)

      // Advance time for first chunk (should succeed)
      vi.advanceTimersByTime(AUDIO_CONFIG.STAGGER_DELAY_MS)
      expect(mockCreateOscillator).toHaveBeenCalledTimes(1)
      expect(mockStart).toHaveBeenCalledTimes(1) // Check oscillator started
      expect(console.error).not.toHaveBeenCalled()

      // Advance time for second chunk (should fail)
      vi.advanceTimersByTime(AUDIO_CONFIG.STAGGER_DELAY_MS)
      expect(mockCreateOscillator).toHaveBeenCalledTimes(2) // Second attempt made
      // Start not called again because createOscillator threw
      expect(mockStart).toHaveBeenCalledTimes(1)
      expect(console.error).toHaveBeenCalledWith(
        `Sonification failed during playback for chunk b:`, // id 'b' comes from diff object key
        playbackError.message
      )

      // Advance time for third chunk (should succeed)
      vi.advanceTimersByTime(AUDIO_CONFIG.STAGGER_DELAY_MS)
      expect(mockCreateOscillator).toHaveBeenCalledTimes(3) // Third attempt made
      expect(mockStart).toHaveBeenCalledTimes(2) // Start called for the third chunk

      vi.runAllTimers() // Clear any remaining timers
      expect(console.error).toHaveBeenCalledTimes(1) // Only one error logged
    })

    it('should handle non-Error throws from playSonicChunk inside setTimeout', () => {
      const diff = { a: 1 }
      const stringError = 'Non-error throw'
      mockCreateOscillator.mockImplementationOnce(() => {
        throw stringError
      })

      sonifyChanges(diff, 100)

      vi.runAllTimers() // Trigger the setTimeout

      expect(console.error).toHaveBeenCalledWith(
        `Sonification failed during playback for chunk a:`,
        stringError
      )
    })
  })
})
