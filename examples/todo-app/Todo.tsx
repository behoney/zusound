import React, { useEffect } from 'react'
import { create } from 'zustand'
import { zusound } from '../../packages' // Adjust the import path if necessary
import { CodeViewer } from '../CodeViewer' // Import the CodeViewer
import todoSource from './Todo.tsx?raw' // Import raw source code

// --- Types ---
interface Todo {
  id: number
  text: string
  completed: boolean
}

type Filter = 'all' | 'active' | 'completed'
type SortOrder = 'none' | 'asc' | 'desc'

// --- Zustand Stores with zusound middleware ---

// Store for managing the list of todos
interface TodoState {
  todos: Todo[]
  addTodo: (text: string) => void
  toggleTodo: (id: number) => void
  deleteTodo: (id: number) => void
  sortOrder: SortOrder
  isSorting: boolean
  sortTodos: (order: 'asc' | 'desc') => Promise<void>
  stopSorting: () => void // Added function to explicitly stop sorting
}

const useTodoStore = create<TodoState>()(
  zusound(
    (set, get) => ({
      todos: [
        { id: Date.now() - 20000, text: 'Learn Zustand', completed: true },
        { id: Date.now() - 10000, text: 'Integrate zusound', completed: false },
        { id: Date.now(), text: 'Build awesome app', completed: false },
      ],
      sortOrder: 'none',
      isSorting: false,
      addTodo: text =>
        set(state => ({
          todos: [...state.todos, { id: Date.now(), text, completed: false }],
          sortOrder: 'none', // Reset sort order on add
        })),
      toggleTodo: id =>
        set(state => ({
          todos: state.todos.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
          ),
        })),
      deleteTodo: id =>
        set(state => ({
          todos: state.todos.filter(todo => todo.id !== id),
        })),
      stopSorting: () => set({ isSorting: false }), // Implementation to stop sorting
      sortTodos: async (order: 'asc' | 'desc') => {
        if (get().isSorting) return // Prevent multiple sorts at once
        set({ isSorting: true, sortOrder: order })
        const todosToSort = [...get().todos] // Get a mutable copy
        const n = todosToSort.length
        let swapped
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

        // Bubble Sort for visualization
        try {
          for (let i = 0; i < n - 1; i++) {
            if (!get().isSorting) break // Check if sorting was stopped
            swapped = false
            for (let j = 0; j < n - i - 1; j++) {
              if (!get().isSorting) break // Check again within inner loop
              const compareCondition =
                order === 'asc'
                  ? todosToSort[j].id > todosToSort[j + 1].id
                  : todosToSort[j].id < todosToSort[j + 1].id

              if (compareCondition) {
                ;[todosToSort[j], todosToSort[j + 1]] = [todosToSort[j + 1], todosToSort[j]]
                swapped = true
                set({ todos: [...todosToSort] }) // Update state visually
                await delay(50) // Slightly increased delay for visibility
              }
            }
            if (!swapped) break
          }
        } finally {
          // Ensure sorting flag is reset even if an error occurs (unlikely here)
          // or if sorting completes naturally or is stopped
          if (get().isSorting) {
            // Only set final state if sorting wasn't cancelled
            const finalSorted = [...get().todos].sort((a, b) => {
              if (order === 'asc') return a.id - b.id
              return b.id - a.id
            })
            set({ todos: finalSorted, isSorting: false, sortOrder: order })
          } else {
            // If stopped externally, just ensure flag is false
            // The state might be partially sorted, which is visually represented
            set({ isSorting: false })
          }
        }
      },
    }),
    { logDiffs: true }
  )
)

// Store for managing the current filter
interface FilterState {
  filter: Filter
  setFilter: (filter: Filter) => void
}

const useFilterStore = create<FilterState>()(
  zusound(set => ({
    filter: 'all',
    setFilter: filter => set({ filter }),
  }))
)

// Store for managing the input field state
interface InputState {
  inputValue: string
  setInputValue: (value: string) => void
}

const useInputStore = create<InputState>()(
  zusound(set => ({
    inputValue: '',
    setInputValue: value => set({ inputValue: value }),
  }))
)

// Store for managing the current time (Example of another unrelated store)
interface TimeState {
  currentTime: string
  setCurrentTime: (time: string) => void
}

const useTimeStore = create<TimeState>()(
  zusound(set => ({
    currentTime: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    setCurrentTime: time => set({ currentTime: time }),
  }))
)

// --- React Components ---

// Component to display the current time
function TimeDisplay() {
  const { currentTime, setCurrentTime } = useTimeStore()

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    }, 1000)
    return () => clearInterval(intervalId)
  }, [setCurrentTime])

  return (
    <div className="bg-gray-100 border border-gray-200 rounded-md px-3 py-2 text-gray-600 text-sm mb-4">
      Current Time: <strong className="font-mono">{currentTime}</strong> (This demonstrates an
      unrelated store update triggering its own sound.)
    </div>
  )
}

// Component for adding new todos
function AddTodoForm() {
  const { inputValue, setInputValue } = useInputStore()
  const addTodo = useTodoStore(state => state.addTodo)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    addTodo(inputValue)
    setInputValue('') // Clear input after adding
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-4">
      <input
        type="text"
        placeholder="What needs to be done?"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        className="form-input flex-grow"
      />
      <button type="submit" className="btn btn-primary flex-shrink-0">
        Add Todo
      </button>
    </form>
  )
}

