import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ipc } from '@/lib/ipc'
import { Task } from '@/hooks/useTasks'
import { useHabitStreaks } from '@/hooks/useHabitStreaks'
import { pageTransition } from '@/lib/animations'
import { CheckSquare2, Clock, Flame, TrendingUp, Star, AlertTriangle, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DayStats {
  label: string
  completed: number
  total: number
  pct: number
}

export function WeeklyReviewView() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const { chains: habitChains } = useHabitStreaks()

  useEffect(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    ipc.invoke<Task[]>('tasks:list').then(all => {
      setTasks(all.filter(t => t.created_at >= weekAgo || (t.completed_at && t.completed_at >= weekAgo)))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const completed = tasks.filter(t => t.status === 'completed' && t.completed_at && t.completed_at >= weekAgo)
  const missed = tasks.filter(t => t.status !== 'completed' && t.due_at && t.due_at >= weekAgo && t.due_at < Date.now())
  const totalEstimated = completed.reduce((s, t) => s + (t.estimate_minutes || 0), 0)
  const totalElapsed = completed.reduce((s, t) => s + Math.round((t.elapsed_seconds || 0) / 60), 0)

  // Per-day breakdown
  const days: DayStats[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000)
    d.setHours(0, 0, 0, 0)
    const end = new Date(d); end.setHours(23, 59, 59, 999)
    const dayTasks = tasks.filter(t => t.due_at && t.due_at >= d.getTime() && t.due_at <= end.getTime())
    const dayDone = dayTasks.filter(t => t.status === 'completed').length
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      completed: dayDone,
      total: dayTasks.length,
      pct: dayTasks.length > 0 ? dayDone / dayTasks.length : 0,
    }
  })

  const bestDay = days.reduce((b, d) => d.completed > b.completed ? d : b, days[0])
  const completionRate = tasks.filter(t => t.due_at && t.due_at >= weekAgo).length > 0
    ? Math.round(completed.length / tasks.filter(t => t.due_at && t.due_at >= weekAgo).length * 100)
    : 0

  const topTags: Record<string, number> = {}
  for (const t of completed) for (const tag of (t.tags || [])) topTags[tag] = (topTags[tag] || 0) + 1
  const sortedTags = Object.entries(topTags).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <motion.div variants={pageTransition} initial="hidden" animate="visible" exit="exit" className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--tf-border)' }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--tf-text)' }}>Weekly Review</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--tf-text-muted)' }}>
            {new Date(weekAgo).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {loading ? (
          <div className="space-y-3">{Array.from({length:4}).map((_,i)=><div key={i} className="h-20 rounded-xl animate-pulse" style={{background:'var(--tf-bg-tertiary)'}}/>)}</div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <ReviewCard label="Completed" value={String(completed.length)} icon={<CheckSquare2 size={15} className="text-emerald-400" />} color="text-emerald-400" />
              <ReviewCard label="Completion Rate" value={`${completionRate}%`} icon={<TrendingUp size={15} className="text-indigo-400" />} color="text-indigo-400" />
              <ReviewCard label="Missed" value={String(missed.length)} icon={<AlertTriangle size={15} className="text-red-400" />} color="text-red-400" />
              <ReviewCard label="Time Logged" value={totalElapsed > 0 ? `${Math.floor(totalElapsed/60)}h ${totalElapsed%60}m` : `~${Math.floor(totalEstimated/60)}h est`} icon={<Clock size={15} className="text-amber-400" />} color="text-amber-400" />
            </div>

            {/* Day-by-day bars */}
            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-card-bg)' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--tf-text)' }}>Daily Completion</h2>
              <div className="flex items-end gap-2 h-24">
                {days.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center" style={{ height: 72 }}>
                      <motion.div
                        className={cn('w-full rounded-t-lg', d.label === bestDay.label && d.completed > 0 ? 'bg-emerald-500' : 'bg-indigo-500/40')}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(d.pct * 100, d.total > 0 ? 8 : 0)}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                      />
                    </div>
                    <span className="text-[10px]" style={{ color: 'var(--tf-text-faint)' }}>{d.label}</span>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--tf-text-muted)' }}>{d.completed}/{d.total}</span>
                  </div>
                ))}
              </div>
              {bestDay.completed > 0 && (
                <p className="text-xs mt-3" style={{ color: 'var(--tf-text-muted)' }}>
                  <Flame size={11} className="inline text-amber-400 mr-1" />
                  Best day: <span className="font-semibold" style={{ color: 'var(--tf-text)' }}>{bestDay.label}</span> — {bestDay.completed} tasks
                </p>
              )}
            </div>

            {/* Habit streaks */}
            {habitChains.length > 0 && (
              <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-card-bg)' }}>
                <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--tf-text)' }}>
                  <Flame size={13} className="inline text-orange-400 mr-1" />
                  Habit Streaks
                </h2>
                <div className="space-y-1.5">
                  {habitChains.map(chain => (
                    <div key={chain.rootId} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'var(--tf-bg-tertiary)' }}>
                      <span className="text-sm flex-1 truncate" style={{ color: 'var(--tf-text)' }}>{chain.title}</span>
                      {chain.nagEnabled && <Bell size={10} className="text-amber-400 flex-shrink-0" />}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md text-indigo-400 flex-shrink-0" style={{ background: 'var(--tf-bg-secondary, var(--tf-card-bg))' }}>
                        {chain.recurrenceRule}
                      </span>
                      <span className="text-[10px] font-mono flex-shrink-0" style={{ color: 'var(--tf-text-faint)' }}>
                        {chain.completedCount}/{chain.totalCount}
                      </span>
                      <span className={cn('flex items-center gap-1 text-xs font-mono font-bold tabular-nums flex-shrink-0', chain.streak > 0 ? 'text-orange-400' : '')} style={chain.streak > 0 ? {} : { color: 'var(--tf-text-faint)' }}>
                        <Flame size={11} className={chain.streak > 0 ? 'text-orange-400' : ''} style={chain.streak > 0 ? {} : { color: 'var(--tf-text-faint)' }} />
                        {chain.streak}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top tags */}
            {sortedTags.length > 0 && (
              <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-card-bg)' }}>
                <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--tf-text)' }}>
                  <Star size={13} className="inline text-indigo-400 mr-1" />
                  Most Productive Areas
                </h2>
                <div className="space-y-2">
                  {sortedTags.map(([tag, count]) => (
                    <div key={tag} className="flex items-center gap-3">
                      <span className="text-xs px-2 py-0.5 rounded-lg text-indigo-400" style={{ background: 'var(--tf-bg-tertiary)', minWidth: 80 }}>#{tag}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--tf-bg-tertiary)' }}>
                        <motion.div
                          className="h-full rounded-full bg-indigo-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${(count / (sortedTags[0][1])) * 100}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <span className="text-xs font-mono w-6 text-right" style={{ color: 'var(--tf-text-muted)' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed tasks list */}
            {completed.length > 0 && (
              <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-card-bg)' }}>
                <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--tf-text)' }}>Completed This Week</h2>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {completed.map(t => (
                    <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--tf-bg-tertiary)' }}>
                      <CheckSquare2 size={12} className="text-emerald-500 flex-shrink-0" />
                      <span className="text-sm flex-1 truncate line-through" style={{ color: 'var(--tf-text-faint)' }}>{t.title}</span>
                      {t.elapsed_seconds > 0 && (
                        <span className="text-[10px] font-mono flex-shrink-0" style={{ color: 'var(--tf-text-faint)' }}>
                          {Math.round(t.elapsed_seconds / 60)}m
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missed tasks */}
            {missed.length > 0 && (
              <div className="rounded-2xl border p-4" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}>
                <h2 className="text-sm font-semibold mb-3 text-red-400">Missed This Week</h2>
                <div className="space-y-1.5">
                  {missed.slice(0, 8).map(t => (
                    <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--tf-bg-tertiary)' }}>
                      <AlertTriangle size={11} className="text-red-400 flex-shrink-0" />
                      <span className="text-sm flex-1 truncate" style={{ color: 'var(--tf-text)' }}>{t.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}

function ReviewCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border px-4 py-3" style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-card-bg)' }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--tf-text-muted)' }}>{icon}<span className="text-xs">{label}</span></div>
      <span className={cn('text-2xl font-mono font-bold tabular-nums', color)}>{value}</span>
    </div>
  )
}
