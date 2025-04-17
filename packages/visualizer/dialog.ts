import { Visualizer } from './src/visualizer-core' // Import the core class

// No longer need getVisualizer or __VISUALIZER_SINGLETON__

let audioBlockedDialog: HTMLDialogElement | null = null
let visualizerCanvasContainer: HTMLDivElement | null = null
let isDialogVisible = false
const interactionListenerCleanup: (() => void) | null = null // Keep this for dialog interactions

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
    return // Don't create multiple instances or run outside browser
  }

  // Get the singleton instance
  const visualizer = Visualizer.getInstance()

  // Ensure initialized and get canvas
  const visualizerCanvas = visualizer.getCanvasElement() // This implicitly initializes if needed
  if (!visualizerCanvas) {
    console.error('Visualizer canvas unavailable. Cannot show persistent UI.')
    return
  }

  // If canvas is currently in the dialog, remove it first
  if (isDialogVisible && audioBlockedDialog && audioBlockedDialog.contains(visualizerCanvas)) {
    visualizer.notifyUnmounted() // Tell visualizer its canvas is leaving the dialog
    visualizerCanvasContainer?.removeChild(visualizerCanvas)
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

  const visualizer = Visualizer.getInstance()
  const canvas = visualizer.getCanvasElement()

  // Notify visualizer its canvas is being removed
  if (canvas && persistentContainer.contains(canvas)) {
    visualizer.notifyUnmounted()
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

  const visualizer = Visualizer.getInstance()
  const visualizerCanvas = visualizer.getCanvasElement() // Ensures initialization

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
    visualizer.notifyUnmounted() // Tell visualizer its canvas is leaving the persistent container
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
    height: ${visualizerCanvas.height}px; /* Use canvas height */
    display: flex;
    justify-content: center;
    align-items: center;
  `
  visualizerCanvas.style.margin = '0 auto' // Center canvas horizontally
  visualizerCanvas.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)' // Add shadow directly

  visualizerCanvasContainer.appendChild(visualizerCanvas)
  audioBlockedDialog.appendChild(visualizerCanvasContainer)
  visualizer.notifyMounted() // Tell visualizer it's in the DOM (dialog)

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
    // Attempt to resume audio context on close click
    // Note: AudioContextManager handles the actual resume logic
    // This click provides the necessary user interaction.
    // We might want to import AudioContextManager here if we need direct interaction,
    // but often the act of clicking is enough for the browser policy.
    // Let's keep it simple for now.
    closeAudioBlockedDialog()
  })
  audioBlockedDialog.appendChild(closeButton)

  // --- Append and Show ---
  document.body.appendChild(audioBlockedDialog)
  try {
    audioBlockedDialog.showModal()
    isDialogVisible = true
  } catch (e) {
    console.error('Failed to show audio blocked dialog:', e)
    // Fallback or cleanup if showModal fails
    if (audioBlockedDialog.parentNode) {
      audioBlockedDialog.parentNode.removeChild(audioBlockedDialog)
    }
    audioBlockedDialog = null
    visualizerCanvasContainer = null
    // Ensure canvas is put back if removed
    if (
      isPersistentVisible &&
      canvas &&
      persistentContainer &&
      !persistentContainer.contains(canvas)
    ) {
      persistentContainer.appendChild(canvas)
      visualizer.notifyMounted()
    }
  }
}

/** Closes and cleans up the audio blocked dialog. */
export function closeAudioBlockedDialog(): void {
  if (!isDialogVisible || !audioBlockedDialog) {
    return
  }

  const visualizer = Visualizer.getInstance()
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

  // Clean up document-level interaction listeners if they were added
  if (interactionListenerCleanup) {
    interactionListenerCleanup()
    // interactionListenerCleanup = null; // Reset if needed
  }

  // If persistent visualizer was enabled, re-add canvas to its container
  // Check if persistentContainer still exists and canvas is valid
  if (isPersistentVisible && canvas && persistentContainer) {
    // Ensure canvas isn't already back in the persistent container
    if (!persistentContainer.contains(canvas)) {
      persistentContainer.appendChild(canvas)
      visualizer.notifyMounted() // Notify mounted in persistent container
    }
  } else if (canvas && !isPersistentVisible) {
    // If persistent wasn't the target, but the canvas exists,
    // it might need explicit cleanup or detachment?
    // Currently, we assume it either goes back to persistent or is implicitly handled.
  }

  audioBlockedDialog = null
  visualizerCanvasContainer = null
  isDialogVisible = false
}
