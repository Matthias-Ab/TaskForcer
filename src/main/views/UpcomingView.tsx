import { useState, useEffect } from 'react'
import { FixedSizeList as List, ListChildComponentProps } from 'react-window'
import { motion } from 'framer-motion'
import { ipc } from '@/lib/ipc'
import { Task } from '@/hooks/useTasks'
import { pageTransition } from '@/lib/animations'
import { TaskSkeletonList } from '@/components/ui/Skeleton'
import { priorityColor, cn } from '@/lib/utils'
import { Clock, CheckSquare2 } from 'lucide-react'

export function UpcomingView() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ipc.invoke<Task[]>('tasks:upcoming').then(data => {
      setTasks(data)
      setLoading(false)
    })
  }, [])

  // Group by day
  const groups: { date: string; tasks: Task[] }[] = []
  for (const task of tasks) {
    if (!task.due_at) continue
    const date = new Date(task.due_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    const existing = groups.find(g => g.date === date)
    if (existing) existing.tasks.push(task)
    else groups.push({ date, tasks: [task] })
  }

  // Flatten for virtualization
  type FlatItem = { type: 'header'; date: string } | { type: 'task'; task: Task }
  const flat: FlatItem[] = []
  for (const group of groups) {
    flat.push({ type: 'header', date: group.date })
    for (const task of group.tasks) flat.push({ type: 'task', task })
  }

  const ITEM_SIZE = 56

  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col h-full overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/40 flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Upcoming</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Next 7 days · {tasks.length} tasks</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-6 py-4">
        {loading ? (
          <TaskSkeletonList count={8} />
        ) : flat.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <CheckSquare2 size={36} className="text-zinc-600 mb-3" />
            <p className="text-zinc-500 text-sm">No upcoming tasks in the next 7 days.</p>
          </div>
        ) : flat.length > 50 ? (
          <List
            height={600}
            itemCount={flat.length}
            itemSize={ITEM_SIZE}
            width="100%"
          >
            {({ index, style }: ListChildComponentProps) => {
              const item = flat[index]
              if (item.type === 'header') {
                return (
                  <div style={style} className="flex items-center pt-3 pb-1">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{item.date}</span>
                  </div>
                )
              }
              return (
                <div style={style}>
                  <UpcomingTaskRow task={item.task} />
                </div>
              )
            }}
          </List>
        ) : (
          <div className="space-y-4">
            {groups.map(group => (
              <div key={group.date}>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">{group.date}</p>
                <div className="space-y-1">
                  {group.tasks.map(task => <UpcomingTaskRow key={task.id} task={task} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function UpcomingTaskRow({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-zinc-800/40 bg-zinc-900/30 hover:border-zinc-700/60 transition-colors">
      <div className={cn(
        'w-1.5 h-1.5 rounded-full flex-shrink-0',
        task.priority === 'critical' ? 'bg-red-500' :
        task.priority === 'medium' ? 'bg-amber-400' : 'bg-zinc-600'
      )} />
      <span className="text-sm text-zinc-200 flex-1 truncate">{task.title}</span>
      <span className={cn('text-xs flex items-center gap-1', priorityColor(task.priority))}>
        {task.priority}
      </span>
      {task.due_at && (
        <span className="text-xs text-zinc-500 font-mono flex items-center gap-1">
          <Clock size={10} />
          {new Date(task.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  )
}
