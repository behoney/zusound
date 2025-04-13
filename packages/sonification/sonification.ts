import { SonicChunk } from './types'
import { AUDIO_CONFIG } from './constants'
import { AudioContextManager, simpleHash } from './utils'
import { ZusoundEventDetail } from '../visualizer' // Import detail type

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

  // --- Helper function to recursively get keys ---
  // This flattens the diff for consistent processing, but might lose some structural info.
  // Consider if a deep diff structure is needed later. For now, simple diff keys are used.
  const flattenKeys = (obj: Record<string, unknown>, prefix = ''): Record<string, unknown> => {
    return Object.keys(obj).reduce(
      (acc, k) => {
        const pre = prefix.length ? `${prefix}.` : ''
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
          // Optionally recurse into nested objects if needed
          // Object.assign(acc, flattenKeys(obj[k], pre + k));
          // For now, treat nested objects as a single change at the top level key
          acc[pre + k] = obj[k]
        } else {
          acc[pre + k] = obj[k]
        }
        return acc
      },
      {} as Record<string, unknown>
    )
  }

  const flatDiff = flattenKeys(diff as Record<string, unknown>)

  return Object.entries(flatDiff).map(([key, value]) => {
    // Determine value type based on the change
    const valueType = value === undefined || value === null ? 'remove' : 'change'

    // --- Frequency Calculation ---
    // Map key hash to a base frequency within a scale
    // Using the potentially flattened key 'key'
    const hash = simpleHash(key)
    const octave = Math.floor(hash / 100) % 3 // Shift up 0, 1, or 2 octaves
    const scaleIndex = hash % AUDIO_CONFIG.SCALE.length
    let frequency =
      AUDIO_CONFIG.BASE_FREQUENCY * Math.pow(2, octave) * AUDIO_CONFIG.SCALE[scaleIndex]

    // Adjust frequency by key depth (split the potentially flattened key)
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
        waveType = 'triangle' // Objects, arrays, etc.
      }
    }

    const magnitude =
      valueType === 'remove'
        ? AUDIO_CONFIG.DEFAULT_MAGNITUDE.REMOVE
        : AUDIO_CONFIG.DEFAULT_MAGNITUDE.CHANGE

    return {
      id: key, // Use the potentially flattened key as ID
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
 * @param persistVisualizer - Whether to show visualizer dialog if audio is blocked
 * @throws Error if Web Audio API is not supported or audio cannot be played
 */
export async function playSonicChunk(
  chunk: SonicChunk,
  persistVisualizer: boolean = false
): Promise<void> {
  // TODO(#11):: long function, refactor this into smaller functions
  try {
    const audioManager = AudioContextManager.getInstance()
    const ctx = audioManager.getContext() // Ensures context and Visualizer are initialized

    // Dispatch custom event for visualizer *before* attempting playback
    // This ensures visualization happens even if audio is blocked/fails
    if (typeof window !== 'undefined') {
      const event = new CustomEvent<ZusoundEventDetail>('zusound', {
        detail: { chunk },
      })
      window.dispatchEvent(event)
    }

    // If audio context is suspended (e.g., browser autoplay policy), try to resume it
    if (ctx.state === 'suspended') {
      // Try to resume, showing dialog only if persistVisualizer is true AND resume fails
      const resumed = await audioManager.tryResumeAudioContext(persistVisualizer)
      if (!resumed) {
        // If still suspended after trying, don't attempt to play sound
        console.warn(`Audio playback skipped for chunk ${chunk.id} - context suspended.`)
        return // Exit function, audio cannot play
      }
      // If resumed successfully, continue to playback logic below
    }

    // --- Audio Playback Logic ---
    // This part only runs if the context is 'running'

    const now = ctx.currentTime
    const duration = chunk.duration / 1000 // Convert to seconds

    // Create and configure oscillator
    const oscillator = ctx.createOscillator()
    oscillator.type = chunk.type
    // Use setValueAtTime for frequency and detune to ensure they are set correctly
    // even if the context was just resumed. Using .value might fail in some browsers.
    oscillator.frequency.setValueAtTime(chunk.frequency, now)
    oscillator.detune.setValueAtTime(chunk.detune, now) // Apply detuning

    // Create gain node with envelope
    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0, now) // Start silent

    // Connect nodes
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Calculate envelope timings
    const attackTime = Math.min(0.01, duration * 0.2)
    const releaseTime = Math.min(0.08, duration * 0.3)
    const sustainDuration = Math.max(0, duration - attackTime - releaseTime) // Ensure non-negative sustain

    // Apply envelope
    if (duration > 0.02) {
      // Standard envelope for longer sounds
      gainNode.gain.exponentialRampToValueAtTime(chunk.magnitude, now + attackTime)
      // Sustain phase: hold the magnitude
      if (sustainDuration > 0.001) {
        // Add a small threshold for sustain phase
        gainNode.gain.setValueAtTime(chunk.magnitude, now + attackTime + sustainDuration)
      }
      // Release phase
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)
    } else {
      // Simple linear ramp for very short clicks/sounds
      gainNode.gain.linearRampToValueAtTime(chunk.magnitude, now + duration * 0.5)
      gainNode.gain.linearRampToValueAtTime(0, now + duration)
    }

    // Schedule oscillator start and stop
    oscillator.start(now)
    oscillator.stop(now + duration)

    // Setup cleanup for when the sound finishes *playing*
    // Use a promise to wait for onended or timeout
    await new Promise<void>(resolve => {
      let resolved = false
      oscillator.onended = () => {
        if (!resolved) {
          oscillator.disconnect()
          gainNode.disconnect()
          resolved = true
          resolve()
        }
      }
      // Add a safety timeout slightly longer than duration, in case onended doesn't fire
      setTimeout(
        () => {
          if (!resolved) {
            console.warn(
              `Oscillator onended for chunk ${chunk.id} did not fire within expected time.`
            )
            try {
              oscillator.disconnect()
              gainNode.disconnect()
            } catch (e) {
              /* Ignore errors if already disconnected */
              console.error(`Error disconnecting oscillator for chunk ${chunk.id}:`, e)
            }
            resolved = true
            resolve()
          }
        },
        duration * 1000 + 100
      ) // duration is already in sec, convert back to ms + buffer
    })
  } catch (err) {
    // Log errors related to audio playback setup or execution
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Failed to play audio for chunk ${chunk.id}:`, message)
    // Don't re-throw here to allow other sounds in the sequence to potentially play
    // throw new Error(`Failed to play audio: ${message}`) // Original behavior
  }
}

/**
 * Play a sonic representation of state changes
 * @param diff - The object containing state changes to sonify
 * @param duration - Base duration for each sonic chunk in milliseconds
 * @param persistVisualizer - Whether to show visualizer dialog if audio is blocked
 */
export function sonifyChanges<T>(
  diff: Partial<T>,
  duration: number,
  persistVisualizer: boolean = false
): void {
  try {
    const chunks = diffToSonic(diff, duration)

    if (chunks.length === 0) {
      return
    }

    // Use staggered playback for clearer auditory perception
    chunks.forEach((chunk, index) => {
      setTimeout(() => {
        // No need for inner try/catch as playSonicChunk handles its errors now
        playSonicChunk(chunk, persistVisualizer).catch(err => {
          // This catch is unlikely to be hit now, but kept for safety
          console.error(`Error during scheduled playback for chunk ${chunk.id}:`, err)
        })
      }, index * AUDIO_CONFIG.STAGGER_DELAY_MS)
    })
  } catch (err: unknown) {
    // Catch synchronous errors (e.g., from diffToSonic)
    console.error('Sonification setup failed:', err instanceof Error ? err.message : String(err))
  }
}
