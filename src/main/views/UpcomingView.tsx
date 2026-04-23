import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ipc } from '@/lib/ipc'
import { Task } from '@/hooks/useTasks'
import { pageTransition } from '@/lib/animations'
import { TaskSkeletonList } from '@/components/ui/Skeleton'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { Clock, CheckSquare2, AlertTriangle, Circle, Siren } from 'lucide-react'

export function UpcomingView() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ipc.invoke<Task[]>('tasks:upcoming').then(data => {
      setTasks(data)
      setLoading(false)
    })
  }, [])

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
                <div className="space-y-1">
                  {overdue.map(task => <UpcomingTaskRow key={task.id} task={task} overdue />)}
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
                    className={cn('text-xs font-semibold uppercase tracking-wider', group.isToday ? 'text-indigo-400' : '')}
                    style={group.isToday ? {} : { color: 'var(--tf-text-muted)' }}
                  >
                    {group.label}
                  </span>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded-md" style={{ background: 'var(--tf-bg-tertiary)', color: 'var(--tf-text-muted)' }}>
                    {group.tasks.length}
                  </span>
                </div>
                <div className="space-y-1">
                  {group.tasks.map(task => <UpcomingTaskRow key={task.id} task={task} />)}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </motion.div>
  )
}

function UpcomingTaskRow({ task, overdue: isOverdueRow }: { task: Task; overdue?: boolean }) {
  const overdue = isOverdueRow || (isOverdue(task.due_at) && task.status !== 'completed')
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors"
      style={{
        background: overdue ? 'rgba(239,68,68,0.05)' : 'var(--tf-card-bg)',
        borderColor: overdue ? 'rgba(239,68,68,0.25)' : 'var(--tf-card-border)',
      }}
    >
      <div className={cn(
        'w-1.5 h-1.5 rounded-full flex-shrink-0',
        task.priority === 'critical' ? 'bg-red-500' :
        task.priority === 'medium' ? 'bg-amber-400' : 'bg-zinc-500'
      )} />

      <span className="text-sm flex-1 truncate" style={{ color: 'var(--tf-text)' }}>{task.title}</span>

      {task.tags?.length > 0 && (
        <div className="hidden sm:flex gap-1">
          {task.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'var(--tf-bg-tertiary)', color: 'var(--tf-text-muted)' }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {task.priority === 'critical' && (
        <AlertTriangle size={11} className="text-red-400 flex-shrink-0" />
      )}

      {task.estimate_minutes ? (
        <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--tf-text-faint)' }}>
          {task.estimate_minutes}m
        </span>
      ) : null}

      {task.due_at && (
        <span className={cn('text-xs font-mono flex items-center gap-1 flex-shrink-0', overdue ? 'text-red-400' : '')}
          style={overdue ? {} : { color: 'var(--tf-text-faint)' }}>
          <Clock size={10} />
          {overdue
            ? formatDate(task.due_at)
            : new Date(task.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        </span>
      )}
    </div>
  )
}
