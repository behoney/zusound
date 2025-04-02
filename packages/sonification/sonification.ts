import { SonicChunk } from './types'
import { AUDIO_CONFIG } from './constants'
import { getAudioContext, simpleHash, cleanupAudio } from './utils'

/**
 * Convert a diff object to sonic chunks that represent sounds
 * @param diff - Object containing changes to be sonified
 * @param duration - Base duration for each sonic chunk in milliseconds
 * @returns Array of SonicChunk objects representing sounds to play
 */
export function diffToSonic<T>(diff: Partial<T>, duration: number): SonicChunk[] {
  if (!diff || Object.keys(diff).length === 0) {
    return []
  }

  return Object.entries(diff).map(([key, value]) => {
    // Determine value type based on the change
    const valueType = value === undefined || value === null ? 'remove' : 'change'

    // --- Frequency Calculation ---
    // Map key hash to a base frequency within a scale
    const hash = simpleHash(key)
    const octave = Math.floor(hash / 100) % 3 // Shift up 0, 1, or 2 octaves
    const scaleIndex = hash % AUDIO_CONFIG.SCALE.length
    let frequency =
      AUDIO_CONFIG.BASE_FREQUENCY * Math.pow(2, octave) * AUDIO_CONFIG.SCALE[scaleIndex]

    // Adjust frequency by key depth
    const depth = key.split('.').length - 1
    frequency *= 1 + depth * 0.05 // Increase pitch slightly for deeper keys

    // --- Detune Calculation (based on value) ---
    let detuneCents = 0
    const valueOfType = typeof value

    if (valueType === 'change') {
      if (valueOfType === 'number') {
        // Logarithmic scale for number magnitude, capped
        detuneCents = Math.min(Math.log1p(Math.abs(value as number)) * 50, 600)
      } else if (valueOfType === 'string') {
        // Logarithmic scale for string length, capped
        detuneCents = Math.min(Math.log1p((value as string).length) * 25, 300)
      } else if (valueOfType === 'boolean') {
        detuneCents = value ? 25 : -25 // Slight detune for true/false
      }
      // Keep detune 0 for objects, arrays, etc. for now
    } // Else (remove), keep detune 0

    // --- Waveform Mapping ---
    let waveType: SonicChunk['type'] = 'sine' // Default
    if (valueType === 'remove') {
      waveType = 'triangle'
    } else {
      if (valueOfType === 'number') {
        waveType = 'sine'
      } else if (valueOfType === 'string') {
        waveType = 'square'
      } else if (valueOfType === 'boolean') {
        waveType = 'sawtooth'
      } else {
        waveType = 'triangle' // Objects, etc.
      }
    }

    const magnitude =
      valueType === 'remove'
        ? AUDIO_CONFIG.DEFAULT_MAGNITUDE.REMOVE
        : AUDIO_CONFIG.DEFAULT_MAGNITUDE.CHANGE

    return {
      id: key,
      type: waveType,
      valueType,
      frequency,
      magnitude,
      duration: Math.max(duration, AUDIO_CONFIG.MIN_DURATION_MS),
      detune: detuneCents,
    }
  })
}

/**
 * Play a sonic chunk using the Web Audio API
 * @param chunk - The sonic chunk to play
 * @throws Error if Web Audio API is not supported or audio cannot be played
 */
export function playSonicChunk(chunk: SonicChunk): void {
  // TODO:: long function, refactor this into smaller functions
  try {
    const ctx = getAudioContext()

    // If audio context is suspended (e.g., browser autoplay policy), try to resume it
    if (ctx.state === 'suspended') {
      ctx.resume().catch(err => {
        // console.warn('Could not resume audio context:', err.message);
      })
    }

    const now = ctx.currentTime
    const duration = chunk.duration / 1000 // Convert to seconds

    // Create and configure oscillator
    const oscillator = ctx.createOscillator()
    oscillator.type = chunk.type
    oscillator.frequency.setValueAtTime(chunk.frequency, now)
    oscillator.detune.setValueAtTime(chunk.detune, now) // Apply detuning

    // Create gain node with envelope
    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0, now)

    // Connect nodes
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Calculate envelope timings
    const attackTime = Math.min(0.01, duration * 0.2)
    const releaseTime = Math.min(0.08, duration * 0.3)
    const sustainTime = duration - attackTime - releaseTime

    // Apply envelope
    if (duration > 0.02) {
      // Attack
      gainNode.gain.exponentialRampToValueAtTime(chunk.magnitude, now + attackTime)
      // Sustain
      gainNode.gain.setValueAtTime(chunk.magnitude, now + attackTime + sustainTime)
      // Release
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)
    } else {
      // For very short sounds, use simpler envelope
      gainNode.gain.linearRampToValueAtTime(chunk.magnitude, now + duration * 0.5)
      gainNode.gain.linearRampToValueAtTime(0, now + duration)
    }

    // Schedule oscillator and add event listeners for cleanup
    oscillator.onended = () => {
      oscillator.disconnect()
      gainNode.disconnect()
    }

    oscillator.start(now)
    oscillator.stop(now + duration)
  } catch (err) {
    if (err instanceof Error) {
      // console.error('Failed to play audio:', err.message);
      throw new Error(`Failed to play audio: ${err.message}`)
    } else {
      // console.error('Failed to play audio:', err);
      throw new Error('Failed to play audio')
    }
  }
}

/**
 * Play a sonic representation of state changes
 * @param diff - The object containing state changes to sonify
 * @param duration - Base duration for each sonic chunk in milliseconds
 */
export function sonifyChanges<T>(diff: Partial<T>, duration: number): void {
  try {
    const chunks = diffToSonic(diff, duration)

    if (chunks.length === 0) {
      return
    }

    // Use staggered playback for clearer auditory perception
    chunks.forEach((chunk, index) => {
      setTimeout(() => playSonicChunk(chunk), index * AUDIO_CONFIG.STAGGER_DELAY_MS)
    })
  } catch (err: unknown) {
    console.error('Sonification failed:', err instanceof Error ? err.message : String(err))
  }
}

// Re-export for backwards compatibility
export { cleanupAudio }
