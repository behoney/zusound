import React, { createContext, useContext, useState, useEffect } from 'react'

// Simple context for routing
interface RouterContextType {
  currentPath: string
  navigate: (to: string) => void
}

const RouterContext = createContext<RouterContextType>({
  currentPath: '/',
  navigate: () => {},
})

// Router provider component
interface RouterProviderProps {
  children: React.ReactNode
}

export function RouterProvider({ children }: RouterProviderProps) {
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/')

  // Update path when browser history changes
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  // Function to navigate to a new route
  const navigate = (to: string) => {
    window.history.pushState({}, '', to)
    setCurrentPath(to)
  }

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>{children}</RouterContext.Provider>
  )
}

// Hook to access router context
// eslint-disable-next-line react-refresh/only-export-components
export function useRouter() {
  return useContext(RouterContext)
}

// Link component
interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string
  children: React.ReactNode
}

export function Link({ to, children, ...props }: LinkProps) {
  const { navigate } = useRouter()

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    navigate(to)
  }

  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  )
}

// Route component
interface RouteProps {
  path: string
  element: React.ReactNode
}

export function Route({ path, element }: RouteProps) {
  const { currentPath } = useRouter()
  return currentPath === path ? <>{element}</> : null
}

// Routes component
interface RoutesProps {
  children: React.ReactNode
}

export function Routes({ children }: RoutesProps) {
  return <>{children}</>
}
