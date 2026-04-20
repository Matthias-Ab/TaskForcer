import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAllTasks } from '@/hooks/useTasks'
import { pageTransition, spring } from '@/lib/animations'
import { cn } from '@/lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarView() {
  const [current, setCurrent] = useState(new Date())
  const [direction, setDirection] = useState(0)
  const { tasks } = useAllTasks()

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
    const d = new Date(current)
    d.setMonth(d.getMonth() + dir)
    setCurrent(d)
  }

  function getTasksForDay(day: number) {
    const d = new Date(year, month, day)
    const start = d.setHours(0, 0, 0, 0)
    const end = new Date(year, month, day).setHours(23, 59, 59, 999)
    return tasks.filter(t => t.due_at && t.due_at >= start && t.due_at <= end)
  }

  const today = new Date()
  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === month && today.getFullYear() === year

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
        <h1 className="text-lg font-semibold text-zinc-100">Calendar</h1>
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            <motion.span
              key={monthName}
              initial={{ opacity: 0, y: direction > 0 ? 10 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direction > 0 ? -10 : 10 }}
              transition={{ duration: 0.2 }}
              className="text-sm font-medium text-zinc-300 w-44 text-center"
            >
              {monthName}
            </motion.span>
          </AnimatePresence>
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-zinc-600 py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
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

              return (
                <motion.div
                  key={`${year}-${month}-${day}`}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.1 }}
                  className={cn(
                    'min-h-[72px] p-2 rounded-xl border text-xs cursor-pointer',
                    isToday(day)
                      ? 'border-indigo-500/50 bg-indigo-600/10'
                      : 'border-zinc-800/40 bg-zinc-900/30 hover:border-zinc-700/60 hover:bg-zinc-800/30'
                  )}
                >
                  <div className={cn(
                    'font-medium mb-1.5',
                    isToday(day) ? 'text-indigo-300' : 'text-zinc-400'
                  )}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 3).map(t => (
                      <div
                        key={t.id}
                        className={cn(
                          'truncate rounded px-1 py-0.5 text-[10px]',
                          t.status === 'completed' ? 'text-zinc-600 line-through' :
                          t.priority === 'critical' ? 'text-red-400 bg-red-500/10' :
                          t.priority === 'medium' ? 'text-amber-400 bg-amber-400/10' :
                          'text-zinc-400 bg-zinc-800/60'
                        )}
                      >
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-[10px] text-zinc-600">+{dayTasks.length - 3} more</div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
