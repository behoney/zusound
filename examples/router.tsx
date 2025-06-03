import React from 'react'
import {
  BrowserRouter,
  Routes as RouterRoutes,
  Route as RouterRoute,
  Link as RouterLink,
  useNavigate,
  useLocation,
  Navigate,
  RouteProps,
} from 'react-router-dom'
import MiddlewareExample from './middlewares/middlewares-example'
import VisualizerExample from './visualizer-example/visualizer-example'
import AnomalyDetectionExample from './anomaly-detection/anomaly-detection-example'
import BasicExample from './basic-example/basic-example'
import { TodoApp } from './todo-app/todo-example'

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

// Define the routes array for use in App.tsx or a similar top-level component
export type AppRouteObject = Pick<RouteProps, 'path' | 'element'> & {
  handle?: { title: string }
}

export const appRoutes: AppRouteObject[] = [
  {
    path: '/',
    element: <Navigate to="/basic" />
  },
  {
    path: '/basic',
    element: <BasicExample />,
    handle: { title: 'Basic Example' }
  },
  {
    path: '/todo',
    element: <TodoApp />,
    handle: { title: 'Todo App' }
  },
  {
    path: '/middlewares',
    element: <MiddlewareExample />,
    handle: { title: 'Middlewares' }
  },
  {
    path: '/visualizer',
    element: <VisualizerExample />,
    handle: { title: 'Visualizer' }
  },
  {
    path: '/anomaly-detection',
    element: <AnomalyDetectionExample />,
    handle: { title: 'Anomaly Detection' }
  }
]
