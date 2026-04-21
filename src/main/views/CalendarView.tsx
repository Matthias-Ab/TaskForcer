import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useAllTasks } from '@/hooks/useTasks'
import { useTaskContext } from '@/contexts/TaskContext'
import { CreateTaskForm } from '@/components/CreateTaskForm'
import { Task } from '@/hooks/useTasks'
import { pageTransition, spring, scaleIn } from '@/lib/animations'
import { cn, formatDate, isOverdue } from '@/lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarView() {
  const [current, setCurrent] = useState(new Date())
  const [direction, setDirection] = useState(0)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const { tasks } = useAllTasks()
  const { createTask, completeTask } = useTaskContext()

  const year = current.getFullYear()
  const month = current.getMonth()
  const monthName = current.toLocaleString('default', { month: 'long', year: 'numeric' })

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, i) => {
    const day = i - firstDay + 1
    return day > 0 && day <= daysInMonth ? day : null
  })

  function navigate(dir: number) {
    setDirection(dir)
    setSelectedDay(null)
    const d = new Date(current)
    d.setMonth(d.getMonth() + dir)
    setCurrent(d)
  }

  function getTasksForDay(day: number): Task[] {
    const start = new Date(year, month, day, 0, 0, 0, 0).getTime()
    const end = new Date(year, month, day, 23, 59, 59, 999).getTime()
    return tasks.filter(t => t.due_at && t.due_at >= start && t.due_at <= end)
  }

  const today = new Date()
  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === month && today.getFullYear() === year

  const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : []
  const selectedDate = selectedDay ? new Date(year, month, selectedDay) : null

  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex h-full overflow-hidden"
    >
      {/* Main calendar area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--tf-border)' }}>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--tf-text)' }}>Calendar</h1>
          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              <motion.span
                key={monthName}
                initial={{ opacity: 0, y: direction > 0 ? 10 : -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction > 0 ? -10 : 10 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-medium w-44 text-center"
                style={{ color: 'var(--tf-text)' }}
              >
                {monthName}
              </motion.span>
            </AnimatePresence>
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--tf-text-muted)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--tf-bg-tertiary)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => navigate(1)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--tf-text-muted)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--tf-bg-tertiary)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium py-1" style={{ color: 'var(--tf-text-faint)' }}>{d}</div>
            ))}
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`${year}-${month}`}
              custom={direction}
              initial={{ opacity: 0, x: direction * 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 30 }}
              transition={spring}
              className="grid grid-cols-7 gap-1"
            >
              {cells.map((day, i) => {
                if (!day) return <div key={i} />
                const dayTasks = getTasksForDay(day)
                const isSelected = selectedDay === day

                return (
                  <motion.div
                    key={`${year}-${month}-${day}`}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.1 }}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={cn(
                      'min-h-[72px] p-2 rounded-xl border text-xs cursor-pointer transition-colors',
                      isSelected ? 'border-indigo-500/60 ring-1 ring-indigo-500/30' : ''
                    )}
                    style={{
                      borderColor: isToday(day) ? 'rgba(99,102,241,0.5)' : isSelected ? undefined : 'var(--tf-card-border)',
                      background: isToday(day) ? 'rgba(99,102,241,0.08)' : isSelected ? 'var(--tf-bg-secondary)' : 'var(--tf-card-bg)',
                    }}
                  >
                    <div className={cn('font-medium mb-1.5', isToday(day) ? 'text-indigo-400' : '')} style={!isToday(day) ? { color: 'var(--tf-text-muted)' } : {}}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayTasks.slice(0, 3).map(t => (
                        <div
                          key={t.id}
                          className={cn(
                            'truncate rounded px-1 py-0.5 text-[10px]',
                            t.status === 'completed' ? 'line-through opacity-50' :
                            t.priority === 'critical' ? 'text-red-400 bg-red-500/10' :
                            t.priority === 'medium' ? 'text-amber-400 bg-amber-400/10' : ''
                          )}
                          style={t.priority === 'low' && t.status !== 'completed' ? { color: 'var(--tf-text-muted)', background: 'var(--tf-bg-tertiary)' } : {}}
                        >
                          {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-[10px]" style={{ color: 'var(--tf-text-faint)' }}>+{dayTasks.length - 3} more</div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Day side panel */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            variants={scaleIn}
            initial={{ opacity: 0, x: 24, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 300 }}
            exit={{ opacity: 0, x: 24, width: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 border-l flex flex-col overflow-hidden"
            style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-bg-secondary)' }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--tf-border)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>
                  {selectedDate?.toLocaleDateString('en-US', { weekday: 'long' })}
                </p>
                <p className="text-xs" style={{ color: 'var(--tf-text-muted)' }}>
                  {selectedDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: 'var(--tf-text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--tf-bg-tertiary)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <X size={14} />
              </button>
            </div>

            {/* Tasks for day */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {selectedDayTasks.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: 'var(--tf-text-faint)' }}>No tasks this day</p>
              ) : (
                selectedDayTasks.map(task => (
                  <DayTask key={task.id} task={task} onComplete={completeTask} />
                ))
              )}
            </div>

            {/* Quick add */}
            <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--tf-border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--tf-text-faint)' }}>Add task</p>
              <CreateTaskForm
                compact
                onSubmit={async (data) => {
                  const due = new Date(year, month, selectedDay!, 9, 0, 0)
                  await createTask({ ...data, due_at: data.due_at || due.getTime() })
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function DayTask({ task, onComplete }: { task: Task; onComplete: (id: string) => void }) {
  const overdue = isOverdue(task.due_at) && task.status !== 'completed'
  return (
    <div
      className="flex items-start gap-2 px-3 py-2 rounded-xl border transition-colors"
      style={{ borderColor: 'var(--tf-card-border)', background: 'var(--tf-card-bg)' }}
    >
      <button
        onClick={() => onComplete(task.id)}
        disabled={task.status === 'completed'}
        className={cn(
          'mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all hover:scale-110',
          task.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-500 hover:border-emerald-500'
        )}
      >
        {task.status === 'completed' && (
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-medium truncate', task.status === 'completed' ? 'line-through' : '')}
          style={{ color: task.status === 'completed' ? 'var(--tf-text-faint)' : 'var(--tf-text)' }}
        >
          {task.title}
        </p>
        {task.due_at && (
          <p
            className={cn('text-[10px] mt-0.5', overdue ? 'text-red-400' : '')}
            style={overdue ? {} : { color: 'var(--tf-text-faint)' }}
          >
            {formatDate(task.due_at)}
          </p>
        )}
      </div>
      <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5',
        task.priority === 'critical' ? 'bg-red-500' :
        task.priority === 'medium' ? 'bg-amber-400' : 'bg-zinc-500'
      )} />
    </div>
  )
}
