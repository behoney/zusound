import { SonicChunk } from './types'
import { AUDIO_CONFIG } from './constants'
import { AudioContextManager, simpleHash } from './utils'

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
 * Play a sonic chunk using the Web Audio API.
 * Dispatches visualization events regardless of playback success.
 * @param chunk - The sonic chunk to play
 * @returns Promise resolving to true if audio playback started, false otherwise.
 */
export async function playSonicChunk(chunk: SonicChunk): Promise<boolean> {
  try {
    const audioManager = AudioContextManager.getInstance()
    const ctx = audioManager.getContext() // Ensures context is ready

    // Dispatch custom event for visualizer *before* attempting playback
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('zusound', {
        detail: { chunk },
      })
      window.dispatchEvent(event)
    }

    // Attempt to resume context if suspended
    let canPlayAudio = false
    if (ctx.state === 'running') {
      canPlayAudio = true
    } else if (ctx.state === 'suspended') {
      console.log(`Audio context suspended before playing chunk ${chunk.id}. Attempting resume...`)
      const { resumed } = await audioManager.tryResumeAudioContext()
      if (resumed) {
        canPlayAudio = true
      } else {
        console.warn(`Audio playback skipped for chunk ${chunk.id} - context still suspended.`)
        return false // Indicate audio didn't play
      }
    } else {
      console.warn(
        `Audio context in unexpected state (${ctx.state}) for chunk ${chunk.id}. Cannot play.`
      )
      return false // Cannot play in closed or other states
    }

    // Only proceed if context is running
    if (canPlayAudio && ctx.state === 'running') {
      const now = ctx.currentTime
      const duration = chunk.duration / 1000 // Convert ms to seconds

      const oscillator = ctx.createOscillator()
      oscillator.type = chunk.type
      oscillator.frequency.setValueAtTime(chunk.frequency, now)
      oscillator.detune.setValueAtTime(chunk.detune, now)

      const gainNode = ctx.createGain()
      gainNode.gain.setValueAtTime(0, now)
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      const attackTime = Math.min(0.01, duration * 0.2)
      const releaseTime = Math.min(0.08, duration * 0.3)
      const sustainDuration = Math.max(0, duration - attackTime - releaseTime)

      if (duration > 0.02) {
        gainNode.gain.exponentialRampToValueAtTime(chunk.magnitude, now + attackTime)
        if (sustainDuration > 0.001) {
          gainNode.gain.setValueAtTime(chunk.magnitude, now + attackTime + sustainDuration)
        }
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)
      } else {
        gainNode.gain.linearRampToValueAtTime(chunk.magnitude, now + duration * 0.5)
        gainNode.gain.linearRampToValueAtTime(0, now + duration)
      }

      oscillator.start(now)
      oscillator.stop(now + duration)

      // Cleanup promise with timeout safety
      await new Promise<void>(resolve => {
        let resolved = false
        const timeoutId = setTimeout(
          () => {
            if (!resolved) {
              console.warn(`Oscillator onended for chunk ${chunk.id} timed out. Force cleaning up.`)
              try {
                oscillator.disconnect()
                gainNode.disconnect()
              } catch {
                /* ignore */
              }
              resolved = true
              resolve()
            }
          },
          duration * 1000 + 150
        )

        oscillator.onended = () => {
          if (!resolved) {
            clearTimeout(timeoutId)
            try {
              oscillator.disconnect()
              gainNode.disconnect()
            } catch {
              /* ignore */
            }
            resolved = true
            resolve()
          }
        }
      })
      return true // Audio playback initiated
    }

    return false // Audio did not play
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Failed to prepare audio for chunk ${chunk.id}:`, message)
    return false // Indicate audio setup/playback failed
  }
}

/**
 * Generates sonic chunks and plays them.
 * Visualizer listens independently via dispatched events.
 * @param diff - State changes
 * @param duration - Sound duration
 * @param _persistVisualizer - No longer used for UI control, kept for potential future options
 */
export function sonifyChanges<T>(
  diff: Partial<T>,
  duration: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _persistVisualizer: boolean = false // Parameter kept for signature compatibility, but unused
): void {
  try {
    const chunks = diffToSonic(diff, duration)
    if (chunks.length === 0) return

    // Stagger playback
    chunks.forEach((chunk, index) => {
      setTimeout(() => {
        playSonicChunk(chunk).catch(err => {
          console.error(`Error during scheduled playback for chunk ${chunk.id}:`, err)
        })
      }, index * AUDIO_CONFIG.STAGGER_DELAY_MS)
    })
  } catch (err: unknown) {
    console.error('Sonification setup failed:', err instanceof Error ? err.message : String(err))
  }
}
