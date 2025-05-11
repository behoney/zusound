# ✨ zusound: Hear Your State Changes! ✨

[![Version](https://img.shields.io/badge/version-0.1.4-blue.svg)](https://github.com/behoney/zusound) <!-- Placeholder: update when published -->
[![npm version](https://img.shields.io/npm/v/zusound?style=flat-square)](https://www.npmjs.com/package/zusound)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![GitHub Pages Deploy](https://img.shields.io/github/deployments/behoney/zusound/github-pages?label=Examples%20Deploy&style=flat-square&logo=github)](https://behoney.github.io/zusound/)

🚀 [Live Examples](https://behoney.github.io/zusound/) & [Demo](https://stackblitz.com/edit/zusound-example?file=src%2FCounter.tsx) are available!

Ever wondered what your application's state _sounds_ like? zusound is a lightweight Zustand middleware that transforms state changes into an auditory experience. Get real-time, sonic feedback on how your application behaves, making debugging more intuitive and maybe even... fun?

Built with the Web Audio API, zusound analyzes state transitions and generates corresponding sounds, offering a novel way to understand data flow.

## 🤔 Why?

- **Intuitive Debugging:** Gain a different perspective on state updates. Hear subtle changes or complex transitions instantly.
- **Engaging Development:** Add a bit of auditory flair to your workflow. "Delightful" sounds for minor updates, distinct "alerts" for significant changes.

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

```typescript
import { create } from 'zustand'
import { zusound } from 'zusound'

// Create a store with zusound middleware
const useStore = create<RandomType>()(
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

## 💡 Core Concepts

zusound v0.1 implements these core functionalities:

1. **Intercepting:** Listens to state changes via Zustand middleware (`packages/core/middleware.ts`)
2. **Diffing:** Calculates the difference between previous and next state using shallow comparison (`packages/diff/diff.ts`)
3. **Sonifying:** Translates that difference into sound using the Web Audio API (`packages/sonification/sonification.ts`)

## 🎯 Use Cases (Planned)

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