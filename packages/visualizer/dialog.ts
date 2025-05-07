import { Visualizer } from './src/visualizer-core'

let audioBlockedDialog: HTMLDialogElement | null = null
let visualizerCanvasContainer: HTMLDivElement | null = null
let isDialogVisible = false

let persistentContainer: HTMLDivElement | null = null
let isPersistentVisible = false

const dialogStyle = `
    border: none;
    border-radius: 8px;
    padding: 20px;
    background: rgba(30, 30, 40, 0.95);
    color: white;
    backdrop-filter: blur(5px);
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.5);
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 320px;
    text-align: center;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    `

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

export function showAudioBlockedDialog(): void {
  if (isDialogVisible || typeof document === 'undefined') {
    return
  }

  const visualizer = Visualizer.getInstance()
  const visualizerCanvas = visualizer.getCanvasElement()

  if (!visualizerCanvas) {
    console.error('Visualizer canvas not available for dialog.')
    return
  }

  if (
    isPersistentVisible &&
    persistentContainer &&
    persistentContainer.contains(visualizerCanvas)
  ) {
    visualizer.notifyUnmounted()
    persistentContainer.removeChild(visualizerCanvas)
  }

  audioBlockedDialog = document.createElement('dialog')
  audioBlockedDialog.style.cssText = dialogStyle
  audioBlockedDialog.addEventListener('cancel', event => event.preventDefault())

  const heading = document.createElement('h3')
  heading.textContent = 'Audio Disabled'
  heading.style.cssText = 'margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #f87171;'
  audioBlockedDialog.appendChild(heading)

  visualizerCanvasContainer = document.createElement('div')
  visualizerCanvasContainer.style.cssText = `
    margin-bottom: 16px;
    height: ${visualizerCanvas.height}px;
    display: flex;
    justify-content: center;
    align-items: center;
  `
  visualizerCanvas.style.margin = '0 auto'
  visualizerCanvas.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)'

  visualizerCanvasContainer.appendChild(visualizerCanvas)
  audioBlockedDialog.appendChild(visualizerCanvasContainer)
  visualizer.notifyMounted()

  const message = document.createElement('p')
  message.innerHTML =
    'Audio feedback is currently blocked by your browser. <br/> Click the button below or interact with the page to enable sound.'
  message.style.cssText = 'margin: 0 0 18px 0; font-size: 14px; line-height: 1.5;'
  audioBlockedDialog.appendChild(message)

  document.body.appendChild(audioBlockedDialog)
  try {
    audioBlockedDialog.showModal()
    isDialogVisible = true
  } catch (e) {
    console.error('Failed to show audio blocked dialog:', e)
    if (audioBlockedDialog.parentNode) {
      audioBlockedDialog.parentNode.removeChild(audioBlockedDialog)
    }
    audioBlockedDialog = null
    visualizerCanvasContainer = null
    if (
      isPersistentVisible &&
      visualizerCanvas &&
      persistentContainer &&
      !persistentContainer.contains(visualizerCanvas)
    ) {
      persistentContainer.appendChild(visualizerCanvas)
      visualizer.notifyMounted()
    }
  }
}

export function closeAudioBlockedDialog(): void {
  const visualizer = Visualizer.getInstance()
  const canvas = visualizer.getCanvasElement()

  if (!isDialogVisible || !audioBlockedDialog) {
    return
  }

  if (canvas && audioBlockedDialog.contains(canvas)) {
    visualizer.notifyUnmounted()
  }

  if (audioBlockedDialog.open) {
    audioBlockedDialog.close()
  }
  if (audioBlockedDialog.parentNode) {
    audioBlockedDialog.parentNode.removeChild(audioBlockedDialog)
  }

  if (isPersistentVisible && canvas && persistentContainer) {
    if (!persistentContainer.contains(canvas)) {
      persistentContainer.appendChild(canvas)
      visualizer.notifyMounted()
    }
  }

  audioBlockedDialog = null
  visualizerCanvasContainer = null
  isDialogVisible = false
}
