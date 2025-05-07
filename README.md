# ✨ zusound: Hear Your State Changes! ✨

[![Version](https://img.shields.io/badge/version-0.1.3-blue.svg)](https://github.com/behoney/zusound) <!-- Placeholder: update when published -->

Ever wondered what your application's state _sounds_ like? zusound is a lightweight Zustand middleware that transforms state changes into an auditory experience. Get real-time, sonic feedback on how your application behaves, making debugging more intuitive and maybe even... fun?

Built with the Web Audio API, zusound analyzes state transitions and generates corresponding sounds, offering a novel way to understand data flow.

## 🤔 Why?

- **Intuitive Debugging:** Gain a different perspective on state updates. Hear subtle changes or complex transitions instantly.
- **Engaging Development:** Add a bit of auditory flair to your workflow. "Delightful" sounds for minor updates, distinct "alerts" for significant changes.
- **Novelty:** Explore a unique approach to developer tooling.

## 🚀 Installation

```bash
# Using npm
npm install zusound

# Using yarn
yarn add zusound

# Using pnpm
pnpm add zusound

# Using bun
bun add zusound
```

### From Source

You can also install it directly from the repository:

```bash
# Using npm
npm install github:behoney/zusound

# Using yarn
yarn add github:behoney/zusound

# Using pnpm
pnpm add github:behoney/zusound
```

For development setup instructions, please see our [Contributing Guidelines](CONTRIBUTING.md).

## 📖 Usage

### Basic Usage

```javascript
import { create } from 'zustand'
import { zusound } from 'zusound'

// Create a store with zusound middleware
const useStore = create(
  zusound(set => ({
    count: 0,
    increment: () => set(state => ({ count: state.count + 1 })),
    decrement: () => set(state => ({ count: state.count - 1 })),
  }))
)

// Use the store normally - state changes will produce sounds
function Counter() {
  const { count, increment, decrement } = useStore()

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  )
}
```

### With Configuration

```javascript
import { create } from 'zustand'
import { zusound } from 'zusound'

// Create a store with zusound middleware and custom options
const useStore = create(
  zusound(
    set => ({
      count: 0,
      increment: () => set(state => ({ count: state.count + 1 })),
      decrement: () => set(state => ({ count: state.count - 1 })),
    }),
    {
      enabled: true, // Enable/disable sounds (default: true in dev, auto-disabled in production)
      logDiffs: false, // Log state diffs to console (default: false)
      allowInProduction: false, // Allow zusound to work in production (default: false)
      name: 'CounterStore', // Name for the store (optional)
    }
  )
)
```

### Production Usage

By default, zusound is disabled in production environments to avoid unnecessary overhead in your released application. This behavior ensures that your development tools don't affect end-user experience.

The middleware automatically detects production environments by checking:

- `process.env.NODE_ENV === 'production'` (Node.js / React)
- `import.meta.env.PROD === true` (Vite)

If you need to enable zusound in production (for example, in a demo app), you can set the `allowInProduction` option to `true`:

```javascript
const useStore = create(
  zusound(
    // Your store initializer...
    {
      allowInProduction: true, // Force zusound to work even in production
    }
  )
)
```

## 🔍 Example

Here's a complete example showing zusound in action:

```jsx
import React from 'react'
import { create } from 'zustand'
import { zusound } from 'zusound'

// Create store with zusound middleware
const useCounterStore = create(
  zusound(set => ({
    count: 0,
    increment: () => set(state => ({ count: state.count + 1 })),
    decrement: () => set(state => ({ count: state.count - 1 })),
    reset: () => set({ count: 0 }),
  }))
)

// Simple counter component
function Counter() {
  const { count, increment, decrement, reset } = useCounterStore()

  return (
    <div>
      <h1>Counter: {count}</h1>
      <div>
        <button onClick={increment}>+</button>
        <button onClick={decrement}>-</button>
        <button onClick={reset}>Reset</button>
      </div>
      <p>Listen for sounds as you interact with the counter!</p>
    </div>
  )
}

export default Counter
```

## 💡 Core Concepts

zusound v0.1 implements these core functionalities:

1. **Intercepting:** Listens to state changes via Zustand middleware (`packages/core/middleware.ts`)
2. **Diffing:** Calculates the difference between previous and next state using shallow comparison (`packages/diff/diff.ts`)
3. **Sonifying:** Translates that difference into sound using the Web Audio API (`packages/sonification/sonification.ts`)

**Current Capabilities (v0.1):**

- Basic sound feedback for state changes
- Shallow diffing to identify top-level state changes
- Web Audio API integration for sound generation
- Enable/disable sound option
- Optional diff logging

**Planned Future Features:**

- **Configurable Sounds:** Choose sound themes or "tuners". Customize sounds for different types of changes (additions, deletions, updates).
- **Alert System:** Define thresholds for significant changes to trigger distinct alert sounds.
- **Export & Share:** Generate shareable audio clips of your state transitions – show off your app's rhythm!

## 🗺️ Project Status

zusound is currently at version 0.1, which includes the basic functionality for:

- Intercepting state changes with Zustand middleware
- Performing simple diffing on state changes
- Basic sonification (sound generation) based on state changes

## 🤝 Contributing

Contributions to zusound are welcome! Please see our [Contributing Guidelines](CONTRIBUTING.md) for more information on how to get involved, including:

- Development setup
- Project structure
- Testing guidelines
- Coding standards
- Using the development container

### Build Process

zusound uses [tsup](https://github.com/egoist/tsup) for building the package. The build system simplifies bundling TypeScript code into various formats (ESM, CJS) with TypeScript declarations.

To build the package:

```bash
# Development build
bun run build

# Production build (sets NODE_ENV=production)
bun run build:prod
```

Generated output includes:

- ESM module format (for import): `dist/index.es.js`
- CommonJS format (for require): `dist/index.umd.js`
- TypeScript declarations: `dist/index.d.ts`

## 📜 License

This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgements

zusound is inspired by the excellent [Zustand](https://github.com/pmndrs/zustand) state management library.

## 🎯 Use Cases

### For Developers

- **Ambient Feedback**: Enjoy delightful ambient sounds that provide subtle feedback during normal state changes
- **Alert System**: Receive distinct audio alerts when significant state changes occur, helping you focus on important logic
- **Debugging Aid**: Understand your application's state flow through audio patterns without constantly checking console logs

### Sharing & Showcasing

- **Export Functionality**: Download your application's "state symphony" as audio files (MP3/WAV)
- **Sound Profiles**: Create and share custom sound profiles that represent your application's unique behavior
- **Community Gallery**: (Planned) Submit your most interesting state sound patterns to a community showcase

### Beyond Utility

- **Accessibility**: Add an audio dimension to your application that can benefit visually impaired users
- **Presentations**: Use generated sound patterns when demonstrating your application in talks or videos
- **Creative Coding**: Explore the intersection of state management and generative audio

---

## ⚙️ How zusound Works: Core Components

zusound operates through a pipeline of distinct components, each with a specific role in transforming state changes into sound and visuals. Here's a breakdown:

1.  **Middleware (`zusound`)**
    *   **File:** `packages/middleware/zusound.ts`
    *   **Interface:** `zusound(initializer: StateCreator, options?: ZusoundOptions) => StateCreator`
    *   **Functionality:**
        *   Integrates with your Zustand store.
        *   Subscribes to state changes.
        *   When a change occurs, it passes the `currentState` and `prevState` to the `Core Logic` component.

2.  **Core Logic (`coreImpl`)**
    *   **File:** `packages/core/index.ts`
    *   **Interface:** `coreImpl(currentState, prevState, options) => void`
    *   **Functionality:**
        *   Iterates over the properties of the state.
        *   For each property that has changed:
            1.  Calls the `Diff Engine` to calculate a `DiffChunk`.
            2.  Dispatches a `__ZUSOUND_DIFF_CHUNK__` CustomEvent containing the `DiffChunk`. This event (defined in `packages/shared-types/diff-chunk.ts`) can be used by external tools for advanced logging or custom visualizations.
            3.  Invokes the `Sonification Engine`'s `sonifyChanges` function with the `DiffChunk` to generate and play sound. This process also leads to the dispatch of a `__ZUSOUND_SONIC_CHUNK__` event (see Sonification Engine below).
            4.  The `Core Logic` component also *directly* converts the `DiffChunk` to a `SonicChunk` instance and dispatches another `__ZUSOUND_SONIC_CHUNK__` CustomEvent.
                *   *Note for v0.1.3:* This means the `__ZUSOUND_SONIC_CHUNK__` event is typically dispatched twice for each state change – once by the Sonification Engine during sound playback, and once directly by `coreImpl`. The Visualizer will react to both.

3.  **Diff Engine (`diff`)**
    *   **File:** `packages/diff/diff.ts`
    *   **Interface:** `diff(path: string, nextState: T, prevState: T) => DiffChunk`
    *   **Functionality:**
        *   Receives the path (key) of the changed state property, along with its previous and next values.
        *   Computes the difference and characteristics of the change.
        *   **Output (`DiffChunk`):** An object describing the change, as defined in `packages/shared-types/diff-chunk.ts`. Example structure:
            ```typescript
            // Example DiffChunk structure
            // From: packages/shared-types/diff-chunk.ts
            type DiffChunk = {
              id: string;          // Stringified next value for identity/debugging
              path: string;        // Key/path of changed state
              type: 'add' | 'remove' | 'change'; // Based on diffPower
              valueType: 'number' | 'string' | 'boolean' | 'object' | 'array' | 'unknown'; // Type of the changed value
              diff: string;        // Stringified diff metric (e.g., Levenshtein distance or length)
              diffPower: number;   // Algorithm-determined value indicating magnitude/direction of change
            };
            ```

4.  **Sonification Engine**
    *   **Files:** `packages/sonification/sonification.ts`, `packages/shared-types/sonic-chunk.ts`
    *   **Key Functions & Workflow:**
        *   `sonifyChanges(diffChunk: DiffChunk, duration: number): void`:
            1.  Calls `diffToSonic(diffChunk, duration)` to convert the `DiffChunk` into sound parameters (`SonicChunk`).
            2.  Schedules `playSonicChunk(sonicChunk)` for execution.
        *   `diffToSonic(diffChunk: DiffChunk, duration: number): SonicChunk`:
            *   Translates properties of a `DiffChunk` (like `type`, `valueType`, `diffPower`) into acoustic parameters.
            *   **Output (`SonicChunk`):** An object defining the sound to be played, as defined in `packages/shared-types/sonic-chunk.ts`. Example structure:
                ```typescript
                // Example SonicChunk structure
                // From: packages/shared-types/sonic-chunk.ts
                type SonicChunk = {
                  id: string;          // Unique ID, usually the changed state's key path
                  type: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'custom'; // Waveform type
                  frequency: number;   // Base frequency in Hz
                  magnitude: number;   // Volume (0-1)
                  duration: number;    // Duration in ms
                  detune: number;      // Pitch adjustment in cents
                };
                ```
        *   `playSonicChunk(sonicChunk: SonicChunk): Promise<boolean>`:
            1.  Dispatches a `__ZUSOUND_SONIC_CHUNK__` CustomEvent (defined in `packages/shared-types/sonic-chunk.ts`) containing the `SonicChunk`. This event is crucial for the `Visualizer`.
            2.  Uses the Web Audio API to synthesize and play the sound described by the `SonicChunk`.

5.  **Visualizer** (WIP)
    *   **Files:** `packages/visualizer/index.ts`, `packages/visualizer/src/visualizer-core.ts`
    *   **Functionality:**
        *   Provides an optional visual feedback mechanism for the generated sounds.
        *   Listens for `__ZUSOUND_SONIC_CHUNK__` CustomEvents dispatched by the Sonification Engine (and also directly by the Core Logic).
        *   When an event is caught, the `SonicChunk` data (from `event.detail.chunk`) is used to render a visual effect (e.g., an expanding ring, color changes) on a canvas element using WebGL.
        *   The visualizer UI (a small, circular canvas) can be shown persistently or within a dialog if audio playback is initially blocked by browser autoplay policies. Helper functions like `showPersistentVisualizer()` control its visibility.