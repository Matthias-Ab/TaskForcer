import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Pencil, Trash2, Play, CheckCheck, AlarmClock, ChevronDown,
  Plus, Check, Circle, AlertTriangle, Clock, Tag, RotateCw, ListTodo,
  FileText, Calendar,
} from 'lucide-react'
import { Task } from '@/hooks/useTasks'
import { useTaskContext } from '@/contexts/TaskContext'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { Button } from './ui/Button'

const SNOOZE_OPTIONS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: 'Tomorrow', minutes: 60 * 16 },
]

interface TaskPreviewModalProps {
  task: Task | null
  onClose: () => void
  onEdit: (task: Task) => void
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  onStart: (id: string) => void
  onSnooze: (id: string, minutes?: number) => void
}

export function TaskPreviewModal({
  task, onClose, onEdit, onComplete, onDelete, onStart, onSnooze,
}: TaskPreviewModalProps) {
  const { getSubtasks, createSubtask, completeSubtask, deleteSubtask } = useTaskContext()
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [showSnooze, setShowSnooze] = useState(false)
  const subtaskInputRef = useRef<HTMLInputElement>(null)
  const snoozeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!task) return
    setSubtasks([])
    getSubtasks(task.id).then(setSubtasks)
  }, [task?.id])

  useEffect(() => {
    if (addingSubtask) setTimeout(() => subtaskInputRef.current?.focus(), 50)
  }, [addingSubtask])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (snoozeRef.current && !snoozeRef.current.contains(e.target as Node)) {
        setShowSnooze(false)
      }
    }
    if (showSnooze) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSnooze])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!task) return null

  const overdue = isOverdue(task.due_at) && task.status !== 'completed'
  const isInProgress = (task.status as string) === 'in_progress'
  const isDone = task.status === 'completed'
  const completedSubtasks = subtasks.filter(s => s.status === 'completed').length
  const subtaskProgress = subtasks.length > 0 ? completedSubtasks / subtasks.length : null

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault()
    if (!newSubtaskTitle.trim() || !task) return
    const created = await createSubtask(task.id, { title: newSubtaskTitle.trim() })
    if (created) setSubtasks(prev => [...prev, created])
    setNewSubtaskTitle('')
    setAddingSubtask(false)
  }

  async function handleCompleteSubtask(id: string) {
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, status: 'completed' as const } : s))
    await completeSubtask(id)
  }

  async function handleDeleteSubtask(id: string) {
    setSubtasks(prev => prev.filter(s => s.id !== id))
    await deleteSubtask(id)
  }

  const priorityColor = task.priority === 'critical' ? 'text-red-400' :
    task.priority === 'medium' ? 'text-amber-400' : 'text-zinc-400'
  const priorityIcon = task.priority === 'critical'
    ? <AlertTriangle size={13} className="text-red-400" />
    : task.priority === 'medium'
    ? <Circle size={13} className="text-amber-400" />
    : <Circle size={13} className="text-zinc-400" />

  return (
    <AnimatePresence>
      {task && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative z-10 w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col max-h-[80vh]"
            style={{ background: 'var(--tf-dialog-bg)', borderColor: 'var(--tf-border)' }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15 }}
          >
            {/* Header */}
            <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: 'var(--tf-border)' }}>
              {/* Complete button */}
              <button
                onClick={() => { onComplete(task.id); onClose() }}
                disabled={isDone}
                className={cn(
                  'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all hover:scale-110',
                  isDone ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-500 hover:border-emerald-500'
                )}
              >
                {isDone && <Check size={10} strokeWidth={3} className="text-white" />}
              </button>

              <div className="flex-1 min-w-0">
                <h2
                  className={cn('text-base font-semibold leading-snug', isDone ? 'line-through' : '')}
                  style={{ color: isDone ? 'var(--tf-text-faint)' : 'var(--tf-text)' }}
                >
                  {task.title}
                </h2>
                {/* Meta row */}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className={cn('flex items-center gap-1 text-xs', priorityColor)}>
                    {priorityIcon}
                    {task.priority}
                  </span>
                  {task.due_at && (
                    <span className={cn('flex items-center gap-1 text-xs', overdue ? 'text-red-400' : '')}
                      style={overdue ? {} : { color: 'var(--tf-text-faint)' }}>
                      <Calendar size={11} />
                      {formatDate(task.due_at)}
                    </span>
                  )}
                  {task.estimate_minutes ? (
                    <span className="flex items-center gap-1 text-xs font-mono" style={{ color: 'var(--tf-text-faint)' }}>
                      <Clock size={11} />
                      {task.estimate_minutes}m
                    </span>
                  ) : null}
                  {isInProgress && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/20 font-medium">
                      Active
                    </span>
                  )}
                  {task.recurrence_rule && (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400">
                      <RotateCw size={9} />
                      {task.recurrence_rule}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={onClose}
                className="mt-0.5 rounded-lg p-1 flex-shrink-0 transition-colors"
                style={{ color: 'var(--tf-text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--tf-bg-tertiary)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* Description */}
              {task.description ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5" style={{ color: 'var(--tf-text-muted)' }}>
                    <FileText size={12} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Notes</span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--tf-text)' }}>
                    {task.description}
                  </p>
                </div>
              ) : null}

              {/* Tags */}
              {task.tags?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5" style={{ color: 'var(--tf-text-muted)' }}>
                    <Tag size={12} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {task.tags.map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'var(--tf-bg-tertiary)', color: 'var(--tf-text-muted)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtasks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5" style={{ color: 'var(--tf-text-muted)' }}>
                    <ListTodo size={12} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Subtasks</span>
                    {subtasks.length > 0 && (
                      <span className="text-xs font-mono ml-1" style={{ color: 'var(--tf-text-faint)' }}>
                        {completedSubtasks}/{subtasks.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setAddingSubtask(true)}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>

                {/* Progress bar */}
                {subtaskProgress !== null && (
                  <div className="h-1 rounded-full overflow-hidden mb-3" style={{ background: 'var(--tf-bg-tertiary)' }}>
                    <motion.div
                      className="h-full rounded-full bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${subtaskProgress * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <AnimatePresence initial={false}>
                    {subtasks.map(sub => (
                      <motion.div
                        key={sub.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="group flex items-center gap-2.5 px-3 py-2 rounded-xl border"
                        style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-card-bg)' }}
                      >
                        <button
                          onClick={() => handleCompleteSubtask(sub.id)}
                          disabled={sub.status === 'completed'}
                          className={cn(
                            'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                            sub.status === 'completed'
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-zinc-500 hover:border-emerald-500'
                          )}
                        >
                          {sub.status === 'completed' && <Check size={8} strokeWidth={3} className="text-white" />}
                        </button>
                        <span
                          className={cn('flex-1 text-sm truncate', sub.status === 'completed' ? 'line-through' : '')}
                          style={{ color: sub.status === 'completed' ? 'var(--tf-text-faint)' : 'var(--tf-text)' }}
                        >
                          {sub.title}
                        </span>
                        <button
                          onClick={() => handleDeleteSubtask(sub.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--tf-text-faint)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--tf-text-faint)')}
                        >
                          <X size={12} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <AnimatePresence>
                    {addingSubtask && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        onSubmit={handleAddSubtask}
                        className="flex items-center gap-2"
                      >
                        <input
                          ref={subtaskInputRef}
                          value={newSubtaskTitle}
                          onChange={e => setNewSubtaskTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Escape') { setAddingSubtask(false); setNewSubtaskTitle('') } }}
                          placeholder="Subtask title..."
                          className="flex-1 text-sm px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          style={{ background: 'var(--tf-input-bg)', borderColor: 'var(--tf-input-border)', color: 'var(--tf-input-text)' }}
                        />
                        <Button type="submit" size="sm" variant="primary" disabled={!newSubtaskTitle.trim()}>
                          Add
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingSubtask(false); setNewSubtaskTitle('') }}>
                          Cancel
                        </Button>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {subtasks.length === 0 && !addingSubtask && (
                    <button
                      onClick={() => setAddingSubtask(true)}
                      className="w-full text-left text-sm px-3 py-2 rounded-xl border border-dashed transition-colors"
                      style={{ borderColor: 'var(--tf-border)', color: 'var(--tf-text-faint)' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--tf-text-muted)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--tf-border)')}
                    >
                      + Add a subtask
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            {!isDone && (
              <div className="flex items-center gap-2 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--tf-border)' }}>
                {!isInProgress && (
                  <Button size="sm" variant="secondary" onClick={() => { onStart(task.id); onClose() }}>
                    <Play size={12} /> Start
                  </Button>
                )}
                <Button size="sm" variant="success" onClick={() => { onComplete(task.id); onClose() }}>
                  <CheckCheck size={12} /> Complete
                </Button>

                {/* Snooze */}
                <div className="relative" ref={snoozeRef}>
                  <Button size="sm" variant="secondary" onClick={() => setShowSnooze(s => !s)}>
                    <AlarmClock size={12} /> Snooze <ChevronDown size={10} />
                  </Button>
                  <AnimatePresence>
                    {showSnooze && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute bottom-full mb-1 left-0 rounded-xl border shadow-xl overflow-hidden min-w-[120px] z-10"
                        style={{ background: 'var(--tf-dialog-bg)', borderColor: 'var(--tf-border)' }}
                      >
                        {SNOOZE_OPTIONS.map(opt => (
                          <button
                            key={opt.minutes}
                            className="w-full text-left px-3 py-2 text-xs transition-colors"
                            style={{ color: 'var(--tf-text)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--tf-bg-tertiary)')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                            onClick={() => { onSnooze(task.id, opt.minutes); setShowSnooze(false); onClose() }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex-1" />

                <Button size="sm" variant="ghost" onClick={() => { onEdit(task); onClose() }}>
                  <Pencil size={12} /> Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => { onDelete(task.id); onClose() }}>
                  <Trash2 size={12} />
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
