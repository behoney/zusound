import { AUDIO_CONFIG } from './constants'
import { AudioContextManager } from './utils'
import {
  SONIC_CHUNK_EVENT_NAME,
  SonicChunk,
  DiffChunk,
  AnomalyChunk,
  ZusoundSoundEvent,
  WatchPathConfig,
} from '../shared-types'

/**
 * Convert a diff object to sonic chunks that represent sounds
 * @param diff - Object containing changes to be sonified
 * @param duration - Base duration for each sonic chunk in milliseconds
 * @param watchConfig - Optional watch path configuration for enhanced feedback
 * @returns Array of SonicChunk objects representing sounds to play
 */
export function diffToSonic<T extends DiffChunk>(
  diff: T,
  duration = 50,
  watchConfig?: WatchPathConfig
): SonicChunk {
  if (!diff || Object.keys(diff).length === 0) {
    return {
      id: '',
      type: 'sine',
      frequency: 0,
      magnitude: 0,
      duration: 0,
      detune: 0,
    }
  }

  // Determine value type based on the change
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const valueType = diff.type === 'add' || diff.type === 'remove' ? diff.type : 'change'

  // --- Frequency Calculation ---
  // Map key hash (from diff.path) to a base frequency within a scale
  const pathString = String(diff.path) // Ensure path is a string
  const octave = Math.floor(pathString.length / 10) % 3 // Adjusted divisor for more reasonable octave shifts
  const scaleIndex = pathString.length % AUDIO_CONFIG.SCALE.length
  let frequency = AUDIO_CONFIG.BASE_FREQUENCY * Math.pow(2, octave) * AUDIO_CONFIG.SCALE[scaleIndex]

  // Adjust frequency by key depth (split the path)
  const depth = pathString.split('.').length - 1
  frequency *= 1 + depth * 0.05 // Increase pitch slightly for deeper keys

  // Add more dynamic variation based on diff properties
  if (diff.diffPower) {
    // Use diffPower to create more variation
    const powerFactor = Math.min(Math.abs(diff.diffPower) / 10, 1) // Normalize between 0-1
    frequency *= 1 + powerFactor * 0.2 // Up to 20% variation based on diff power
  }

  // Adjust based on change type
  if (diff.type === 'add') {
    frequency *= 1.1 // Slightly higher pitch for additions
  } else if (diff.type === 'remove') {
    frequency *= 0.9 // Slightly lower pitch for removals
  }

  // Add variation based on value type
  if (diff.valueType === 'string') {
    // String length affects frequency
    const stringFactor = Math.min(diff.diff?.length || 0, 100) / 100
    frequency *= 1 + stringFactor * 0.15 // Up to 15% variation based on string length
  } else if (diff.valueType === 'object' || diff.valueType === 'array') {
    // Complex types get a distinctive sound
    frequency *= 1.25
  }

  // --- Detune Calculation (based on value) ---
  let detuneCents = 0
  const valueOfType = diff.valueType // This is diff.valueType, not related to diff.type

  if (valueOfType === 'number') {
    // Logarithmic scale for number magnitude, capped
    detuneCents = Math.min(Math.log1p(Math.abs(diff.diffPower)) * 50, 600)
  } else if (valueOfType === 'string') {
    // Logarithmic scale for string length, capped
    // Use diff.diff (which is Levenshtein steps for strings, or length for added/removed)
    const diffLength = parseInt(diff.diff, 10) // diff.diff is a string
    detuneCents = Math.min(Math.log1p(isNaN(diffLength) ? 0 : diffLength) * 25, 300)
  } else if (valueOfType === 'boolean') {
    detuneCents = diff.diffPower !== 0 ? (diff.diffPower > 0 ? 25 : -25) : 0 // Slight detune for true/false changes
  } else {
    // Keep detune 0 for objects, arrays, etc. for now
  }

  // --- Waveform Mapping ---
  let waveType: SonicChunk['type'] = 'sine' // Default
  if (diff.type === 'remove') {
    // Use diff.type here ('add', 'remove', 'change')
    waveType = 'triangle'
  } else {
    if (valueOfType === 'number') {
      waveType = 'sine'
    } else if (valueOfType === 'string') {
      waveType = 'square'
    } else if (valueOfType === 'boolean') {
      waveType = 'sawtooth'
    } else {
      // object, array, unknown
      waveType = 'triangle'
    }
  }

  const magnitude =
    diff.type === 'remove' // Use diff.type here
      ? AUDIO_CONFIG.DEFAULT_MAGNITUDE.REMOVE
      : AUDIO_CONFIG.DEFAULT_MAGNITUDE.CHANGE

  // --- Critical State Watcher Enhancements ---
  let enhancedDuration = Math.max(duration, AUDIO_CONFIG.MIN_DURATION_MS)
  let enhancedFrequency = frequency
  let enhancedDetune = detuneCents
  let enhancedMagnitude = magnitude
  let enhancedWaveType = waveType

  if (watchConfig) {
    // Apply custom sound overrides if provided
    if (watchConfig.customSound) {
      const custom = watchConfig.customSound
      if (custom.frequency !== undefined) enhancedFrequency = custom.frequency
      if (custom.magnitude !== undefined) enhancedMagnitude = custom.magnitude
      if (custom.duration !== undefined)
        enhancedDuration = Math.max(custom.duration, AUDIO_CONFIG.MIN_DURATION_MS)
      if (custom.detune !== undefined) enhancedDetune = custom.detune
      if (custom.type !== undefined) {
        // If custom type is 'custom', use a fallback for enhancedWaveType directly
        // to satisfy linter, though playSonicChunk handles 'custom' at playback.
        // This means SonicChunk.type won't carry 'custom' if set via watchConfig.
        enhancedWaveType = custom.type === 'custom' ? 'sine' : custom.type
      }
    } else {
      // Apply default alert level enhancements
      if (watchConfig.alertLevel === 'critical') {
        enhancedMagnitude *= 1.5 // 50% louder
        enhancedDetune += 200 // +200 cents for distinctiveness
        enhancedDuration *= 1.3 // 30% longer
        enhancedFrequency *= 1.1 // Slightly higher pitch
      } else if (watchConfig.alertLevel === 'warning') {
        enhancedMagnitude *= 1.2 // 20% louder
        enhancedDetune += 100 // +100 cents for distinctiveness
        enhancedDuration *= 1.1 // 10% longer
        enhancedFrequency *= 1.05 // Slightly higher pitch
      }
    }
  }

  const sonicChunk: SonicChunk = {
    id: diff.path, // Use the path as the SonicChunk ID
    type: enhancedWaveType,
    frequency: enhancedFrequency,
    magnitude: Math.min(enhancedMagnitude, 1.0), // Cap at 1.0
    duration: enhancedDuration,
    detune: Math.max(-600, Math.min(600, enhancedDetune)), // Cap detune range
    alertLevel: diff.alertLevel,
    isCriticalPath: !!watchConfig,
  }

  return sonicChunk
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
    // This event is now SONIC_CHUNK_EVENT_NAME
    if (typeof window !== 'undefined') {
      const event: ZusoundSoundEvent = new CustomEvent(SONIC_CHUNK_EVENT_NAME, {
        detail: { chunk },
      })
      window.dispatchEvent(event)
    }

    // Attempt to resume context if suspended
    let canPlayAudio = false
    if (ctx.state === 'running') {
      canPlayAudio = true
    } else if (ctx.state === 'suspended') {
      console.info(`Audio context suspended before playing chunk ${chunk.id}. Attempting resume...`)
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

      // Create oscillator with the specific waveform type from the chunk
      const oscillator = ctx.createOscillator()
      // TODO:: OscillatorType 'custom' should be implemented
      oscillator.type = chunk.type === 'custom' ? 'sine' : chunk.type // Fallback for 'custom' if not implemented

      // Set frequency and detune based on chunk data
      oscillator.frequency.setValueAtTime(chunk.frequency, now)
      oscillator.detune.setValueAtTime(chunk.detune, now)

      // Create gain node for volume envelope
      const gainNode = ctx.createGain()
      gainNode.gain.setValueAtTime(0, now) // Start silent

      // Add stereo panning for spatial variation based on waveform type
      const pannerNode = ctx.createStereoPanner()
      let panValue = 0
      switch (chunk.type) {
        case 'sine':
          panValue = -0.3
          break
        case 'square':
          panValue = 0.4
          break
        case 'sawtooth':
          panValue = 0.7
          break
        case 'triangle':
        case 'custom': // Handle 'custom' for panning
          panValue = -0.6
          break
        default:
          panValue = 0
      }
      panValue += Math.random() * 0.2 - 0.1
      pannerNode.pan.setValueAtTime(Math.max(-1, Math.min(1, panValue)), now)

      // Create a filter for timbral variation
      const filterNode = ctx.createBiquadFilter()
      switch (chunk.type) {
        case 'sine':
          filterNode.type = 'lowpass'
          filterNode.frequency.setValueAtTime(chunk.frequency * 3, now)
          break
        case 'square':
          filterNode.type = 'highpass'
          filterNode.frequency.setValueAtTime(chunk.frequency * 0.5, now)
          break
        case 'sawtooth':
          filterNode.type = 'bandpass'
          filterNode.frequency.setValueAtTime(chunk.frequency * 2, now)
          filterNode.Q.setValueAtTime(2, now)
          break
        case 'triangle':
        case 'custom': // TODO:: Handle 'custom' for filter
          filterNode.type = 'lowshelf'
          filterNode.frequency.setValueAtTime(chunk.frequency, now)
          filterNode.gain.setValueAtTime(3, now)
          break
      }

      oscillator.connect(filterNode)
      filterNode.connect(gainNode)
      gainNode.connect(pannerNode)
      pannerNode.connect(ctx.destination)

      const attackRatio = chunk.type === 'sine' ? 0.15 : 0.2
      const attackTime = Math.min(0.01, duration * attackRatio)
      const releaseRatio = Math.min(0.3, 0.2 + chunk.magnitude * 0.1)
      const releaseTime = Math.min(0.08, duration * releaseRatio)
      const sustainDuration = Math.max(0, duration - attackTime - releaseTime)

      if (duration > 0.02) {
        gainNode.gain.exponentialRampToValueAtTime(chunk.magnitude, now + attackTime)
        if (chunk.frequency > AUDIO_CONFIG.BASE_FREQUENCY * 2) {
          const decayTarget = chunk.magnitude * 0.85
          gainNode.gain.exponentialRampToValueAtTime(
            decayTarget,
            now + attackTime + sustainDuration * 0.2
          )
          gainNode.gain.setValueAtTime(decayTarget, now + attackTime + sustainDuration * 0.2)
          if (filterNode.frequency.value > 0) {
            filterNode.frequency.exponentialRampToValueAtTime(
              filterNode.frequency.value * 0.7,
              now + duration * 0.8
            )
          }
        } else if (sustainDuration > 0.001) {
          gainNode.gain.setValueAtTime(chunk.magnitude, now + attackTime + sustainDuration)
          if (filterNode.frequency.value > 0) {
            filterNode.frequency.exponentialRampToValueAtTime(
              filterNode.frequency.value * 1.2,
              now + attackTime + sustainDuration * 0.5
            )
            filterNode.frequency.exponentialRampToValueAtTime(
              filterNode.frequency.value * 0.9,
              now + duration
            )
          }
        }
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)
      } else {
        gainNode.gain.linearRampToValueAtTime(chunk.magnitude, now + duration * 0.5)
        gainNode.gain.linearRampToValueAtTime(0, now + duration)
        if (filterNode.frequency.value > 0) {
          filterNode.frequency.exponentialRampToValueAtTime(
            filterNode.frequency.value * 0.5,
            now + duration
          )
        }
      }

      oscillator.start(now)
      oscillator.stop(now + duration)

      await new Promise<void>(resolve => {
        let resolved = false
        const timeoutId = setTimeout(
          () => {
            if (!resolved) {
              console.warn(`Oscillator onended for chunk ${chunk.id} timed out. Force cleaning up.`)
              try {
                oscillator.disconnect()
                filterNode.disconnect()
                gainNode.disconnect()
                pannerNode.disconnect()
              } catch {
                /* ignore */
              }
              resolved = true
              resolve()
            }
          },
          chunk.duration + 150 // Use chunk.duration (ms) here, not seconds
        )
        oscillator.onended = () => {
          if (!resolved) {
            clearTimeout(timeoutId)
            try {
              oscillator.disconnect()
              filterNode.disconnect()
              gainNode.disconnect()
              pannerNode.disconnect()
            } catch {
              /* ignore */
            }
            resolved = true
            resolve()
          }
        }
      })
      return true
    }
    return false
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Failed to prepare audio for chunk ${chunk.id}:`, message)
    return false
  }
}

/**
 * Converts state changes into sound and triggers playback.
 * The visualizer component receives these events through the window event system.
 * @param diff - The state change to sonify
 * @param duration - Duration of the sound in milliseconds
 * @param watchConfig - Optional watch path configuration for enhanced feedback
 */
export function sonifyChanges<T extends DiffChunk>(
  diff: T,
  duration: number,
  watchConfig?: WatchPathConfig
): void {
  try {
    const sonicChunk = diffToSonic(diff, duration, watchConfig)

    // Stagger playback slightly if multiple changes occur rapidly, though currently called per diffChunk
    // setTimeout is 0, so it's more about deferring to next tick.
    setTimeout(() => {
      playSonicChunk(sonicChunk).catch(err => {
        console.error(`Error during scheduled playback for chunk ${sonicChunk.id}:`, err)
      })
    }, 0)
  } catch (err: unknown) {
    console.error('Sonification setup failed:', err instanceof Error ? err.message : String(err))
  }
}

/**
 * Convert anomaly to distinct urgent sonic chunk
 */
export function anomalyToSonic(
  anomaly: AnomalyChunk,
  customSound?: Partial<SonicChunk>
): SonicChunk {
  const baseFreq = 1000 // Prominent warning frequency
  const severity = anomaly.severity === 'critical' ? 1.5 : 1.0

  // Apply custom overrides or use urgent defaults
  const sonicChunk: SonicChunk = {
    id: anomaly.id,
    type: 'square', // Sharp electronic warning sound
    frequency: customSound?.frequency ?? baseFreq * severity,
    magnitude: customSound?.magnitude ?? Math.min(0.7 * severity, 1.0),
    duration: customSound?.duration ?? 200 * severity, // Longer for attention
    detune: customSound?.detune ?? 400, // High detune for urgency
    alertLevel: anomaly.severity,
    isAnomaly: true,
    anomalyType: anomaly.type,
    ...(customSound && customSound),
  }

  return sonicChunk
}

/**
 * Create stuttering rapid-fire anomaly sound pattern
 */
async function playRapidChangePattern(chunk: SonicChunk): Promise<boolean> {
  try {
    const audioManager = AudioContextManager.getInstance()
    const ctx = audioManager.getContext()

    if (ctx.state !== 'running') {
      const { resumed } = await audioManager.tryResumeAudioContext()
      if (!resumed) return false
    }

    const now = ctx.currentTime
    const burstCount = 3 // Three rapid bursts
    const burstDuration = chunk.duration / 1000 / burstCount
    const burstGap = burstDuration * 0.3

    for (let i = 0; i < burstCount; i++) {
      const startTime = now + i * (burstDuration + burstGap)
      const frequency = chunk.frequency * (1 + i * 0.1) // Rising pitch

      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.type = chunk.type === 'custom' ? 'square' : chunk.type
      oscillator.frequency.setValueAtTime(frequency, startTime)
      oscillator.detune.setValueAtTime(chunk.detune, startTime)

      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.exponentialRampToValueAtTime(chunk.magnitude, startTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + burstDuration)

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.start(startTime)
      oscillator.stop(startTime + burstDuration)
    }

    return true
  } catch (err) {
    console.error('Anomaly pattern playback failed:', err)
    return false
  }
}

/**
 * Play anomaly-specific audio with urgent patterns
 */
export async function playAnomalySonicChunk(chunk: SonicChunk): Promise<boolean> {
  // Dispatch event for visualization first
  if (typeof window !== 'undefined') {
    const event: ZusoundSoundEvent = new CustomEvent(SONIC_CHUNK_EVENT_NAME, {
      detail: { chunk },
    })
    window.dispatchEvent(event)
  }

  // Use specialized pattern for rapid-change anomalies
  if (chunk.anomalyType === 'rapid-change') {
    return playRapidChangePattern(chunk)
  }

  // Fallback to enhanced regular playback
  return playSonicChunk(chunk)
}

/**
 * Convert anomaly to sound and trigger playback
 */
export function sonifyAnomaly(anomaly: AnomalyChunk, customSound?: Partial<SonicChunk>): void {
  try {
    const sonicChunk = anomalyToSonic(anomaly, customSound)

    setTimeout(() => {
      playAnomalySonicChunk(sonicChunk).catch(err => {
        console.error(`Anomaly playback failed for ${sonicChunk.id}:`, err)
      })
    }, 0)
  } catch (err) {
    console.error('Anomaly sonification setup failed:', err)
  }
}
