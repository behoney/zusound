import React from 'react'
import { Link, useRouter } from './router'

export function Header() {
  const { currentPath } = useRouter()
  // Adjust for potential base path in GitHub Pages
  const isHomePage = currentPath === '/' || currentPath === (import.meta.env.BASE_URL || '/')

  return (
    <header className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Title */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center text-gray-800 hover:text-gray-900">
              <span role="img" aria-label="Sound" className="mr-2 text-2xl">
                🔊
              </span>
              <span className="text-xl font-bold">zusound</span>
            </Link>
          </div>

          {/* Back Link */}
          <div className="flex items-center">
            {!isHomePage && (
              <Link to="/" className="btn-link text-sm flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Examples
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}