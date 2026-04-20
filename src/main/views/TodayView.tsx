import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTodayTasks } from '@/hooks/useTasks'
import { TaskCard } from '@/components/TaskCard'
import { CreateTaskForm } from '@/components/CreateTaskForm'
import { TaskSkeletonList } from '@/components/ui/Skeleton'
import { Dialog } from '@/components/ui/Dialog'
import { pageTransition, listItem } from '@/lib/animations'
import { CheckSquare2, AlertTriangle, Circle } from 'lucide-react'

export function TodayView() {
  const { tasks, loading, completeTask, startTask, snoozeTask, deleteTask, createTask } = useTodayTasks()
  const [showCreate, setShowCreate] = useState(false)

  const critical = tasks.filter(t => t.priority === 'critical' && t.status !== 'completed')
  const medium = tasks.filter(t => t.priority === 'medium' && t.status !== 'completed')
  const low = tasks.filter(t => t.priority === 'low' && t.status !== 'completed')
  const completed = tasks.filter(t => t.status === 'completed')

  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/40 flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Today</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {' · '}
            {tasks.filter(t => t.status !== 'completed').length} remaining
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-600/30 text-sm font-medium hover:bg-indigo-600/30 transition-colors"
        >
          + Add Task
          <span className="ml-2 text-xs text-indigo-500/60 font-mono">N</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {loading ? (
          <TaskSkeletonList count={6} />
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckSquare2 size={40} className="text-emerald-500 mb-3" />
            <p className="text-zinc-300 font-medium">All clear for today!</p>
            <p className="text-zinc-600 text-sm mt-1">Add a task to get started.</p>
          </div>
        ) : (
          <>
            <TaskGroup
              label="Critical" icon={<AlertTriangle size={13} className="text-red-500" />}
              tasks={critical} count={critical.length}
              onComplete={completeTask} onStart={startTask} onSnooze={snoozeTask} onDelete={deleteTask}
            />
            <TaskGroup
              label="Medium" icon={<Circle size={13} className="text-amber-400" />}
              tasks={medium} count={medium.length}
              onComplete={completeTask} onStart={startTask} onSnooze={snoozeTask} onDelete={deleteTask}
            />
            <TaskGroup
              label="Low Priority" icon={<Circle size={13} className="text-zinc-500" />}
              tasks={low} count={low.length}
              onComplete={completeTask} onStart={startTask} onSnooze={snoozeTask} onDelete={deleteTask}
            />
            {completed.length > 0 && (
              <TaskGroup
                label="Completed" icon={<CheckSquare2 size={13} className="text-emerald-500" />}
                tasks={completed} count={completed.length}
                onComplete={completeTask} onStart={startTask} onSnooze={snoozeTask} onDelete={deleteTask}
                collapsed
              />
            )}
          </>
        )}

        {/* Inline quick add */}
        <CreateTaskForm onSubmit={createTask} compact />
      </div>

      {/* Create task modal */}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Task"
        size="md"
      >
        <CreateTaskForm
          onSubmit={async (data) => {
            await createTask(data)
            setShowCreate(false)
          }}
          onCancel={() => setShowCreate(false)}
        />
      </Dialog>
    </motion.div>
  )
}

interface TaskGroupProps {
  label: string
  icon: React.ReactNode
  tasks: ReturnType<typeof useTodayTasks>['tasks']
  count: number
  onComplete: (id: string) => void
  onStart: (id: string) => void
  onSnooze: (id: string, m?: number) => void
  onDelete: (id: string) => void
  collapsed?: boolean
}

function TaskGroup({ label, icon, tasks, count, onComplete, onStart, onSnooze, onDelete, collapsed = false }: TaskGroupProps) {
  const [open, setOpen] = useState(!collapsed)
  if (count === 0) return null

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
      >
        {icon}
        {label}
        <span className="ml-1 px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-500 font-mono normal-case">
          {count}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <motion.div className="space-y-1.5" layout>
              <AnimatePresence initial={false}>
                {tasks.map(task => (
                  <motion.div
                    key={task.id}
                    variants={listItem}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >
                    <TaskCard
                      task={task}
                      onComplete={onComplete}
                      onStart={onStart}
                      onSnooze={onSnooze}
                      onDelete={onDelete}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
