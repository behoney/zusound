# ZuSound Visualizer

A WebGL-based visualizer providing feedback for sonification events within the ZuSound system.

**Note:** This visualizer is **no longer exposed as a standalone React component**. Instead, it is integrated **internally** into the dialog that appears when browser autoplay policies block audio playback, specifically when the `persistVisualizer: true` option is used in the `zusound` middleware.

## Features

- 64x64 pixel WebGL visualizer embedded within the autoplay warning dialog.
- Automatically listens for sonification events via a decoupled event system (`zusound` CustomEvent on `window`).
- Visualizes different sound types (sine, square, sawtooth, triangle) with distinct colors.
- Shows frequency, magnitude, and sound characteristics through visual effects (rings, ripples).
- Provides visual feedback **inside the dialog** even when audio is initially disabled by the browser.
- Activated via the `persistVisualizer: true` middleware option. There is no separate `<VisualizerReact>` component to import or render.

## Handling Browser Autoplay Policies

Browser autoplay policies often prevent audio from playing before user interaction. ZuSound handles this:

1.  **Console Warnings**: By default (without `persistVisualizer: true`), if audio context resumption fails, a warning is logged to the console.
2.  **Integrated Dialog and Visualizer (`persistVisualizer: true`)**: When this option is enabled:
    - If audio context resumption fails (usually on first interaction after page load), a dialog appears automatically.
    - This dialog explains the situation, provides a button to enable audio, and **contains the embedded WebGL visualizer**.
    - The visualizer provides feedback for the sound events that couldn't be played audibly.
    - The dialog persists until the user enables audio (via the button or interacting elsewhere on the page) or manually closes it.

### Enabling the Visualizer Dialog

Set the `persistVisualizer` option to `true` when creating your Zustand store with the `zusound` middleware:

```javascript
import { create } from 'zustand'
import { zusound } from 'zusound' // Assuming zusound is your package entry point

const useStore = create()(
  zusound(
    set => ({
      // Your store state and methods
      count: 0,
      increment: () => set(state => ({ count: state.count + 1 })),
    }),
    {
      // Enable the integrated autoplay dialog which includes the visualizer
      persistVisualizer: true,
    }
  )
)
```
