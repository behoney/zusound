import React from 'react'
import { Link, useRouter } from './router'

export function Header() {
  const { currentPath } = useRouter()
  // Adjust for potential base path in GitHub Pages
  const isHomePage = currentPath === '/' || currentPath === (import.meta.env.BASE_URL || '/')
  // Also hide the back link on features and about pages
  const hideBackLink = isHomePage || currentPath === '/features' || currentPath === '/about'

  return (
    <header className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18 py-2">
          {/* Logo/Title */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center text-white group transition-all duration-300">
              <div className="mr-3 rounded-full bg-white bg-opacity-20 p-2 backdrop-blur-sm group-hover:bg-opacity-30 transition-all">
                <span role="img" aria-label="Sound" className="text-2xl">
                  🔊
                </span>
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-white">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">
                  zu
                </span>
                sound
              </span>
            </Link>
          </div>

          {/* Navigation Links - Added a simple nav menu */}
          <div className="hidden md:flex space-x-8">
            {/* TODO: Add features and about pages */}
            {/* <Link to="/" className="text-white/80 hover:text-white font-medium transition-colors">
              Home
            </Link> */}
            {/* <Link to="/features" className="text-white/80 hover:text-white font-medium transition-colors">
              Features
            </Link>
            <Link to="/about" className="text-white/80 hover:text-white font-medium transition-colors">
              About
            </Link> */}
          </div>

          {/* Back Link */}
          <div className="flex items-center">
            {!hideBackLink && (
              <Link
                to="/"
                className="flex items-center bg-white/10 hover:bg-white/20 text-white rounded-full py-2 px-4 
                           backdrop-blur-sm transition-all duration-300 text-sm font-medium"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back to Examples
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
