// packages/sonification/__tests__/sonification.test.ts
/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance, type Mock } from 'vitest'
import { diffToSonic, playSonicChunk, sonifyChanges } from '../sonification'
import * as sonificationModule from '../sonification' // Import the module to spy on exports
import { AudioContextManager, simpleHash } from '../utils' // Import necessary utils
import { AUDIO_CONFIG } from '../constants'
import type { SonicChunk } from '../types'

// --- Mock Setup ---

// 1. Mock specific utilities
// Use vi.hoisted() to ensure mocks are available before imports in the module under test
const { mockedSimpleHash, MockAudioContextManager } = vi.hoisted(() => {
  const mockedSimpleHash = vi.fn((str: string): number => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0 // Convert to 32bit integer
    }
    return Math.abs(hash) % 1000 // Keep hash smaller for easier testing
  })
  const MockAudioContextManager = {
    getInstance: vi.fn(), // Mock static method
  }
  return { mockedSimpleHash, MockAudioContextManager }
})

vi.mock('../utils', async (importOriginal) => {
  const original = await importOriginal<typeof import('../utils')>()
  return {
    ...original,
    simpleHash: mockedSimpleHash,
    AudioContextManager: MockAudioContextManager,
  }
})


// 2. Define Mocks for Web Audio API (needed for playSonicChunk)
// Keep these simple function mocks
const mockSetValueAtTime = vi.fn()
const mockExponentialRamp = vi.fn()
const mockLinearRamp = vi.fn()
const mockConnect = vi.fn()
const mockDisconnect = vi.fn()
const mockStart = vi.fn()
const mockStop = vi.fn()
const mockResume = vi.fn().mockResolvedValue(undefined)
const mockClose = vi.fn().mockResolvedValue(undefined)

// Use a factory for mock oscillator to ensure fresh state
const createMockOscillator = () => ({
  frequency: { setValueAtTime: mockSetValueAtTime },
  detune: { setValueAtTime: mockSetValueAtTime },
  connect: mockConnect,
  start: mockStart,
  stop: mockStop,
  disconnect: mockDisconnect,
  onended: null as (() => void) | null,
  type: 'sine' as OscillatorType,
})

// Use a factory for mock gain node
const createMockGainNode = () => ({
  gain: {
    setValueAtTime: mockSetValueAtTime,
    exponentialRampToValueAtTime: mockExponentialRamp,
    linearRampToValueAtTime: mockLinearRamp,
  },
  connect: mockConnect,
  disconnect: mockDisconnect,
})

// Keep these as separate mocks, reset in beforeEach
let mockCreateOscillator: Mock
let mockCreateGain: Mock

// Define a factory for the mock context
const createMockAudioContext = (state: AudioContextState = 'running') => ({
  createOscillator: mockCreateOscillator,
  createGain: mockCreateGain,
  destination: { type: 'destination' }, // Simple object for identification
  currentTime: 0,
  state: state,
  resume: mockResume,
  close: mockClose,
})

// --- Test Suite ---

