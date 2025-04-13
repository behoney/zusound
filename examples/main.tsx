import React from 'react'
import { createRoot } from 'react-dom/client'
import { TodoApp } from './todo-app/Todo'
import BasicUsage from './basic-usage/BasicUsage'
import { ExampleIndex } from './ExampleIndex'
import { RouterProvider, Routes, Route } from './router'
import { Header } from './Header'
import Middlewares from './middlewares/Middlewares'

// Create App container component with the header and main content area
function App() {
  return (
    <RouterProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        {/* Main content area where routes are rendered */}
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<ExampleIndex />} />
            <Route path="/basic" element={<BasicUsage />} />
            <Route path="/todo" element={<TodoApp />} />
            <Route path="/middlewares" element={<Middlewares />} />
          </Routes>
        </main>
      </div>
    </RouterProvider>
  )
}

// Mount the app
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} else {
  console.error("Root element with id 'root' not found.")
}