import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts'
import { useScoreHistory, useTodayScore } from '@/hooks/useScore'
import { useXP } from '@/hooks/useXP'
import { ipc } from '@/lib/ipc'
import { motion } from 'framer-motion'
import { pageTransition } from '@/lib/animations'
import { Flame, TrendingUp, CheckSquare2, Star, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HourData { hour: number; count: number }

export function StatsView() {
  const history = useScoreHistory(30)
  const today = useTodayScore()
  const { xp } = useXP()
  const [focusDna, setFocusDna] = useState<HourData[]>([])

  useEffect(() => {
    ipc.invoke<HourData[]>('scores:focus-dna').then(setFocusDna).catch(() => {})
  }, [])

  const avgScore = history.length > 0
    ? Math.round(history.reduce((s, d) => s + d.score, 0) / history.length)
    : 0

  const chartData = history.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: Math.round(d.score),
    completion: Math.round(d.completion_pct),
    focus: Math.round(d.focus_pct),
  }))

  const maxDnaCount = Math.max(...focusDna.map(h => h.count), 1)
  const peakHour = focusDna.reduce((best, h) => h.count > best.count ? h : best, { hour: -1, count: 0 })

  function formatHour(h: number) {
    if (h === 0) return '12am'
    if (h === 12) return '12pm'
    return h < 12 ? `${h}am` : `${h - 12}pm`
  }

  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col h-full overflow-hidden"
    >
      <div className="flex items-center px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--tf-border)' }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--tf-text)' }}>Stats</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--tf-text-muted)' }}>Last 30 days performance</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            label="Today's Score"
            value={today ? `${Math.round(today.score)}` : '--'}
            suffix="/100"
            color={!today ? '' : today.score >= 80 ? 'text-emerald-400' : today.score >= 50 ? 'text-amber-400' : 'text-red-400'}
            icon={<TrendingUp size={16} />}
          />
          <StatCard
            label="Streak"
            value={today?.streak_day?.toString() || '0'}
            suffix=" days"
            color="text-amber-400"
            icon={<Flame size={16} />}
          />
          <StatCard
            label="30-day Avg"
            value={avgScore.toString()}
            suffix="/100"
            color="text-indigo-400"
            icon={<TrendingUp size={16} />}
          />
          <StatCard
            label="Completion"
            value={today ? `${Math.round(today.completion_pct)}` : '--'}
            suffix="%"
            color="text-emerald-400"
            icon={<CheckSquare2 size={16} />}
          />
        </div>

        {/* XP / Level card */}
        {xp && (
          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-card-bg)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star size={16} className="text-indigo-400" />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>
                  Level {xp.level} — {xp.level_title}
                </h2>
              </div>
              <div className="flex items-center gap-1 text-indigo-400">
                <Zap size={13} />
                <span className="text-sm font-mono font-bold">{xp.total_xp.toLocaleString()} XP</span>
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--tf-bg-tertiary)' }}>
              <motion.div
                className="h-full rounded-full bg-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${xp.xp_pct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px]" style={{ color: 'var(--tf-text-faint)' }}>{xp.xp_in_level} XP</span>
              <span className="text-[10px]" style={{ color: 'var(--tf-text-faint)' }}>{xp.xp_for_next} XP to next level</span>
            </div>
          </div>
        )}

        {/* Score chart */}
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-card-bg)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--tf-text)' }}>Daily Score (30 days)</h2>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm" style={{ color: 'var(--tf-text-faint)' }}>No data yet. Keep using TaskForcer!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--tf-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--tf-text-faint)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--tf-text-faint)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--tf-dialog-bg)', border: '1px solid var(--tf-border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--tf-text-muted)' }}
                />
                <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} fill="url(#scoreGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Completion vs Focus */}
        {chartData.length > 0 && (
          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-card-bg)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--tf-text)' }}>Completion vs Focus %</h2>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--tf-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--tf-text-faint)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--tf-text-faint)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--tf-dialog-bg)', border: '1px solid var(--tf-border)', borderRadius: 8, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="completion" stroke="#10b981" strokeWidth={2} dot={false} name="Completion %" />
                <Line type="monotone" dataKey="focus" stroke="#f59e0b" strokeWidth={2} dot={false} name="Focus %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Focus DNA */}
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-card-bg)' }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>Focus DNA</h2>
            {peakHour.hour >= 0 && peakHour.count > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">
                Peak: {formatHour(peakHour.hour)}
              </span>
            )}
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--tf-text-muted)' }}>
            When you complete tasks throughout the day
          </p>
          {focusDna.every(h => h.count === 0) ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--tf-text-faint)' }}>
              Complete tasks to see your productivity patterns
            </p>
          ) : (
            <div className="flex items-end gap-0.5 h-16">
              {focusDna.map(h => {
                const heightPct = maxDnaCount > 0 ? h.count / maxDnaCount : 0
                const isPeak = h.hour === peakHour.hour && h.count > 0
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative" title={`${formatHour(h.hour)}: ${h.count} task${h.count !== 1 ? 's' : ''}`}>
                    <div className="w-full flex items-end" style={{ height: 48 }}>
                      <motion.div
                        className={cn('w-full rounded-t-sm', isPeak ? 'bg-indigo-500' : 'bg-indigo-500/30')}
                        style={{ height: `${Math.max(heightPct * 100, h.count > 0 ? 8 : 0)}%` }}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(heightPct * 100, h.count > 0 ? 8 : 0)}%` }}
                        transition={{ duration: 0.6, delay: h.hour * 0.02 }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {/* Hour labels - show every 6h */}
          <div className="flex mt-1">
            {focusDna.map(h => (
              <div key={h.hour} className="flex-1 text-center">
                {h.hour % 6 === 0 && (
                  <span className="text-[9px]" style={{ color: 'var(--tf-text-faint)' }}>{formatHour(h.hour)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function StatCard({ label, value, suffix, color, icon }: {
  label: string; value: string; suffix?: string; color: string; icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border px-4 py-3" style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-card-bg)' }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--tf-text-muted)' }}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn('text-2xl font-mono font-bold tabular-nums', color)} style={!color ? { color: 'var(--tf-text)' } : {}}>{value}</span>
        {suffix && <span className="text-sm" style={{ color: 'var(--tf-text-faint)' }}>{suffix}</span>}
      </div>
    </div>
  )
}
