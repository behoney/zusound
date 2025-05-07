import { Visualizer } from './src/visualizer-core'

const audioBlockedDialog: HTMLDialogElement | null = null
const visualizerCanvasContainer: HTMLDivElement | null = null
const isDialogVisible = false

let persistentContainer: HTMLDivElement | null = null
let isPersistentVisible = false

export function showPersistentVisualizer(): void {
  if (isPersistentVisible || typeof document === 'undefined') {
    return
  }

  const visualizer = Visualizer.getInstance()
  const visualizerCanvas = visualizer.getCanvasElement()
  if (!visualizerCanvas) {
    console.error('Visualizer canvas unavailable. Cannot show persistent UI.')
    return
  }

  if (isDialogVisible && audioBlockedDialog && audioBlockedDialog.contains(visualizerCanvas)) {
    visualizer.notifyUnmounted()
    visualizerCanvasContainer?.removeChild(visualizerCanvas)
  }

  persistentContainer = document.createElement('div')
  persistentContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(30, 30, 40, 0.8);
    border-radius: 50%;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    width: ${visualizerCanvas.width}px;
    height: ${visualizerCanvas.height}px;
    transition: transform 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease;
    cursor: pointer;
    opacity: 0.8;
    transform: scale(1);
  `

  persistentContainer.appendChild(visualizerCanvas)
  document.body.appendChild(persistentContainer)
  visualizer.notifyMounted()
  isPersistentVisible = true
}

export function hidePersistentVisualizer(): void {
  if (!isPersistentVisible || !persistentContainer) {
    return
  }

  const visualizer = Visualizer.getInstance()
  const canvas = visualizer.getCanvasElement()

  if (canvas && persistentContainer.contains(canvas)) {
    visualizer.notifyUnmounted()
  }

  if (persistentContainer.parentNode) {
    persistentContainer.parentNode.removeChild(persistentContainer)
  }

  persistentContainer = null
  isPersistentVisible = false
}
