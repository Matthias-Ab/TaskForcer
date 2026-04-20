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
import { useTodayTasks } from '@/hooks/useTasks'

export function App() {
  const location = useLocation()
  const [showCreateTask, setShowCreateTask] = useState(false)
  const { createTask } = useTodayTasks()

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
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

      {/* Global dialogs */}
      <CheckinDialog />
      <LockoutDialog />

      {/* Create task modal from palette */}
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

      {/* Command palette */}
      <CommandPalette onCreateTask={() => setShowCreateTask(true)} />

      {/* Toasts */}
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: { background: '#18181b', border: '1px solid #27272a', color: '#fafafa' },
        }}
      />
    </div>
  )
}
