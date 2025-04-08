import React from 'react'
import { createRoot } from 'react-dom/client'
import { TodoApp } from './todo-app/Todo'
import BasicUsage from './basic-usage/BasicUsage'
import { ExampleIndex } from './ExampleIndex'
import { RouterProvider, Routes, Route } from './router'
import { Header } from './Header'
import Middlewares from './middlewares/Middlewares'

// Create App container component with the header
function App() {
  return (
    <RouterProvider>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          margin: 0,
        }}
      >
        <Header />
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
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