// Component for displaying a single todo item
interface TodoItemProps {
  todo: Todo
}

function TodoItem({ todo }: TodoItemProps) {
  const { toggleTodo, deleteTodo } = useTodoStore()
  const creationTime = new Date(todo.id).toLocaleString([], {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  return (
    <li
      className={`flex items-center py-3 border-b border-gray-200 last:border-b-0 ${
        todo.completed ? 'opacity-60' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => toggleTodo(todo.id)}
        className="form-checkbox mr-3 flex-shrink-0"
        aria-label={`Mark ${todo.text} as ${todo.completed ? 'incomplete' : 'complete'}`}
      />
      <div className="flex-grow mr-3">
        <span className={todo.completed ? 'line-through' : ''}>{todo.text}</span>
        <div className="text-xs text-gray-500 mt-1">Created: {creationTime}</div>
      </div>
      <button
        onClick={() => deleteTodo(todo.id)}
        className="btn btn-danger p-1 h-6 w-6 text-xs flex-shrink-0" // Smaller, simpler delete
        aria-label={`Delete todo: ${todo.text}`}
      >
        &times;
      </button>
    </li>
  )
}

// Component for displaying the list of todos based on the filter
function TodoList() {
  const todos = useTodoStore(state => state.todos)
  const filter = useFilterStore(state => state.filter)
  const isSorting = useTodoStore(state => state.isSorting)

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true // 'all'
  })

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h2 className="card-title !mt-0">Tasks</h2> {/* Use !mt-0 to override default */}
        {isSorting && (
          <div className="text-sm text-blue-600 mb-2 animate-pulse">
            Sorting... (Notice the rapid sounds from frequent state updates)
          </div>
        )}
        {filteredTodos.length === 0 && !isSorting ? (
          <p className="text-gray-500">No tasks here. Add one above!</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {' '}
            {/* Add divider within ul */}
            {filteredTodos.map(todo => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// Component for filter and sort controls
function Controls() {
  const { filter, setFilter } = useFilterStore()
  const { sortTodos, isSorting, sortOrder, stopSorting } = useTodoStore() // Get stopSorting

  const handleFilterChange = (newFilter: Filter) => {
    setFilter(newFilter)
  }

  const handleSort = (order: 'asc' | 'desc') => {
    if (isSorting && sortOrder === order) {
      stopSorting() // Stop sorting if the same sort button is clicked again
    } else if (!isSorting) {
      sortTodos(order) // Start sorting if not already sorting
    }
    // Do nothing if sorting a different order
  }

  const getFilterButtonStyle = (controlFilter: Filter) =>
    `btn text-xs sm:text-sm ${
      filter === controlFilter ? 'btn-primary' : 'btn-outline hover:bg-gray-100'
    }`

  const getSortButtonStyle = (controlOrder: SortOrder) =>
    `btn text-xs sm:text-sm ${
      sortOrder === controlOrder && !isSorting
        ? 'btn-secondary' // Indicate active sort order when not currently sorting
        : 'btn-outline hover:bg-gray-100'
    } ${isSorting && sortOrder === controlOrder ? 'bg-yellow-200 text-yellow-800 border-yellow-300 animate-pulse' : ''}`

  return (
    <div className="card mb-6">
      {' '}
      {/* Added mb-6 for spacing */}
      <div className="card-body space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm mr-2">Show:</span>
          <button onClick={() => handleFilterChange('all')} className={getFilterButtonStyle('all')}>
            All
          </button>
          <button
            onClick={() => handleFilterChange('active')}
            className={getFilterButtonStyle('active')}
          >
            Active
          </button>
          <button
            onClick={() => handleFilterChange('completed')}
            className={getFilterButtonStyle('completed')}
          >
            Completed
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm mr-2">Sort By ID (Visual Sort):</span>
          <button
            onClick={() => handleSort('asc')}
            disabled={isSorting && sortOrder !== 'asc'} // Disable if sorting different order
            className={getSortButtonStyle('asc')}
          >
            Oldest First {isSorting && sortOrder === 'asc' ? '(Sorting...)' : ''}
          </button>
          <button
            onClick={() => handleSort('desc')}
            disabled={isSorting && sortOrder !== 'desc'} // Disable if sorting different order
            className={getSortButtonStyle('desc')}
          >
            Newest First {isSorting && sortOrder === 'desc' ? '(Sorting...)' : ''}
          </button>
          {isSorting && (
            <button
              onClick={stopSorting}
              className="btn btn-outline border-red-500 text-red-600 hover:bg-red-50 text-xs sm:text-sm"
            >
              Stop Sort
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Main App Component ---
export function TodoApp() {
  return (
    <div>
      <h1>Todo App Demo</h1>
      <p className="text-gray-600 mb-6">
        This example simulates a typical application structure with multiple Zustand stores (`Todo`,
        `Filter`, `Input`, `Time`) interacting. Listen for distinct sounds when adding, toggling,
        deleting todos (array modifications), changing filters (simple value change), typing in the
        input, or when the time updates (unrelated store). The visual sort function demonstrates how
        rapid, successive state updates sound. The `logDiffs` option is enabled for the main
        `TodoStore`.
      </p>
      <TimeDisplay />
      <AddTodoForm />
      <TodoList />
      <Controls />

      {/* Source Code Viewer */}
      <CodeViewer code={todoSource} language="tsx" title="View Todo.tsx Source" />
    </div>
  )
}
