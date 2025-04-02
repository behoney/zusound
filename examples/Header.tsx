import React from 'react'
import { Link, useRouter } from './router'

export function Header() {
  const { currentPath } = useRouter()
  const isHomePage = currentPath === '/'

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 20px',
        borderBottom: '1px solid #eee',
        marginBottom: '20px',
        backgroundColor: '#f8f9fa',
      }}
    >
      <div style={{ marginRight: 'auto' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 700,
          }}
        >
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: '#333',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span role="img" aria-label="Sound" style={{ marginRight: '8px' }}>
              🔊
            </span>
            zusound
          </Link>
        </h1>
      </div>

      {!isHomePage && (
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.9rem',
          }}
        >
          <span style={{ marginRight: '4px' }}>←</span>
          Back to Examples
        </Link>
      )}
    </header>
  )
}
