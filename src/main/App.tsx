import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'sonner'
import { TitleBar } from '@/components/TitleBar'
import { Sidebar } from '@/components/Sidebar'
import { TodayView } from './views/TodayView'
import { CalendarView } from './views/CalendarView'
import { UpcomingView } from './views/UpcomingView'
import { StatsView } from './views/StatsView'
import { ShameLogView } from './views/ShameLogView'
import { SettingsView } from './views/SettingsView'
import { CommandPalette } from '@/components/CommandPalette'
import { SearchModal } from '@/components/SearchModal'
import { TaskPreviewModal } from '@/components/TaskPreviewModal'
import { CheckinDialog } from '@/components/CheckinDialog'
import { LockoutDialog } from '@/components/LockoutDialog'
import { Dialog } from '@/components/ui/Dialog'
import { CreateTaskForm } from '@/components/CreateTaskForm'
import { EditTaskForm } from '@/components/EditTaskForm'
import { useTaskContext } from '@/contexts/TaskContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Task } from '@/hooks/useTasks'

export function App() {
  const location = useLocation()
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [previewTask, setPreviewTask] = useState<Task | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const { createTask, completeTask, deleteTask, startTask, snoozeTask, updateTask } = useTaskContext()
  const { theme } = useTheme()

  // Global keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch(s => !s)
      }
      // Close search/preview on Escape handled inside those modals
      if (!isTyping && !e.metaKey && !e.ctrlKey && e.key === 'Escape') {
        setPreviewTask(null)
        setShowSearch(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: 'var(--tf-bg)', color: 'var(--tf-text)' }}
    >
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait" initial={false}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Navigate to="/today" replace />} />
              <Route path="/today" element={<TodayView />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/upcoming" element={<UpcomingView />} />
              <Route path="/stats" element={<StatsView />} />
              <Route path="/shame" element={<ShameLogView />} />
              <Route path="/settings" element={<SettingsView />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>

      <CheckinDialog />
      <LockoutDialog />

      <Dialog open={showCreateTask} onClose={() => setShowCreateTask(false)} title="New Task">
        <CreateTaskForm
          onSubmit={async (data) => { await createTask(data); setShowCreateTask(false) }}
          onCancel={() => setShowCreateTask(false)}
        />
      </Dialog>

      <CommandPalette onCreateTask={() => setShowCreateTask(true)} />

      <SearchModal
        open={showSearch}
        onClose={() => setShowSearch(false)}
        onPreview={(task) => { setShowSearch(false); setPreviewTask(task) }}
      />

      {/* Global task preview — used by search results */}
      <TaskPreviewModal
        task={previewTask}
        onClose={() => setPreviewTask(null)}
        onEdit={(task) => { setPreviewTask(null); setEditingTask(task) }}
        onComplete={(id) => { completeTask(id); setPreviewTask(null) }}
        onDelete={(id) => { deleteTask(id); setPreviewTask(null) }}
        onStart={(id) => { startTask(id); setPreviewTask(null) }}
        onSnooze={(id, m) => { snoozeTask(id, m); setPreviewTask(null) }}
      />

      {/* Global edit dialog — opened from search preview */}
      <Dialog open={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Task" size="md">
        {editingTask && (
          <EditTaskForm
            task={editingTask}
            onSubmit={async (data) => { await updateTask(editingTask.id, data); setEditingTask(null) }}
            onCancel={() => setEditingTask(null)}
          />
        )}
      </Dialog>

      <Toaster
        theme={theme}
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--tf-bg-secondary)',
            border: '1px solid var(--tf-border)',
            color: 'var(--tf-text)',
          },
        }}
      />
    </div>
  )
}
