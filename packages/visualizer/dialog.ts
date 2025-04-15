// Define a minimal interface for the Visualizer to avoid circular imports
interface IVisualizer {
  initialize(): boolean
  getCanvasElement(): HTMLCanvasElement | null
  notifyMounted(): void
  notifyUnmounted(): void
}

// Export getVisualizer function to access the Visualizer singleton
// without direct import from index.ts
export function getVisualizer(): IVisualizer {
  // This will be defined in index.ts to avoid circular dependencies
  return globalThis.__VISUALIZER_SINGLETON__ as IVisualizer
}

let audioBlockedDialog: HTMLDialogElement | null = null
let visualizerCanvasContainer: HTMLDivElement | null = null
let isDialogVisible = false
const interactionListenerCleanup: (() => void) | null = null

// Persistent corner visualizer
let persistentContainer: HTMLDivElement | null = null
let isPersistentVisible = false

/** Style for the dialog */
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
    position: fixed; /* Use fixed position */
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%); /* Center on screen */
    `

/** Style for the close button */
const closeButtonStyle = `
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: rgba(255, 255, 255, 0.7);
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
    line-height: 1;
    `

/** Shows a persistent visualizer in the top-right corner of the screen */
export function showPersistentVisualizer(): void {
  if (isPersistentVisible || typeof document === 'undefined') {
    return // Don't create multiple instances
  }

  const visualizer = getVisualizer()
  if (!visualizer || !visualizer.initialize()) {
    console.error('Visualizer unavailable. Cannot show persistent UI.')
    return
  }

  const visualizerCanvas = visualizer.getCanvasElement()
  if (!visualizerCanvas) {
    console.error('Visualizer canvas unavailable. Cannot show persistent UI.')
    return
  }

  // Create floating container
  persistentContainer = document.createElement('div')
  persistentContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(30, 30, 40, 0.8);
    border-radius: 50%; /* Keep the round shape */
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    width: ${visualizerCanvas.width}px;
    height: ${visualizerCanvas.height}px;
    transition: transform 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease;
    cursor: pointer;
    opacity: 0.8;
    transform: scale(1);
  `

  // Add hover effect
  persistentContainer.addEventListener('mouseenter', () => {
    if (persistentContainer) {
      persistentContainer.style.transform = 'scale(1.1)'
      persistentContainer.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)'
      persistentContainer.style.opacity = '1'
    }
  })

  persistentContainer.addEventListener('mouseleave', () => {
    if (persistentContainer) {
      persistentContainer.style.transform = 'scale(1)'
      persistentContainer.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)'
      persistentContainer.style.opacity = '0.8'
    }
  })

  // Add canvas to container
  persistentContainer.appendChild(visualizerCanvas)
  document.body.appendChild(persistentContainer)
  visualizer.notifyMounted() // Tell visualizer its canvas is in the DOM
  isPersistentVisible = true
}

/** Hides and cleans up the persistent visualizer */
export function hidePersistentVisualizer(): void {
  if (!isPersistentVisible || !persistentContainer) {
    return
  }

  const visualizer = getVisualizer()
  const canvas = visualizer?.getCanvasElement() // Use optional chaining

  // Notify visualizer its canvas is being removed
  if (canvas && persistentContainer.contains(canvas)) {
    visualizer?.notifyUnmounted()
  }

  // Remove from DOM
  if (persistentContainer.parentNode) {
    persistentContainer.parentNode.removeChild(persistentContainer)
  }

  persistentContainer = null
  isPersistentVisible = false
}

