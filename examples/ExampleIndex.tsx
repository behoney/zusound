import React, { useState } from 'react'
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
    description: 'Simple example demonstrating how to integrate zusound with Zustand stores.',
    path: '/basic',
    image: `${import.meta.env.BASE_URL || '/'}screenshots/basic-usage.png`,
  },
  {
    id: 'todo',
    title: 'Todo App',
    description: 'A more complex example with a todo application and multiple state changes.',
    path: '/todo',
    image: `${import.meta.env.BASE_URL || '/'}screenshots/todo-app.png`,
  },
  {
    id: 'middlewares',
    title: 'Middlewares',
    description: 'Examples of using zusound with different Zustand middlewares like immer, persist, devtools.',
    path: '/middlewares',
    image: `${import.meta.env.BASE_URL || '/'}screenshots/middlewares.png`,
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
          Explore working examples of zusound, a sonification middleware for Zustand.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {exampleLinks.map(example => (
          <ExampleCard key={example.id} example={example} />
        ))}
      </div>

      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>
          <a
            href="https://github.com/behoney/zusound"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            View on GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}