import React from 'react'
import { create } from 'zustand'
import { zusound } from '../../packages' // Adjust the import path if necessary

// --- Types ---
interface Todo {
  id: number
  text: string
  completed: boolean
}

type Filter = 'all' | 'active' | 'completed'

// --- Zustand Stores with zusound middleware ---

// Store for managing the list of todos (Original, without temporal)
interface TodoState {
  todos: Todo[]
  addTodo: (text: string) => void
  toggleTodo: (id: number) => void
  deleteTodo: (id: number) => void
  sortOrder: 'none' | 'asc' | 'desc'
  isSorting: boolean
  sortTodos: (order: 'asc' | 'desc') => Promise<void>
}

const useTodoStore = create<TodoState>(
  zusound(
    (set, get) => ({
      // Add get here to access current state inside actions
      todos: [],
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
      sortTodos: async (order: 'asc' | 'desc') => {
        if (get().isSorting) return // Prevent multiple sorts at once
        set({ isSorting: true, sortOrder: order })
        const todosToSort = [...get().todos] // Get a mutable copy
        const n = todosToSort.length
        let swapped
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

        // Using Bubble Sort for visualization
        for (let i = 0; i < n - 1; i++) {
          swapped = false
          for (let j = 0; j < n - i - 1; j++) {
            const compareCondition =
              order === 'asc'
                ? todosToSort[j].id > todosToSort[j + 1].id
                : todosToSort[j].id < todosToSort[j + 1].id

            if (compareCondition) {
              // Swap elements
              ;[todosToSort[j], todosToSort[j + 1]] = [todosToSort[j + 1], todosToSort[j]]
              swapped = true

              // Update state and pause for visualization
              set({ todos: [...todosToSort] }) // Update with the current state of the array
              await delay(30) // 0.03 second delay for visualization
            }
          }
          // If no two elements were swapped by inner loop, then break
          if (!swapped) break
        }

        set({ isSorting: false })
      },
    }),
    { name: 'TodoStore' } // Optional: Name the store for debugging
  )
)

// Store for managing the current filter
interface FilterState {
  filter: Filter
  setFilter: (filter: Filter) => void
}

const useFilterStore = create<FilterState>(
  zusound(
    set => ({
      filter: 'all',
      setFilter: filter => set({ filter }),
    }),
    { name: 'FilterStore' }
  )
)

// Store for managing the input field state
interface InputState {
  inputValue: string
  setInputValue: (value: string) => void
}

const useInputStore = create<InputState>(
  zusound(
    set => ({
      inputValue: '',
      setInputValue: value => set({ inputValue: value }),
    }),
    { name: 'InputStore' }
  )
)

// Store for managing the current time
interface TimeState {
  currentTime: string
  setCurrentTime: (time: string) => void
}

const useTimeStore = create<TimeState>(
  zusound(
    set => ({
      currentTime: new Date().toLocaleTimeString(),
      setCurrentTime: time => set({ currentTime: time }),
    }),
    { name: 'TimeStore' }
  )
)

// --- React Components ---

// Component to display the current time
function TimeDisplay() {
  const { currentTime, setCurrentTime } = useTimeStore()

  React.useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString())
    }, 1000)

    return () => clearInterval(intervalId) // Cleanup on unmount
  }, [setCurrentTime])

  return (
    <div
      style={{ marginTop: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}
    >
      Current Time: <strong>{currentTime}</strong>
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
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="What needs to be done?"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        style={{ marginRight: '8px', padding: '8px' }}
      />
      <button type="submit" style={{ padding: '8px 12px' }}>
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
  const creationTime = new Date(todo.id).toLocaleString() // Format the timestamp

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '8px',
        paddingBottom: '8px', // Add some padding below
        borderBottom: '1px solid #eee', // Separator
        textDecoration: todo.completed ? 'line-through' : 'none',
        opacity: todo.completed ? 0.6 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => toggleTodo(todo.id)}
        style={{ marginRight: '8px', alignSelf: 'start' }} // Align checkbox to top
      />
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {' '}
        {/* Container for text and time */}
        <span>{todo.text}</span>
        <span style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}>
          Created: {creationTime}
        </span>
      </div>
      <button
        onClick={() => deleteTodo(todo.id)}
        style={{ marginLeft: '8px', padding: '4px 8px', cursor: 'pointer', alignSelf: 'start' }} // Align button to top
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

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true // 'all'
  })

  return (
    <ul style={{ listStyle: 'none', padding: 0, marginTop: '20px' }}>
      {filteredTodos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  )
}

// Component for filter controls
function FilterControls() {
  const { filter, setFilter } = useFilterStore()

  const handleFilterChange = (newFilter: Filter) => {
    setFilter(newFilter)
  }

  return (
    <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
      <span>Show: </span>
      <button
        onClick={() => handleFilterChange('all')}
        disabled={filter === 'all'}
        style={{ fontWeight: filter === 'all' ? 'bold' : 'normal', padding: '4px 8px' }}
      >
        All
      </button>
      <button
        onClick={() => handleFilterChange('active')}
        disabled={filter === 'active'}
        style={{ fontWeight: filter === 'active' ? 'bold' : 'normal', padding: '4px 8px' }}
      >
        Active
      </button>
      <button
        onClick={() => handleFilterChange('completed')}
        disabled={filter === 'completed'}
        style={{ fontWeight: filter === 'completed' ? 'bold' : 'normal', padding: '4px 8px' }}
      >
        Completed
      </button>
    </div>
  )
}

// Component for sort controls
function SortControls() {
  const { sortTodos, isSorting, sortOrder } = useTodoStore()

  const handleSort = (order: 'asc' | 'desc') => {
    if (!isSorting) {
      sortTodos(order)
    }
  }

  return (
    <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
      <span>Sort by time: </span>
      <button
        onClick={() => handleSort('asc')}
        disabled={isSorting}
        style={{ fontWeight: sortOrder === 'asc' ? 'bold' : 'normal', padding: '4px 8px' }}
      >
        Oldest First {sortOrder === 'asc' && isSorting ? '...' : ''}
      </button>
      <button
        onClick={() => handleSort('desc')}
        disabled={isSorting}
        style={{ fontWeight: sortOrder === 'desc' ? 'bold' : 'normal', padding: '4px 8px' }}
      >
        Newest First {sortOrder === 'desc' && isSorting ? '...' : ''}
      </button>
    </div>
  )
}

// --- Main App Component ---
export function TodoApp() {
  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '500px', margin: 'auto', padding: '20px' }}>
        <h1 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: 0 }}>
          zusound Todo Demo
        </h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Listen for sounds when you change the state!
        </p>
        <TimeDisplay />
        <AddTodoForm />
        <TodoList />
        <FilterControls />
        <SortControls />
      </div>
    </div>
  )
}

// Optional: If you want to render this directly for testing
// import ReactDOM from 'react-dom/client';
// const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
// root.render(<React.StrictMode><TodoApp /></React.StrictMode>);