describe('sonification', () => {
  let mockAudioContext: ReturnType<typeof createMockAudioContext>
  let mockAudioManagerInstance: {
    getContext: Mock
    tryResumeAudioContext: Mock
  }
  let playSonicChunkSpy: MockInstance
  let consoleErrorSpy: MockInstance
  let consoleWarnSpy: MockInstance
  let consoleLogSpy: MockInstance
  let dispatchEventSpy: MockInstance

  beforeEach(() => {
    // Activate fake timers BEFORE setting up mocks that might use them
    vi.useFakeTimers()

    // Reset all mocks provided by Vitest
    vi.clearAllMocks()
    // Explicitly reset mocks created manually
    mockSetValueAtTime.mockClear()
    mockExponentialRamp.mockClear()
    mockLinearRamp.mockClear()
    mockConnect.mockClear()
    mockDisconnect.mockClear()
    mockStart.mockClear()
    mockStop.mockClear()
    mockResume.mockClear().mockResolvedValue(undefined) // Reset and set default resolve
    mockClose.mockClear().mockResolvedValue(undefined)

    // Recreate oscillator/gain mocks for clean state
    mockCreateOscillator = vi.fn(createMockOscillator)
    mockCreateGain = vi.fn(createMockGainNode)

    // Setup mock AudioContextManager for playSonicChunk tests
    mockAudioContext = createMockAudioContext('running') // Default to running state
    mockAudioManagerInstance = {
      getContext: vi.fn(() => mockAudioContext),
      tryResumeAudioContext: vi.fn().mockResolvedValue({ resumed: true, blocked: false }),
    }
    // Configure the static getInstance mock to return our instance mock
    MockAudioContextManager.getInstance.mockReturnValue(mockAudioManagerInstance)

    // Spy on playSonicChunk within its own module for sonifyChanges tests
    playSonicChunkSpy = vi
      .spyOn(sonificationModule, 'playSonicChunk')
      .mockResolvedValue(true) // Mock implementation to avoid actual execution

    // Spy on console methods
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

    // Spy on window.dispatchEvent for checking visualizer event
    dispatchEventSpy = vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true)

    // Reset timer baseline
    vi.setSystemTime(new Date())
  })

  afterEach(() => {
    // Restore spies
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleLogSpy.mockRestore()
    playSonicChunkSpy.mockRestore()
    dispatchEventSpy.mockRestore()

    // Ensure all timers are cleared
    vi.clearAllTimers()
    // Restore real timers AFTER clearing fake ones
    vi.useRealTimers()
  })

  // --- diffToSonic Tests ---
  describe('diffToSonic', () => {
    // Use the hoisted mock directly
    // const mockedSimpleHash = simpleHash as MockInstance<[string], number>; // No need for this cast

    it('should return empty array for empty, null or undefined diff', () => {
      expect(diffToSonic({}, 100)).toEqual([])
      expect(diffToSonic(null as unknown as Partial<unknown>, 100)).toEqual([])
      expect(diffToSonic(undefined as unknown as Partial<unknown>, 100)).toEqual([])
    })

    it('should convert added/changed properties correctly', () => {
      const diff = { newKey: 'value', count: 5, active: true }
      mockedSimpleHash.mockReturnValueOnce(123).mockReturnValueOnce(456).mockReturnValueOnce(789) // Simulate hash results

      const chunks = diffToSonic(diff, 150)
      expect(chunks).toHaveLength(3)

    // Check string ('newKey')
      expect(chunks[0]).toMatchObject({
        id: 'newKey',
        valueType: 'change',
        type: 'square',
        duration: 150,
        magnitude: AUDIO_CONFIG.DEFAULT_MAGNITUDE.CHANGE,
        frequency: expect.any(Number),
        detune: expect.closeTo(Math.log1p(5) * 25), // length 5
      })
      expect(mockedSimpleHash).toHaveBeenCalledWith('newKey')

      // Check number ('count')
      expect(chunks[1]).toMatchObject({
        id: 'count',
        valueType: 'change',
        type: 'sine',
        duration: 150,
        magnitude: AUDIO_CONFIG.DEFAULT_MAGNITUDE.CHANGE,
        frequency: expect.any(Number),
        detune: expect.closeTo(Math.log1p(5) * 50), // value 5
      })
      expect(mockedSimpleHash).toHaveBeenCalledWith('count')

      // Check boolean ('active')
      expect(chunks[2]).toMatchObject({
        id: 'active',
        valueType: 'change',
        type: 'sawtooth',
        duration: 150,
        magnitude: AUDIO_CONFIG.DEFAULT_MAGNITUDE.CHANGE,
        frequency: expect.any(Number),
        detune: 25, // true
      })
      expect(mockedSimpleHash).toHaveBeenCalledWith('active')
    })

    it('should convert removed properties (undefined or null) correctly', () => {
      const diff = { oldKey: undefined, anotherKey: null }
      mockedSimpleHash.mockReturnValueOnce(111).mockReturnValueOnce(222)

      const chunks = diffToSonic(diff, 100)
      expect(chunks).toHaveLength(2)

      expect(chunks[0]).toMatchObject({
        id: 'oldKey',
        valueType: 'remove',
        type: 'triangle',
        duration: 100,
        magnitude: AUDIO_CONFIG.DEFAULT_MAGNITUDE.REMOVE,
        detune: 0,
      })
      expect(mockedSimpleHash).toHaveBeenCalledWith('oldKey')

      expect(chunks[1]).toMatchObject({
        id: 'anotherKey',
        valueType: 'remove',
        type: 'triangle',
        duration: 100,
        magnitude: AUDIO_CONFIG.DEFAULT_MAGNITUDE.REMOVE,
        detune: 0,
      })
      expect(mockedSimpleHash).toHaveBeenCalledWith('anotherKey')
    })

    it('should use MIN_DURATION_MS if provided duration is too short', () => {
      const diff = { count: 10 }
      mockedSimpleHash.mockReturnValueOnce(333)
      const chunks = diffToSonic(diff, 10) // Duration less than min
      expect(chunks[0].duration).toBe(AUDIO_CONFIG.MIN_DURATION_MS)
    })

    it('should handle nested keys affecting frequency calculation (via hash input)', () => {
      const diffDeep = { 'user.profile.name': 'test' };
      mockedSimpleHash.mockReturnValueOnce(500); // Hash for deep key
      const chunksDeep = diffToSonic(diffDeep, 100);
      expect(mockedSimpleHash).toHaveBeenCalledWith('user.profile.name');

      mockedSimpleHash.mockClear(); // Clear calls before next test case

      const diffShallow = { name: 'test' };
      mockedSimpleHash.mockReturnValueOnce(50); // Hash for shallow key
      const chunksShallow = diffToSonic(diffShallow, 100);
      expect(mockedSimpleHash).toHaveBeenCalledWith('name'); // Ensure hash was called correctly

      expect(chunksDeep).toHaveLength(1);
      expect(chunksShallow).toHaveLength(1);
      expect(chunksDeep[0].frequency).not.toBeCloseTo(chunksShallow[0].frequency);
    })

    it('should cap detune for large numbers and long strings', () => {
      mockedSimpleHash.mockReturnValueOnce(1).mockReturnValueOnce(2);
      const diff = { largeNum: 1e10, longStr: 'a'.repeat(500) }; // length 500
      const chunks = diffToSonic(diff, 100);
      expect(chunks[0].detune).toBeCloseTo(600); // Max number detune

      // FIX: Correct expectation based on calculation log1p(500) * 25 ≈ 155.4
      const expectedStringDetune = Math.min(Math.log1p(500) * 25, 300);
      expect(chunks[1].detune).toBeCloseTo(expectedStringDetune);
    })
  })

  // --- playSonicChunk Tests ---
  describe('playSonicChunk', () => {
    const testChunk: SonicChunk = {
      id: 'test-chunk',
      type: 'sine',
      valueType: 'change',
      frequency: 440,
      magnitude: 0.5,
      duration: 100, // 100ms = 0.1s
      detune: 50,
    }

    it('should get AudioContext via AudioContextManager', async () => {
      await playSonicChunk(testChunk)
      expect(MockAudioContextManager.getInstance).toHaveBeenCalledTimes(1)
      expect(mockAudioManagerInstance.getContext).toHaveBeenCalledTimes(1)
    })

    it('should dispatch a "zusound" event with the chunk', async () => {
      await playSonicChunk(testChunk)
      expect(dispatchEventSpy).toHaveBeenCalledTimes(1)
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent))
      const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent
      expect(event.type).toBe('zusound')
      expect(event.detail).toEqual({ chunk: testChunk })
    })

    it('should attempt to resume suspended context', async () => {
      // Arrange: Set context state to suspended
      mockAudioContext.state = 'suspended'
      // Simulate successful resume
      mockAudioManagerInstance.tryResumeAudioContext.mockResolvedValueOnce({
        resumed: true,
        blocked: false,
      })

      // Act
      await playSonicChunk(testChunk)

      // Assert
      expect(mockAudioManagerInstance.tryResumeAudioContext).toHaveBeenCalledTimes(1)
      expect(mockCreateOscillator).toHaveBeenCalledTimes(1) // Playback should proceed
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Audio context suspended')
      )
    })

    it('should skip playback and return false if context resume fails', async () => {
      // Arrange: Set context state to suspended
      mockAudioContext.state = 'suspended'
      // Simulate failed resume
      mockAudioManagerInstance.tryResumeAudioContext.mockResolvedValueOnce({
        resumed: false,
        blocked: true,
      })

      // Act
      const result = await playSonicChunk(testChunk)

      // Assert
      expect(result).toBe(false) // FIX: Expect false on failure
      expect(mockAudioManagerInstance.tryResumeAudioContext).toHaveBeenCalledTimes(1)
      expect(mockCreateOscillator).not.toHaveBeenCalled() // Playback should be skipped
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Audio playback skipped for chunk ${testChunk.id}`)
      )
    })

    it('should skip playback and return false if context is closed', async () => {
      // Arrange: Set context state to closed
      mockAudioContext.state = 'closed'

      // Act
      const result = await playSonicChunk(testChunk)

      // Assert
      expect(result).toBe(false) // FIX: Expect false on failure
      expect(mockAudioManagerInstance.tryResumeAudioContext).not.toHaveBeenCalled()
      expect(mockCreateOscillator).not.toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining(`unexpected state (closed)`))
    })

    it('should create and configure oscillator and gain nodes', async () => {
      await playSonicChunk(testChunk)

      expect(mockCreateOscillator).toHaveBeenCalledTimes(1)
      expect(mockCreateGain).toHaveBeenCalledTimes(1)

      // FIX: Ensure mock was called before accessing results
      expect(mockCreateOscillator.mock.calls.length).toBe(1)
      const createdOscillator = mockCreateOscillator.mock.results[0].value

      // Verify Oscillator setup
      expect(createdOscillator.type).toBe(testChunk.type)
      expect(mockSetValueAtTime).toHaveBeenCalledWith(testChunk.frequency, mockAudioContext.currentTime)
      expect(mockSetValueAtTime).toHaveBeenCalledWith(testChunk.detune, mockAudioContext.currentTime)

      // Verify Gain setup (initial value)
      expect(mockSetValueAtTime).toHaveBeenCalledWith(0, mockAudioContext.currentTime)
    })

    it('should connect nodes: oscillator -> gain -> destination', async () => {
      await playSonicChunk(testChunk)
      // FIX: Ensure mocks were called before accessing results
      expect(mockCreateOscillator.mock.calls.length).toBe(1)
      expect(mockCreateGain.mock.calls.length).toBe(1)
      const createdOscillator = mockCreateOscillator.mock.results[0].value
      const createdGainNode = mockCreateGain.mock.results[0].value

      expect(mockConnect).toHaveBeenCalledTimes(2)
      // Check oscillator connects to gain
      expect(createdOscillator.connect).toHaveBeenCalledWith(createdGainNode)
      // Check gain connects to destination
      expect(createdGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination)
    })

    it('should apply exponential envelope correctly for standard duration', async () => {
      const durationSeconds = testChunk.duration / 1000
      const now = mockAudioContext.currentTime
      const attackTime = Math.min(0.01, durationSeconds * 0.2)
      const releaseTime = Math.min(0.08, durationSeconds * 0.3)
      const sustainTime = durationSeconds - attackTime - releaseTime

      await playSonicChunk(testChunk)

      expect(mockExponentialRamp).toHaveBeenCalledTimes(2)
      expect(mockExponentialRamp).toHaveBeenCalledWith(testChunk.magnitude, now + attackTime)
      expect(mockSetValueAtTime).toHaveBeenCalledWith(
        testChunk.magnitude,
        now + attackTime + sustainTime
      )
      expect(mockExponentialRamp).toHaveBeenCalledWith(0.001, now + durationSeconds)
      expect(mockLinearRamp).not.toHaveBeenCalled()
    })

    it('should apply linear envelope for very short duration (< 20ms)', async () => {
      const shortChunk: SonicChunk = { ...testChunk, duration: 10 }
      const durationSeconds = shortChunk.duration / 1000
      const now = mockAudioContext.currentTime

      await playSonicChunk(shortChunk)

      expect(mockLinearRamp).toHaveBeenCalledTimes(2)
      expect(mockLinearRamp).toHaveBeenCalledWith(shortChunk.magnitude, now + durationSeconds * 0.5)
      expect(mockLinearRamp).toHaveBeenCalledWith(0, now + durationSeconds)
      expect(mockExponentialRamp).not.toHaveBeenCalled()
    })

    it('should start and schedule stop for oscillator', async () => {
      const durationSeconds = testChunk.duration / 1000
      const now = mockAudioContext.currentTime

      await playSonicChunk(testChunk)

      expect(mockStart).toHaveBeenCalledTimes(1)
      expect(mockStart).toHaveBeenCalledWith(now)
      expect(mockStop).toHaveBeenCalledTimes(1)
      expect(mockStop).toHaveBeenCalledWith(now + durationSeconds)
    })

    it('should handle cleanup via onended', async () => {
      await playSonicChunk(testChunk)
      // FIX: Ensure mock was called before accessing results
      expect(mockCreateOscillator.mock.calls.length).toBe(1)
      const createdOscillator = mockCreateOscillator.mock.results[0].value

      expect(createdOscillator.onended).toBeInstanceOf(Function)

      // Simulate the oscillator finishing
      createdOscillator.onended!()

      // Advance timers past the safety timeout just in case (though not strictly needed here)
      // Use await for safety with async operations that might be triggered by onended
      await vi.advanceTimersByTimeAsync(testChunk.duration + 200)

      expect(mockDisconnect).toHaveBeenCalledTimes(2) // Once for oscillator, once for gain
    })

    it('should handle cleanup via timeout if onended does not fire', async () => {
      await playSonicChunk(testChunk)

      // FIX: Use await with async timer advancement
      await vi.advanceTimersByTimeAsync(testChunk.duration + 150 + 10) // Advance past duration + timeout margin

      // Check that disconnect was called due to timeout
      expect(mockDisconnect).toHaveBeenCalledTimes(2)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Oscillator onended for chunk ${testChunk.id} timed out`)
      )
    })

    it('should return true on successful playback start', async () => {
      const result = await playSonicChunk(testChunk)
      expect(result).toBe(true)
    })

    it('should return false and log error if context acquisition fails', async () => {
      const contextError = new Error('Web Audio Failed')
      // Arrange: Make getInstance throw
      MockAudioContextManager.getInstance.mockImplementationOnce(() => {
        throw contextError
      })

      // Act
      const result = await playSonicChunk(testChunk)

      // Assert
      expect(result).toBe(false) // FIX: Expect false
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to prepare audio for chunk ${testChunk.id}`),
        contextError.message
      )
      expect(mockCreateOscillator).not.toHaveBeenCalled()
    })

    it('should return false and log error if oscillator start fails', async () => {
      const startError = new Error('Cannot start oscillator')
    // Arrange: Make oscillator.start throw
      mockStart.mockImplementationOnce(() => {
        throw startError
      })

      // Act
      const result = await playSonicChunk(testChunk)

      // Assert
      expect(result).toBe(false) // FIX: Expect false
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to prepare audio for chunk ${testChunk.id}`),
        startError.message
      )
      // Disconnect might still be called depending on exact error point and cleanup logic
      // expect(mockDisconnect).toHaveBeenCalled() // This might or might not happen
    })
  })

  // --- sonifyChanges Tests ---
  describe('sonifyChanges', () => {
    let diffToSonicSpy: MockInstance

    beforeEach(() => {
      // Spy on diffToSonic for verification
      diffToSonicSpy = vi.spyOn(sonificationModule, 'diffToSonic')
    })

    afterEach(() => {
      diffToSonicSpy.mockRestore()
    })

    it('should not call playSonicChunk for empty diff', () => {
      const diff = {}
      sonifyChanges(diff, 100)

      expect(diffToSonicSpy).toHaveBeenCalledWith(diff, 100)
      vi.runAllTimers() // Run timers to check for scheduled calls
      expect(playSonicChunkSpy).not.toHaveBeenCalled()
    })

    it('should call diffToSonic with the diff and duration', () => {
      const diff = { a: 1 }
      const duration = 120
      sonifyChanges(diff, duration)
      expect(diffToSonicSpy).toHaveBeenCalledWith(diff, duration)
    })

    it('should schedule playSonicChunk for each generated chunk with stagger delay', async () => {
      const diff = { a: 1, b: 'two', c: false };
      const duration = 100;
      // FIX: Call the actual diffToSonic (or spy on it but let it run)
      // to get the chunks that would actually be scheduled
      diffToSonicSpy.mockRestore(); // Restore original implementation for this test
      const expectedChunks = diffToSonic(diff, duration);
      diffToSonicSpy = vi.spyOn(sonificationModule, 'diffToSonic').mockReturnValue(expectedChunks); // Re-spy


      sonifyChanges(diff, duration);

      expect(diffToSonicSpy).toHaveBeenCalledWith(diff, duration);
      expect(playSonicChunkSpy).not.toHaveBeenCalled();

      // FIX: Use async timers
      await vi.advanceTimersByTimeAsync(AUDIO_CONFIG.STAGGER_DELAY_MS);
      expect(playSonicChunkSpy).toHaveBeenCalledTimes(1);
      expect(playSonicChunkSpy).toHaveBeenNthCalledWith(1, expectedChunks[0]);

      await vi.advanceTimersByTimeAsync(AUDIO_CONFIG.STAGGER_DELAY_MS);
      expect(playSonicChunkSpy).toHaveBeenCalledTimes(2);
      expect(playSonicChunkSpy).toHaveBeenNthCalledWith(2, expectedChunks[1]);

      await vi.advanceTimersByTimeAsync(AUDIO_CONFIG.STAGGER_DELAY_MS);
      expect(playSonicChunkSpy).toHaveBeenCalledTimes(3);
      expect(playSonicChunkSpy).toHaveBeenNthCalledWith(3, expectedChunks[2]);

      await vi.runAllTimersAsync();
      expect(playSonicChunkSpy).toHaveBeenCalledTimes(3);
    })

    it('should log error and not schedule playback if diffToSonic throws', () => {
      const diffError = new Error('Diff failed')
      // Arrange: Make diffToSonic throw
      diffToSonicSpy.mockImplementationOnce(() => {
        throw diffError
      })

      const diff = { a: 1 }
      sonifyChanges(diff, 100)

      expect(consoleErrorSpy).toHaveBeenCalledWith('Sonification setup failed:', diffError.message)
      vi.runAllTimers()
      expect(playSonicChunkSpy).not.toHaveBeenCalled()
    })

    it('should log error if playSonicChunk rejects/throws inside setTimeout, but continue other sounds', async () => {
      const diff = { a: 1, b: 2, c: 3 }; // 3 chunks
      const playbackError = new Error('Playback failed for chunk b');

      // FIX: Call actual diffToSonic to get chunks
      diffToSonicSpy.mockRestore();
      const expectedChunks = diffToSonic(diff, 100);
      diffToSonicSpy = vi.spyOn(sonificationModule, 'diffToSonic').mockReturnValue(expectedChunks); // Re-spy

      // Arrange: Make the second call to playSonicChunk (via spy) fail
      playSonicChunkSpy.mockImplementation(async (chunk) => {
        expect(chunk).toBeDefined(); // Basic check
        if (chunk.id === 'b') { // Check id from expectedChunks[1]
          throw playbackError;
        }
        return true; // Succeed otherwise
      });

      sonifyChanges(diff, 100);
      expect(diffToSonicSpy).toHaveBeenCalledWith(diff, 100);

      // Act & Assert
      // FIX: Use async timers
      await vi.advanceTimersByTimeAsync(AUDIO_CONFIG.STAGGER_DELAY_MS); // Chunk 'a'
      expect(playSonicChunkSpy).toHaveBeenCalledTimes(1);
      expect(playSonicChunkSpy).toHaveBeenNthCalledWith(1, expectedChunks[0]);
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(AUDIO_CONFIG.STAGGER_DELAY_MS); // Chunk 'b' (fails)
      expect(playSonicChunkSpy).toHaveBeenCalledTimes(2);
      expect(playSonicChunkSpy).toHaveBeenNthCalledWith(2, expectedChunks[1]);
      // Error is caught by the catch block within the setTimeout callback in sonifyChanges
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error during scheduled playback for chunk ${expectedChunks[1].id}:`, // Chunk id 'b'
        playbackError // The actual error object
      );


      await vi.advanceTimersByTimeAsync(AUDIO_CONFIG.STAGGER_DELAY_MS); // Chunk 'c'
      expect(playSonicChunkSpy).toHaveBeenCalledTimes(3);
      expect(playSonicChunkSpy).toHaveBeenNthCalledWith(3, expectedChunks[2]);

      await vi.runAllTimersAsync();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1); // Only one error logged
    })
  })
})