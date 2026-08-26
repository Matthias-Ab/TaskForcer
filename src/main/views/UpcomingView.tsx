import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ipc } from '@/lib/ipc'
import { Task } from '@/hooks/useTasks'
import { useTaskContext } from '@/contexts/TaskContext'
import { useTemplates } from '@/hooks/useTemplates'
import { useHabitStreaks } from '@/hooks/useHabitStreaks'
import { pageTransition } from '@/lib/animations'
import { TaskSkeletonList } from '@/components/ui/Skeleton'
import { TaskCard } from '@/components/TaskCard'
import { TaskPreviewModal } from '@/components/TaskPreviewModal'
import { Dialog } from '@/components/ui/Dialog'
import { EditTaskForm } from '@/components/EditTaskForm'
import { CheckSquare2, Siren, Circle } from 'lucide-react'

export function UpcomingView() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [previewTask, setPreviewTask] = useState<Task | null>(null)
  const { completeTask, startTask, snoozeTask, deleteTask, updateTask } = useTaskContext()
  const { streaks } = useHabitStreaks(tasks)
  const { saveTemplate: _saveTemplate } = useTemplates()
  const saveTemplate = useCallback((task: Task, name: string) => _saveTemplate(name, task), [_saveTemplate])

  const reload = useCallback(async () => {
    const data = await ipc.invoke<Task[]>('tasks:upcoming')
    setTasks(data)
    setLoading(false)
  }, [])

  useEffect(() => { reload().catch(() => setLoading(false)) }, [reload])

  // Upcoming keeps its own task list (a 7-day window, distinct from the "today"
  // scope TaskContext tracks), so mutations there don't auto-sync here -- reload after each.
  const withReload = useCallback(<A extends unknown[]>(fn: (...a: A) => Promise<unknown>) =>
    async (...a: A) => { await fn(...a); await reload() },
  [reload])

  const handleComplete = withReload(completeTask)
  const handleStart = withReload(startTask)
  const handleSnooze = withReload(snoozeTask)
  const handleDelete = withReload(deleteTask)

  const overdue = tasks.filter(t => t.due_at && t.due_at < Date.now())
  const upcoming = tasks.filter(t => !t.due_at || t.due_at >= Date.now())

  // Group upcoming by day label
  const groups: { label: string; isToday: boolean; tasks: Task[] }[] = []
  const today = new Date().toDateString()
  const tomorrow = new Date(Date.now() + 86400000).toDateString()

  for (const task of upcoming) {
    if (!task.due_at) continue
    const d = new Date(task.due_at)
    const isToday = d.toDateString() === today
    const label = isToday ? 'Today'
      : d.toDateString() === tomorrow ? 'Tomorrow'
      : d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    const existing = groups.find(g => g.label === label)
    if (existing) existing.tasks.push(task)
    else groups.push({ label, isToday, tasks: [task] })
  }

  const total = tasks.length

  const rowProps = {
    onComplete: handleComplete,
    onStart: handleStart,
    onSnooze: handleSnooze,
    onDelete: handleDelete,
    onEdit: setEditingTask,
    onPreview: setPreviewTask,
    onSaveTemplate: saveTemplate,
  }

  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col h-full overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--tf-border)' }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--tf-text)' }}>Upcoming</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--tf-text-muted)' }}>
            Next 7 days · {total} task{total !== 1 ? 's' : ''}
            {overdue.length > 0 && <span className="text-red-400 ml-1">· {overdue.length} overdue</span>}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {loading ? (
          <TaskSkeletonList count={8} />
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckSquare2 size={36} className="mb-3" style={{ color: 'var(--tf-text-faint)' }} />
            <p className="text-sm" style={{ color: 'var(--tf-text-muted)' }}>No upcoming tasks in the next 7 days.</p>
          </div>
        ) : (
          <>
            {/* Overdue section */}
            {overdue.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Siren size={13} className="text-red-400 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Overdue</span>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded-md" style={{ background: 'var(--tf-bg-tertiary)', color: 'var(--tf-text-muted)' }}>
                    {overdue.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {overdue.map(task => <TaskCard key={task.id} task={task} streak={streaks.get(task.id)} {...rowProps} />)}
                </div>
              </div>
            )}

            {/* Day groups */}
            {groups.map(group => (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-2">
                  {group.isToday
                    ? <Circle size={13} className="text-indigo-400" />
                    : <Circle size={13} style={{ color: 'var(--tf-text-faint)' }} />
                  }
                  <span
                    className={group.isToday ? 'text-xs font-semibold uppercase tracking-wider text-indigo-400' : 'text-xs font-semibold uppercase tracking-wider'}
                    style={group.isToday ? {} : { color: 'var(--tf-text-muted)' }}
                  >
                    {group.label}
                  </span>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded-md" style={{ background: 'var(--tf-bg-tertiary)', color: 'var(--tf-text-muted)' }}>
                    {group.tasks.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {group.tasks.map(task => <TaskCard key={task.id} task={task} streak={streaks.get(task.id)} {...rowProps} />)}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <TaskPreviewModal
        task={previewTask}
        onClose={() => setPreviewTask(null)}
        onEdit={(task) => { setPreviewTask(null); setEditingTask(task) }}
        onComplete={handleComplete}
        onDelete={handleDelete}
        onStart={handleStart}
        onSnooze={handleSnooze}
      />

      <Dialog open={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Task" size="md">
        {editingTask && (
          <EditTaskForm
            task={editingTask}
            onSubmit={async (data) => { await updateTask(editingTask.id, data); setEditingTask(null); await reload() }}
            onCancel={() => setEditingTask(null)}
          />
        )}
      </Dialog>
    </motion.div>
  )
}