/** Creates and shows the dialog explaining blocked audio and embedding the visualizer. */
export function showAudioBlockedDialog(): void {
  if (isDialogVisible || typeof document === 'undefined') {
    return // Don't show if already visible or not in browser
  }

  const visualizer = getVisualizer()
  // Ensure visualizer is ready before proceeding
  if (!visualizer.initialize()) {
    console.error('Visualizer failed to initialize. Cannot show dialog.')
    return
  }

  const visualizerCanvas = visualizer.getCanvasElement()
  if (!visualizerCanvas) {
    console.error('Visualizer canvas not available for dialog.')
    return
  }

  // If canvas is currently in the persistent container, remove it first
  if (
    isPersistentVisible &&
    persistentContainer &&
    persistentContainer.contains(visualizerCanvas)
  ) {
    visualizer.notifyUnmounted() // Tell visualizer its canvas is leaving the DOM
    persistentContainer.removeChild(visualizerCanvas)
  }

  // --- Create Dialog Element ---
  audioBlockedDialog = document.createElement('dialog')
  audioBlockedDialog.style.cssText = dialogStyle
  audioBlockedDialog.addEventListener('cancel', event => event.preventDefault()) // Prevent Esc close

  // --- Heading ---
  const heading = document.createElement('h3')
  heading.textContent = 'Audio Disabled'
  heading.style.cssText = 'margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #f87171;'
  audioBlockedDialog.appendChild(heading)

  // --- Visualizer Canvas Container ---
  visualizerCanvasContainer = document.createElement('div')
  visualizerCanvasContainer.style.cssText = `
    margin-bottom: 16px;
    height: ${visualizerCanvas.height}px;
    display: flex;
    justify-content: center;
    align-items: center;
  `
  // Style canvas for dialog context
  visualizerCanvas.style.margin = '0' // Ensure no extra margin inside container
  visualizerCanvas.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)' // Add shadow directly

  visualizerCanvasContainer.appendChild(visualizerCanvas)
  audioBlockedDialog.appendChild(visualizerCanvasContainer)
  visualizer.notifyMounted() // Tell visualizer it's in the DOM

  // --- Message ---
  const message = document.createElement('p')
  message.innerHTML =
    'Audio feedback is currently blocked by your browser. <br/> Click the button below or interact with the page to enable sound.'
  message.style.cssText = 'margin: 0 0 18px 0; font-size: 14px; line-height: 1.5;'
  audioBlockedDialog.appendChild(message)

  // --- Close Button ---
  const closeButton = document.createElement('button')
  closeButton.innerHTML = '&times;'
  closeButton.setAttribute('aria-label', 'Close dialog')
  closeButton.style.cssText = closeButtonStyle
  closeButton.addEventListener('mouseover', () => {
    closeButton.style.color = 'white'
    closeButton.style.background = 'rgba(255, 0, 0, 0.5)'
    closeButton.style.transform = 'scale(1.1)'
  })
  closeButton.addEventListener('mouseout', () => {
    closeButton.style.color = 'rgba(255, 255, 255, 0.7)'
    closeButton.style.background = 'rgba(255, 255, 255, 0.1)'
    closeButton.style.transform = 'scale(1.0)'
  })
  closeButton.addEventListener('click', () => {
    closeAudioBlockedDialog()
  })
  audioBlockedDialog.appendChild(closeButton)

  // --- Append and Show ---
  document.body.appendChild(audioBlockedDialog)
  audioBlockedDialog.showModal()
  isDialogVisible = true
}

/** Closes and cleans up the audio blocked dialog. */
export function closeAudioBlockedDialog(): void {
  if (!isDialogVisible || !audioBlockedDialog) {
    return
  }

  const visualizer = getVisualizer()
  const canvas = visualizer.getCanvasElement()

  // Notify visualizer its canvas is being removed from dialog
  if (canvas && audioBlockedDialog.contains(canvas)) {
    visualizer.notifyUnmounted()
  }

  if (audioBlockedDialog.open) {
    audioBlockedDialog.close()
  }
  if (audioBlockedDialog.parentNode) {
    audioBlockedDialog.parentNode.removeChild(audioBlockedDialog)
  }

  // Clean up document-level interaction listeners
  if (interactionListenerCleanup) {
    interactionListenerCleanup()
  }

  // If persistent visualizer was enabled, re-add canvas to it
  if (isPersistentVisible && canvas && persistentContainer) {
    persistentContainer.appendChild(canvas)
    visualizer.notifyMounted()
  }

  audioBlockedDialog = null
  visualizerCanvasContainer = null
  isDialogVisible = false
}
