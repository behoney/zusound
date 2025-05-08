# Contributing to zusound

Thank you for your interest in contributing to zusound! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Please help keep this project open and inclusive by respecting all contributors, regardless of background or experience level.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

- A clear, descriptive title
- A detailed description of the bug
- Steps to reproduce the issue
- Expected vs. actual behavior
- Screenshots if applicable
- Environment information (browser, OS, etc.)

### Suggesting Features

Feature suggestions are welcome! Please create an issue with:

- A clear, descriptive title
- Detailed description of the proposed feature
- Any relevant examples or mockups
- Explanation of why this feature would be valuable

### Pull Requests

1. Fork the repository
2. Create a new branch for your feature (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add or update tests as necessary
5. Run tests to ensure everything passes
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to your branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Pull Request Guidelines

- Follow the existing code style
- Include tests for new features
- Update documentation as needed
- Keep PRs focused - one feature or bug fix per PR when possible
- Link any relevant issues in the PR description

## Development Setup

```bash
# Clone your fork
git clone https://github.com/behoney/zusound.git
cd zusound

# Install dependencies
bun install

# Run tests
bun test

# Build the project
bun run build
```

## Project Structure

zusound is organized as a monorepo with the following structure:

```
zusound/
├── packages/              # Monorepo packages
│   ├── core/              # Core middleware functionality
│   ├── diff/              # State diffing implementation
│   ├── sonification/      # Sound generation logic
│   ├── middleware/        # Middleware implementation
├── examples/              # Example applications
├── .devcontainer/         # Development container configuration
└── README.md              # Project documentation
```

## Testing

zusound uses [Vitest](https://vitest.dev/) for unit testing. To run the tests:

```bash
# Run all tests
bun run test

# Run tests in watch mode during development
bun run test:watch

# Run tests with coverage report
bun run test:coverage
```

### Writing Tests

When contributing to zusound, please include tests for your changes:

1. **Unit Tests**: Place test files in the `__tests__` directory next to the module being tested
2. **Naming Convention**: Use `.test.ts` suffix for test files
3. **Mock Web Audio API**: Since we use the Web Audio API, mock it appropriately in tests

Example test structure:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { yourFunction } from '../your-module'

describe('your-module', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test'

    // Act
    const result = yourFunction(input)

    // Assert
    expect(result).toBe(expectedValue)
  })
})
```

For components that use the Web Audio API, use Vitest's mocking capabilities:

```typescript
// Mock AudioContext
vi.mock(
  'global',
  () => ({
    AudioContext: vi.fn(() => ({
      // Your mocked methods and properties
      close: vi.fn().mockResolvedValue(undefined),
    })),
  }),
  { virtual: true }
)
```

## Coding Standards

- Use TypeScript for type safety
- Follow existing formatting patterns
- Comment your code where necessary
- Use descriptive variable and function names

## Development Container

zusound provides a dev container configuration in the `.devcontainer` directory for consistent development environments. To use it:

1. Install [VS Code](https://code.visualstudio.com) and the [Remote - Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension
2. Open the project in VS Code
3. When prompted, click "Reopen in Container" or use the command palette (`F1`) and select "Remote-Containers: Reopen in Container"

## License

By contributing to zusound, you agree that your contributions will be licensed under the project's MIT License.

## ⚙️ Developer Notes: How zusound Works: Core Components

zusound operates through a pipeline of distinct components, each with a specific role in transforming state changes into sound and visuals. Here's a breakdown:

1.  **Middleware (`zusound`)**

    - **File:** `packages/middleware/zusound.ts`
    - **Interface:** `zusound(initializer: StateCreator, options?: ZusoundOptions) => StateCreator`
    - **Functionality:**
      - Integrates with your Zustand store.
      - Subscribes to state changes.
      - When a change occurs, it passes the `currentState` and `prevState` to the `Core Logic` component.

2.  **Core Logic (`coreImpl`)**

    - **File:** `packages/core/index.ts`
    - **Interface:** `coreImpl(currentState, prevState, options) => void`
    - **Functionality:**
      - Iterates over the properties of the state.
      - For each property that has changed:
        1.  Calls the `Diff Engine` to calculate a `DiffChunk`.
        2.  Dispatches a `__ZUSOUND_DIFF_CHUNK__` CustomEvent containing the `DiffChunk`. This event (defined in `packages/shared-types/diff-chunk.ts`) can be used by external tools for advanced logging or custom visualizations.
        3.  Invokes the `Sonification Engine`'s `sonifyChanges` function with the `DiffChunk` to generate and play sound. This process also leads to the dispatch of a `__ZUSOUND_SONIC_CHUNK__` event (see Sonification Engine below).
        4.  The `Core Logic` component also _directly_ converts the `DiffChunk` to a `SonicChunk` instance and dispatches another `__ZUSOUND_SONIC_CHUNK__` CustomEvent.

3.  **Diff Engine (`diff`)**

    - **File:** `packages/diff/diff.ts`
    - **Interface:** `diff(path: string, nextState: T, prevState: T) => DiffChunk`
    - **Functionality:**
      - Receives the path (key) of the changed state property, along with its previous and next values.
      - Computes the difference and characteristics of the change.
      - **Output (`DiffChunk`):** An object describing the change, as defined in `packages/shared-types/diff-chunk.ts`. Example structure:
        ```typescript
        // Example DiffChunk structure
        // From: packages/shared-types/diff-chunk.ts
        type DiffChunk = {
          id: string // Stringified next value for identity/debugging
          path: string // Key/path of changed state
          type: 'add' | 'remove' | 'change' // Based on diffPower
          valueType: 'number' | 'string' | 'boolean' | 'object' | 'array' | 'unknown' // Type of the changed value
          diff: string // Stringified diff metric (e.g., Levenshtein distance or length)
          diffPower: number // Algorithm-determined value indicating magnitude/direction of change
        }
        ```

4.  **Sonification Engine**

    - **Files:** `packages/sonification/sonification.ts`, `packages/shared-types/sonic-chunk.ts`
    - **Key Functions & Workflow:**
      - `sonifyChanges(diffChunk: DiffChunk, duration: number): void`:
        1.  Calls `diffToSonic(diffChunk, duration)` to convert the `DiffChunk` into sound parameters (`SonicChunk`).
        2.  Schedules `playSonicChunk(sonicChunk)` for execution.
      - `diffToSonic(diffChunk: DiffChunk, duration: number): SonicChunk`:
        - Translates properties of a `DiffChunk` (like `type`, `valueType`, `diffPower`) into acoustic parameters.
        - **Output (`SonicChunk`):** An object defining the sound to be played, as defined in `packages/shared-types/sonic-chunk.ts`. Example structure:
          ```typescript
          // Example SonicChunk structure
          // From: packages/shared-types/sonic-chunk.ts
          type SonicChunk = {
            id: string // Unique ID, usually the changed state's key path
            type: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'custom' // Waveform type
            frequency: number // Base frequency in Hz
            magnitude: number // Volume (0-1)
            duration: number // Duration in ms
            detune: number // Pitch adjustment in cents
          }
          ```
      - `playSonicChunk(sonicChunk: SonicChunk): Promise<boolean>`:
        1.  Dispatches a `__ZUSOUND_SONIC_CHUNK__` CustomEvent (defined in `packages/shared-types/sonic-chunk.ts`) containing the `SonicChunk`. This event is crucial for the `Visualizer`.
        2.  Uses the Web Audio API to synthesize and play the sound described by the `SonicChunk`.

5.  **Visualizer** (WIP)
    - **Files:** `packages/visualizer/index.ts`, `packages/visualizer/src/visualizer-core.ts`
    - **Functionality:**
      - Provides an optional visual feedback mechanism for the generated sounds.
      - Listens for `__ZUSOUND_SONIC_CHUNK__` CustomEvents dispatched by the Sonification Engine (and also directly by the Core Logic).
      - When an event is caught, the `SonicChunk` data (from `event.detail.chunk`) is used to render a visual effect (e.g., an expanding ring, color changes) on a canvas element using WebGL.
      - The visualizer UI (a small, circular canvas) can be shown persistently or within a dialog if audio playback is initially blocked by browser autoplay policies. Helper functions like `showPersistentVisualizer()` control its visibility.
