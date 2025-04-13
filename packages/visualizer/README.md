# ZuSound Visualizer

A WebGL-based visualizer for sonification events. This visualizer provides visual feedback for sound events in the ZuSound system.

## Features

- 64x64 pixel WebGL visualizer that can be placed anywhere in the UI
- Automatically listens for sonification events via a decoupled event system
- Visualizes different sound types (sine, square, sawtooth, triangle) with distinct colors
- Shows frequency, magnitude, and sound characteristics through visual effects
- Works even when audio is disabled (browser autoplay policy)
- Optional dialog for handling browser autoplay restrictions

## Handling Browser Autoplay Policies

Browser autoplay policies often prevent audio from playing before user interaction. ZuSound handles this in two ways:

1. **Always-on visualization**: The visualizer always displays sound events, even when audio is blocked
2. **Optional dialog with `persistVisualizer`**: Enable a dialog that explains the situation to users

### Using the `persistVisualizer` Option

Set the `persistVisualizer` option to `true` when creating your Zustand store:

```javascript
import { create } from 'zustand'
import { zusound } from 'zusound'

const useStore = create()(
  zusound(
    (set) => ({
      // Your store state and methods
    }),
    {
      persistVisualizer: true // Enable autoplay dialog
    }
  )
)
```

This enables:
- A dialog appearing when audio playback is blocked
- Instructions for users to enable audio
- Automatic audio resumption when users interact with the page
- Continuous visualization even when audio remains blocked

## Decoupled Event Architecture

The visualizer uses a decoupled event architecture, meaning:

1. The sonification module dispatches `zusound` CustomEvents without direct dependencies on the visualizer
2. The visualizer listens for these events without directly depending on the sonification implementation
3. This enables flexible integration and custom implementations

## Usage

### React Component

The simplest way to use the visualizer is with the React component:

```jsx
import { VisualizerReact } from '@zusound/visualizer';

function App() {
  return (
    <div>
      {/* Your app content */}
      
      {/* ZuSound Visualizer (top-right corner by default) */}
      <VisualizerReact />
    </div>
  );
}
```

You can customize the position:

```jsx
<VisualizerReact position="bottom-left" />
```

Available positions: `top-right`, `top-left`, `bottom-right`, `bottom-left`, `center`

### Vanilla JavaScript

You can also use the visualizer with vanilla JavaScript:

```js
import { initializeVisualizer } from '@zusound/visualizer';

// Initialize and mount the visualizer
const cleanup = initializeVisualizer();

// Later when needed, unmount the visualizer
cleanup();
```

### Custom Container

You can mount the visualizer in a specific container:

```js
const container = document.getElementById('visualizer-container');
const cleanup = initializeVisualizer(container);
``` 