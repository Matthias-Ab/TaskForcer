import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Trash2, AlarmClock, Pencil, ChevronDown } from 'lucide-react'
import { Task } from '@/hooks/useTasks'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { spring, checkmark } from '@/lib/animations'

const SNOOZE_OPTIONS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: 'Tomorrow', minutes: 60 * 16 },
]

interface TaskCardProps {
  task: Task
  selected?: boolean
  selectionMode?: boolean
  onSelect?: (id: string) => void
  onComplete: (id: string) => void
  onStart: (id: string) => void
  onSnooze: (id: string, minutes?: number) => void
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
}

export function TaskCard({
  task, selected, selectionMode, onSelect,
  onComplete, onStart, onSnooze, onDelete, onEdit,
}: TaskCardProps) {
  const [completing, setCompleting] = useState(false)
  const [showSnooze, setShowSnooze] = useState(false)
  const snoozeRef = useRef<HTMLDivElement>(null)

  const overdue = isOverdue(task.due_at) && task.status !== 'completed'
  const isInProgress = (task.status as string) === 'in_progress'

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (snoozeRef.current && !snoozeRef.current.contains(e.target as Node)) {
        setShowSnooze(false)
      }
    }
    if (showSnooze) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSnooze])

  async function handleComplete() {
    if (selectionMode) { onSelect?.(task.id); return }
    setCompleting(true)
    await new Promise<void>(r => setTimeout(r, 300))
    onComplete(task.id)
  }

  const cardBg = isInProgress
    ? 'rgba(245,158,11,0.05)'
    : overdue
    ? 'rgba(239,68,68,0.05)'
    : 'var(--tf-card-bg)'

  const cardBorder = isInProgress
    ? 'rgba(245,158,11,0.3)'
    : overdue
    ? 'rgba(239,68,68,0.3)'
    : selected
    ? 'rgba(99,102,241,0.5)'
    : 'var(--tf-card-border)'

  const showActionsArea = task.status !== 'completed' && !selectionMode

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: task.status === 'completed' ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.25 } }}
      transition={spring}
      className="group flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors cursor-default"
      style={{ background: cardBg, borderColor: cardBorder }}
      onClick={() => selectionMode && onSelect?.(task.id)}
    >
      {/* Checkbox */}
      <button
        onClick={e => { e.stopPropagation(); handleComplete() }}
        disabled={task.status === 'completed' || completing}
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
          'hover:scale-110 active:scale-95',
          selected
            ? 'bg-indigo-600 border-indigo-600'
            : task.status === 'completed'
            ? 'bg-emerald-500 border-emerald-500'
            : completing
            ? 'bg-emerald-500/50 border-emerald-500/50'
            : 'border-zinc-500 hover:border-emerald-500'
        )}
      >
        <AnimatePresence>
          {(task.status === 'completed' || completing || selected) && (
            <motion.svg
              width="10" height="10" viewBox="0 0 10 10" fill="none"
              initial="hidden" animate="visible" variants={checkmark}
            >
              <motion.path
                d="M1.5 5L4 7.5L8.5 2.5"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                variants={checkmark}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </button>

      {/* Priority dot */}
      <div className={cn(
        'w-1.5 h-1.5 rounded-full flex-shrink-0',
        task.priority === 'critical' ? 'bg-red-500' :
        task.priority === 'medium' ? 'bg-amber-400' : 'bg-zinc-500'
      )} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn('text-sm font-medium truncate', task.status === 'completed' ? 'line-through' : '')}
          style={{ color: task.status === 'completed' ? 'var(--tf-text-faint)' : 'var(--tf-text)' }}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {task.due_at && (
            <span
              className={cn('text-xs', overdue ? 'text-red-400' : '')}
              style={overdue ? {} : { color: 'var(--tf-text-faint)' }}
            >
              {formatDate(task.due_at)}
            </span>
          )}
          {task.recurrence_rule && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400">
              {task.recurrence_rule}
            </span>
          )}
          {task.tags?.length > 0 && (
            <div className="flex gap-1">
              {task.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'var(--tf-bg-tertiary)', color: 'var(--tf-text-muted)' }}>
                  {tag}
                </span>
              ))}
              {task.tags.length > 2 && (
                <span className="text-[10px]" style={{ color: 'var(--tf-text-faint)' }}>+{task.tags.length - 2}</span>
              )}
            </div>
          )}
          {task.estimate_minutes ? (
            <span className="text-xs font-mono" style={{ color: 'var(--tf-text-faint)' }}>
              {task.estimate_minutes}m
            </span>
          ) : null}
        </div>
      </div>

      {/* Status badge */}
      {isInProgress && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/20 font-medium flex-shrink-0">
          Active
        </span>
      )}

      {/* Actions — always in DOM, revealed via CSS group-hover so no JS state resets */}
      {showActionsArea && (
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 titlebar-no-drag">
          {!isInProgress && (
            <ActionBtn onClick={e => { e.stopPropagation(); onStart(task.id) }} title="Start task">
              <Play size={12} />
            </ActionBtn>
          )}
          <ActionBtn onClick={e => { e.stopPropagation(); onEdit(task) }} title="Edit task">
            <Pencil size={12} />
          </ActionBtn>

          {/* Snooze dropdown */}
          <div className="relative" ref={snoozeRef}>
            <ActionBtn
              onClick={e => { e.stopPropagation(); setShowSnooze(s => !s) }}
              title="Snooze"
            >
              <AlarmClock size={12} />
            </ActionBtn>
            <AnimatePresence>
              {showSnooze && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-full mt-1 rounded-xl border shadow-xl overflow-hidden min-w-[120px]"
                  style={{ background: 'var(--tf-dialog-bg)', borderColor: 'var(--tf-border)', zIndex: 100 }}
                >
                  {SNOOZE_OPTIONS.map(opt => (
                    <button
                      key={opt.minutes}
                      className="w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2"
                      style={{ color: 'var(--tf-text)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--tf-bg-tertiary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                      onClick={e => { e.stopPropagation(); onSnooze(task.id, opt.minutes); setShowSnooze(false) }}
                    >
                      <ChevronDown size={10} style={{ color: 'var(--tf-text-faint)' }} />
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <ActionBtn
            onClick={e => { e.stopPropagation(); onDelete(task.id) }}
            title="Delete task"
            danger
          >
            <Trash2 size={12} />
          </ActionBtn>
        </div>
      )}
    </motion.div>
  )
}

function ActionBtn({
  onClick, title, danger, children,
}: {
  onClick: (e: React.MouseEvent) => void
  title: string
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
      style={{ color: danger ? '#ef4444' : 'var(--tf-text-muted)' }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.1)' : 'var(--tf-bg-tertiary)'
        if (!danger) e.currentTarget.style.color = 'var(--tf-text)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = ''
        e.currentTarget.style.color = danger ? '#ef4444' : 'var(--tf-text-muted)'
      }}
    >
      {children}
    </button>
  )
}
