import { useState } from 'react'
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
import { CheckinDialog } from '@/components/CheckinDialog'
import { LockoutDialog } from '@/components/LockoutDialog'
import { Dialog } from '@/components/ui/Dialog'
import { CreateTaskForm } from '@/components/CreateTaskForm'
import { useTaskContext } from '@/contexts/TaskContext'
import { useTheme } from '@/contexts/ThemeContext'

export function App() {
  const location = useLocation()
  const [showCreateTask, setShowCreateTask] = useState(false)
  const { createTask } = useTaskContext()
  const { theme } = useTheme()

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

      <Dialog
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        title="New Task"
      >
        <CreateTaskForm
          onSubmit={async (data) => {
            await createTask(data)
            setShowCreateTask(false)
          }}
          onCancel={() => setShowCreateTask(false)}
        />
      </Dialog>

      <CommandPalette onCreateTask={() => setShowCreateTask(true)} />

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
