# ✨ zusound: Hear Your State Changes! ✨

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/behoney/zusound) <!-- Placeholder: update when published -->

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
      enabled: true,                // Enable/disable sounds (default: true in dev, auto-disabled in production)
      logDiffs: false,              // Log state diffs to console (default: false)
      allowInProduction: false,     // Allow zusound to work in production (default: false)
      name: 'CounterStore',         // Name for the store (optional)
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
      allowInProduction: true  // Force zusound to work even in production
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
