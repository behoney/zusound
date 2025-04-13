import React from 'react'
import { Link } from './router'

interface ExampleLink {
  id: string
  title: string
  description: string
  path: string
  image?: string
}

const exampleLinks: ExampleLink[] = [
  {
    id: 'basic',
    title: 'Basic Usage',
    description:
      'Demonstrates fundamental integration with two simple stores, showcasing sound feedback for various data types (number, string, boolean, object property addition). Includes source code viewer.',
    path: '/basic',
    image: `${import.meta.env.BASE_URL}examples/assets/basic-usage.png`,
  },
  {
    id: 'todo',
    title: 'Todo App',
    description:
      'A more complex app with multiple stores (Todos, Filter, Input, Time). Shows sounds for array operations (add, toggle, delete), simple value changes (filter), and rapid updates (visual sort). Includes source code viewer.',
    path: '/todo',
    image: `${import.meta.env.BASE_URL}examples/assets/todo.png`,
  },
  {
    id: 'middlewares',
    title: 'Middleware Compatibility',
    description:
      'Shows how to correctly compose zusound with other common Zustand middlewares like immer, persist, and devtools. Includes source code viewer.',
    path: '/middlewares',
    image: `${import.meta.env.BASE_URL}examples/assets/middlewares.png`,
  },
  {
    id: 'visualizer',
    title: 'Visualizer',
    description:
      'Demonstrates the WebGL-based visualizer component that provides visual feedback for sonification events. See real-time 3D animations that represent different sound characteristics.',
    path: '/visualizer',
    image: `${import.meta.env.BASE_URL}examples/assets/visualizer.png`,
  },
]

function ExampleCard({ example }: { example: ExampleLink }) {
  return (
    <Link to={example.path} className="group block h-full">
      <div className="card flex flex-col h-full transition-all duration-200 ease-in-out group-hover:shadow-lg group-hover:-translate-y-1">
        <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
          {example.image ? (
            <img
              src={example.image}
              alt={example.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="text-6xl text-gray-300">🔊</div>
          )}
        </div>
        <div className="p-5 flex-grow">
          <h2 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600">
            {example.title}
          </h2>
          <p className="text-sm text-gray-600">{example.description}</p>
        </div>
      </div>
    </Link>
  )
}

export function ExampleIndex() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <header className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl border-none pb-0 mb-2">
          🔊 zusound Examples
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Explore working examples of zusound, a sonification middleware for Zustand. Each example
          includes interactive demos and viewable source code.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {exampleLinks.map(example => (
          <ExampleCard key={example.id} example={example} />
        ))}
      </div>

      <footer className="mt-12 text-center text-gray-500 text-sm">
        <div className="flex flex-col items-center space-y-3">
          <p className="text-base">Enjoying zusound? Support the project by giving it a star!</p>
          <a
            href="https://github.com/behoney/zusound"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-md hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Star on GitHub
          </a>
          <p className="text-xs text-gray-500 mt-1">
            Your support helps us improve zusound and build more features!
          </p>
        </div>
      </footer>
    </div>
  )
}
