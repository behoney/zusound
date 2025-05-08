import React from 'react'
import { createRoot } from 'react-dom/client'
import { TodoApp } from './todo-app/todo-example'
import BasicUsage from './basic-example/basic-example'
import { ExampleIndex } from './example-index'
import { RouterProvider, Routes, Route } from './router'
import { Header } from './header_'
import Middlewares from './middlewares/middlewares-example'
import VisualizerExample from './visualizer-example/visualizer-example'

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
            <Route path="/visualizer" element={<VisualizerExample />} />
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
