import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { TaskProvider } from '@/contexts/TaskContext'
import '@/styles/globals.css'

// HashRouter, not BrowserRouter: the production build is loaded via loadFile()
// (file:// protocol), where the History API can't resolve real paths like
// /today against the filesystem -- BrowserRouter left every route unmatched
// and the whole app blank outside of dev (where loadURL serves a real origin).
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <ThemeProvider>
        <TaskProvider>
          <App />
        </TaskProvider>
      </ThemeProvider>
    </HashRouter>
  </React.StrictMode>
)
