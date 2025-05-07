import { ZusoundSoundEvent } from '../shared-types'
import { SONIC_CHUNK_EVENT_NAME, SonicChunk } from '../shared-types/sonic-chunk'
import { Visualizer } from './src/visualizer-core'

export {
  showPersistentVisualizer,
  showAudioBlockedDialog,
  hidePersistentVisualizer,
  closeAudioBlockedDialog,
} from './dialog'

export { Visualizer } from './src/visualizer-core'

/** Initializes visualizer singleton and event listeners */
export function ensureVisualizerReady(): void {
  Visualizer.getInstance()
}

/** Dispatches visualization event for given SonicChunk */
export function visualizeSonicChunk(chunk: SonicChunk): void {
  if (typeof window !== 'undefined') {
    const event: ZusoundSoundEvent = new CustomEvent(SONIC_CHUNK_EVENT_NAME, {
      detail: { chunk },
    })
    window.dispatchEvent(event)
  } else {
    console.warn('Cannot visualizeSonicChunk outside of a browser environment.')
  }
}
