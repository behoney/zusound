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
    description: 'Simple example demonstrating how to integrate zusound with Zustand stores',
    path: '/basic',
    image: '/screenshots/basic-usage.png', // We'll create these screenshots later
  },
  {
    id: 'todo',
    title: 'Todo App',
    description: 'A more complex example with a todo application and multiple state changes',
    path: '/todo',
    image: '/screenshots/todo-app.png',
  },
  {
    id: 'middlewares',
    title: 'Middlewares',
    description: 'Examples of using zusound with different Zustand middlewares',
    path: '/middlewares',
    image: '/screenshots/middlewares.png',
  },
]

function ExampleCard({ example }: { example: ExampleLink }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Link
      key={example.id}
      to={example.path}
      style={{
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        style={{
          border: '1px solid #eee',
          borderRadius: '8px',
          overflow: 'hidden',
          transition: 'transform 0.2s, box-shadow 0.2s',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          transform: isHovered ? 'translateY(-5px)' : 'none',
          boxShadow: isHovered ? '0 10px 20px rgba(0,0,0,0.1)' : 'none',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          style={{
            height: '200px',
            backgroundColor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {example.image ? (
            <img
              src={example.image}
              alt={example.title}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ fontSize: '5rem', color: '#ddd' }}>🔊</div>
          )}
        </div>
        <div style={{ padding: '20px' }}>
          <h2 style={{ marginTop: '0', marginBottom: '10px' }}>{example.title}</h2>
          <p style={{ margin: '0', color: '#666' }}>{example.description}</p>
        </div>
      </div>
    </Link>
  )
}

export function ExampleIndex() {
  return (
    <div
      style={{
        fontFamily: 'sans-serif',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
      }}
    >
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>zusound Examples</h1>
        <p style={{ fontSize: '1.2rem', color: '#666' }}>
          Explore working examples of zusound, a sonification middleware for Zustand
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '20px',
        }}
      >
        {exampleLinks.map(example => (
          <ExampleCard key={example.id} example={example} />
        ))}
      </div>

      <footer style={{ marginTop: '40px', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
        <p>
          <a
            href="https://github.com/behoney/zusound"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0366d6', textDecoration: 'none' }}
          >
            View on GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}
