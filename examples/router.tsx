import {
  BrowserRouter,
  Routes as RouterRoutes,
  Route as RouterRoute,
  Link as RouterLink,
  useNavigate,
  useLocation,
} from 'react-router-dom'
import React from 'react'

// Interface definitions for props
interface RouterProviderProps {
  children: React.ReactNode
}

interface LinkProps extends React.ComponentPropsWithoutRef<typeof RouterLink> {
  to: string
  children: React.ReactNode
}

// Re-export components with similar API for backward compatibility
export function RouterProvider({ children }: RouterProviderProps) {
  // Determine the base URL - for GitHub Pages deployment
  const baseUrl = import.meta.env.BASE_URL || '/'

  return <BrowserRouter basename={baseUrl}>{children}</BrowserRouter>
}

// Hook for accessing router functionality
export function useRouter() {
  const navigate = useNavigate()
  const location = useLocation()

  return {
    currentPath: location.pathname,
    navigate: (to: string) => navigate(to),
  }
}

// Link component with similar API
export function Link({ to, children, ...props }: LinkProps) {
  return (
    <RouterLink to={to} {...props}>
      {children}
    </RouterLink>
  )
}

// Route component with similar API - directly export React Router's Route
export const Route = RouterRoute

// Routes component - directly export React Router's Routes
export const Routes = RouterRoutes
