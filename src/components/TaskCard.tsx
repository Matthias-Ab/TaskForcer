import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Clock, Trash2, AlarmClock } from 'lucide-react'
import { Task } from '@/hooks/useTasks'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { spring, checkmark } from '@/lib/animations'
import { Button } from './ui/Button'

interface TaskCardProps {
  task: Task
  onComplete: (id: string) => void
  onStart: (id: string) => void
  onSnooze: (id: string, minutes?: number) => void
  onDelete: (id: string) => void
}

export function TaskCard({ task, onComplete, onStart, onSnooze, onDelete }: TaskCardProps) {
  const [completing, setCompleting] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const overdue = isOverdue(task.due_at) && task.status !== 'completed'

  async function handleComplete() {
    setCompleting(true)
    // play sound
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA...')
      audio.volume = 0.3
      audio.play().catch(() => {})
    } catch {}
    await new Promise(r => setTimeout(r, 400))
    onComplete(task.id)
  }

  return (
    <motion.div
      layout
      layoutId={task.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: task.status === 'completed' ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.25 } }}
      transition={spring}
      className={cn(
        'group flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors',
        'hover:border-zinc-700/60',
        task.status === 'completed' && 'opacity-50',
        task.status === 'in_progress' && 'border-amber-500/30 bg-amber-500/5',
        overdue && task.status !== 'in_progress' && 'border-red-500/30 bg-red-500/5',
        !overdue && task.status === 'pending' && 'border-zinc-800/40 bg-zinc-900/40',
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Checkbox */}
      <button
        onClick={handleComplete}
        disabled={task.status === 'completed' || completing}
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
          'hover:scale-110 active:scale-95',
          task.status === 'completed'
            ? 'bg-emerald-500 border-emerald-500'
            : completing
            ? 'bg-emerald-500/50 border-emerald-500/50'
            : 'border-zinc-600 hover:border-emerald-500'
        )}
      >
        <AnimatePresence>
          {(task.status === 'completed' || completing) && (
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
        task.priority === 'medium' ? 'bg-amber-400' : 'bg-zinc-600'
      )} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium truncate',
          task.status === 'completed' ? 'line-through text-zinc-500' : 'text-zinc-100'
        )}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.due_at && (
            <span className={cn(
              'text-xs flex items-center gap-1',
              overdue ? 'text-red-400' : 'text-zinc-500'
            )}>
              <Clock size={10} />
              {formatDate(task.due_at)}
            </span>
          )}
          {task.tags?.length > 0 && (
            <div className="flex gap-1">
              {task.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {task.estimate_minutes && (
            <span className="text-xs text-zinc-600 font-mono">
              {task.estimate_minutes}m
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      {task.status === 'in_progress' && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/20 font-medium">
          Active
        </span>
      )}

      {/* Actions */}
      <AnimatePresence>
        {showActions && task.status !== 'completed' && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.12 }}
            className="flex items-center gap-1 titlebar-no-drag"
          >
            {task.status !== 'in_progress' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onStart(task.id)}
                title="Start task (focus mode)"
                className="w-7 h-7 p-0"
              >
                <Play size={12} />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSnooze(task.id, 30)}
              title="Snooze 30 min"
              className="w-7 h-7 p-0"
            >
              <AlarmClock size={12} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(task.id)}
              title="Delete task"
              className="w-7 h-7 p-0 text-red-500 hover:text-red-400"
            >
              <Trash2 size={12} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
