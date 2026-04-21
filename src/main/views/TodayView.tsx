import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTaskContext } from '@/contexts/TaskContext'
import { TaskCard } from '@/components/TaskCard'
import { CreateTaskForm } from '@/components/CreateTaskForm'
import { EditTaskForm } from '@/components/EditTaskForm'
import { TaskSkeletonList } from '@/components/ui/Skeleton'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Task } from '@/hooks/useTasks'
import { pageTransition, listItem } from '@/lib/animations'
import { CheckSquare2, AlertTriangle, Circle, CheckCheck, Trash2, ChevronDown } from 'lucide-react'

const PRIORITY_OPTIONS: { label: string; value: Task['priority'] }[] = [
  { label: 'Critical', value: 'critical' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
]

export function TodayView() {
  const {
    tasks, loading,
    completeTask, startTask, snoozeTask, deleteTask, createTask,
    updateTask, deleteTasks, completeTasks, updateTasksPriority,
  } = useTaskContext()

  const [showCreate, setShowCreate] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)

  const selectionMode = selectedIds.size > 0

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function clearSelection() { setSelectedIds(new Set()) }

  async function bulkComplete() {
    await completeTasks([...selectedIds])
    clearSelection()
  }
  async function bulkDelete() {
    await deleteTasks([...selectedIds])
    clearSelection()
  }
  async function bulkPriority(priority: Task['priority']) {
    await updateTasksPriority([...selectedIds], priority)
    setShowPriorityMenu(false)
    clearSelection()
  }

  const activeTasks = tasks.filter(t => t.status !== 'completed')
  const critical = activeTasks.filter(t => t.priority === 'critical')
  const medium = activeTasks.filter(t => t.priority === 'medium')
  const low = activeTasks.filter(t => t.priority === 'low')
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
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--tf-border)' }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--tf-text)' }}>Today</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--tf-text-muted)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {' · '}
            {activeTasks.length} remaining
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 text-sm font-medium hover:bg-indigo-600/30 transition-colors"
        >
          + Add Task
          <span className="ml-2 text-xs text-indigo-500/60 font-mono">N</span>
        </button>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectionMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2 px-6 py-2 border-b overflow-hidden"
            style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-bg-secondary)' }}
          >
            <span className="text-xs font-medium mr-2" style={{ color: 'var(--tf-text-muted)' }}>
              {selectedIds.size} selected
            </span>
            <Button size="sm" variant="success" onClick={bulkComplete}>
              <CheckCheck size={13} /> Complete
            </Button>
            <div className="relative">
              <Button size="sm" variant="secondary" onClick={() => setShowPriorityMenu(p => !p)}>
                Priority <ChevronDown size={12} />
              </Button>
              <AnimatePresence>
                {showPriorityMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    className="absolute top-full mt-1 left-0 rounded-xl border shadow-xl z-50 overflow-hidden min-w-[120px]"
                    style={{ background: 'var(--tf-dialog-bg)', borderColor: 'var(--tf-border)' }}
                  >
                    {PRIORITY_OPTIONS.map(o => (
                      <button
                        key={o.value}
                        className="w-full text-left px-3 py-2 text-xs transition-colors"
                        style={{ color: 'var(--tf-text)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--tf-bg-tertiary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                        onClick={() => bulkPriority(o.value)}
                      >
                        {o.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button size="sm" variant="danger" onClick={bulkDelete}>
              <Trash2 size={13} /> Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection} className="ml-auto">
              Cancel
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {loading ? (
          <TaskSkeletonList count={6} />
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckSquare2 size={40} className="text-emerald-500 mb-3" />
            <p className="font-medium" style={{ color: 'var(--tf-text)' }}>All clear for today!</p>
            <p className="text-sm mt-1" style={{ color: 'var(--tf-text-faint)' }}>Add a task to get started.</p>
          </div>
        ) : (
          <>
            <TaskGroup
              label="Critical" icon={<AlertTriangle size={13} className="text-red-500" />}
              tasks={critical} selectedIds={selectedIds} selectionMode={selectionMode}
              onSelect={toggleSelect} onComplete={completeTask} onStart={startTask}
              onSnooze={snoozeTask} onDelete={deleteTask} onEdit={setEditingTask}
            />
            <TaskGroup
              label="Medium" icon={<Circle size={13} className="text-amber-400" />}
              tasks={medium} selectedIds={selectedIds} selectionMode={selectionMode}
              onSelect={toggleSelect} onComplete={completeTask} onStart={startTask}
              onSnooze={snoozeTask} onDelete={deleteTask} onEdit={setEditingTask}
            />
            <TaskGroup
              label="Low Priority" icon={<Circle size={13} style={{ color: 'var(--tf-text-faint)' }} />}
              tasks={low} selectedIds={selectedIds} selectionMode={selectionMode}
              onSelect={toggleSelect} onComplete={completeTask} onStart={startTask}
              onSnooze={snoozeTask} onDelete={deleteTask} onEdit={setEditingTask}
            />
            {completed.length > 0 && (
              <TaskGroup
                label="Completed" icon={<CheckSquare2 size={13} className="text-emerald-500" />}
                tasks={completed} selectedIds={selectedIds} selectionMode={selectionMode}
                onSelect={toggleSelect} onComplete={completeTask} onStart={startTask}
                onSnooze={snoozeTask} onDelete={deleteTask} onEdit={setEditingTask}
                collapsed
              />
            )}
          </>
        )}

        <CreateTaskForm onSubmit={createTask} compact />
      </div>

      {/* Create task modal */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="New Task" size="md">
        <CreateTaskForm
          onSubmit={async (data) => { await createTask(data); setShowCreate(false) }}
          onCancel={() => setShowCreate(false)}
        />
      </Dialog>

      {/* Edit task modal */}
      <Dialog open={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Task" size="md">
        {editingTask && (
          <EditTaskForm
            task={editingTask}
            onSubmit={async (data) => { await updateTask(editingTask.id, data); setEditingTask(null) }}
            onCancel={() => setEditingTask(null)}
          />
        )}
      </Dialog>
    </motion.div>
  )
}

interface TaskGroupProps {
  label: string
  icon: React.ReactNode
  tasks: Task[]
  selectedIds: Set<string>
  selectionMode: boolean
  onSelect: (id: string) => void
  onComplete: (id: string) => void
  onStart: (id: string) => void
  onSnooze: (id: string, m?: number) => void
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
  collapsed?: boolean
}

function TaskGroup({
  label, icon, tasks, selectedIds, selectionMode,
  onSelect, onComplete, onStart, onSnooze, onDelete, onEdit, collapsed = false,
}: TaskGroupProps) {
  const [open, setOpen] = useState(!collapsed)
  if (tasks.length === 0) return null

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider hover:opacity-80 transition-opacity"
        style={{ color: 'var(--tf-text-muted)' }}
      >
        {icon}
        {label}
        <span className="ml-1 px-1.5 py-0.5 rounded-md font-mono normal-case" style={{ background: 'var(--tf-bg-tertiary)', color: 'var(--tf-text-muted)' }}>
          {tasks.length}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div className="space-y-1.5 pb-1" layout>
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
                      selected={selectedIds.has(task.id)}
                      selectionMode={selectionMode}
                      onSelect={onSelect}
                      onComplete={onComplete}
                      onStart={onStart}
                      onSnooze={onSnooze}
                      onDelete={onDelete}
                      onEdit={onEdit}
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
