# ✨ zusound: Hear Your State Changes! ✨

[![npm version](https://img.shields.io/npm/v/zusound?style=flat-square)](https://www.npmjs.com/package/zusound)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![GitHub Pages Deploy](https://img.shields.io/github/deployments/behoney/zusound/github-pages?label=Examples%20Deploy&style=flat-square&logo=github)](https://behoney.github.io/zusound/)

🚀 [Live Examples](https://behoney.github.io/zusound/) & [Demo](https://stackblitz.com/edit/zusound-example?file=src%2FCounter.tsx) are available!

zusound is a lightweight [Zustand](https://github.com/pmndrs/zustand) middleware that transforms state changes into sound. It provides real-time, sonic feedback for your app's state transitions, making debugging and development more intuitive and fun.

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

## 📖 Quick Usage

### Basic Example

```typescript
import { create } from 'zustand'
import { zusound } from 'zusound'

const useStore = create<{ count: number; inc: () => void }>()(
  zusound(set => ({
    count: 0,
    inc: () => set(state => ({ count: state.count + 1 })),
  }), { enabled: true })
)
```

### With Other Middlewares (TypeScript Safe)

**Best Practice:**
- Use `zusound` as the **outermost** middleware when composing with others (like `persist`, `devtools`, `immer`).
- This ensures type safety and avoids TypeScript mutator errors.

```typescript
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { zusound } from 'zusound'

interface TodoStoreType {
  todos: { id: number; title: string; completed: boolean }[]
  addTodo: (todo: { id: number; title: string; completed: boolean }) => void
  removeTodo: (todoId: number) => void
  todoStatus: (todoId: number) => void
}

const useTodoStore = create<TodoStoreType>()(
  zusound(
    devtools(
      persist(
        set => ({
          todos: [],
          addTodo: todo => set(state => ({ todos: [todo, ...state.todos] })),
          removeTodo: todoId => set(state => ({ todos: state.todos.filter(t => t.id !== todoId) })),
          todoStatus: todoId => set(state => ({
            todos: state.todos.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t)
          })),
        }),
        { name: 'todos' }
      ),
      { name: 'TodoStoreDevtools' }
    ),
    { enabled: true }
  )
)
```

## 🧑‍💻 API

### `zusound(initializer, options?)`
- **initializer**: Your Zustand state creator function (with or without other middlewares).
- **options**: `{ enabled?: boolean }` (default: `false`). Set to `true` to enable sound in production.

**Returns:** A Zustand-compatible middleware. Use as the outermost middleware for best TypeScript compatibility.

## ⚡️ TypeScript Compatibility & Troubleshooting

- **Type Safety:** zusound is designed to be type-safe and compatible with all Zustand middleware patterns.
- **Middleware Order:** Always use zusound as the outermost middleware. This avoids TypeScript errors like:
  > Argument of type 'StateCreator<...>' is not assignable to parameter of type 'StateCreator<...>'
- **No `any` Leaks:** zusound does not use `any` in its public API. If you see type errors, check your middleware order.
- **Custom Middleware:** zusound works with custom and third-party middlewares as long as it is the outermost wrapper.

## 💡 Concepts

- **Intercepting:** Listens to state changes via Zustand middleware
- **Diffing:** Calculates the difference between previous and next state
- **Sonifying:** Translates that difference into sound using the Web Audio API

## 🗺️ Project Status

- Intercepts state changes with Zustand middleware
- Performs shallow diffing on state changes
- Basic sonification (sound generation) based on state changes

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📜 License

This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgements

zusound is inspired by the excellent [Zustand](https://github.com/pmndrs/zustand).
