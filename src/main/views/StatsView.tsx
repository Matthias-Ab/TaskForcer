import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
  BarChart, Bar, Legend,
} from 'recharts'
import { useScoreHistory, useTodayScore } from '@/hooks/useScore'
import { useXP } from '@/hooks/useXP'
import { ipc } from '@/lib/ipc'
import { motion } from 'framer-motion'
import { pageTransition } from '@/lib/animations'
import { Flame, TrendingUp, CheckSquare2, Star, Zap, Target, Snowflake, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HourData { hour: number; count: number }
interface ShameTrendPoint { date: string; distraction?: number; skipped_checkin?: number; missed_task?: number; late_completion?: number; excuse?: number }
interface EstimateAccuracy { sampleSize: number; avgRatio: number | null; overestimatedPct: number; underestimatedPct: number }
interface DayOfWeekStat { day: string; avgScore: number | null; sampleSize: number }
interface ProjectStat { project_id: string; name: string; color: string; emoji: string; total_tasks: number; completed_tasks: number; total_elapsed_seconds: number }
interface FreezeEntry { date: string; streak_day: number }
interface WeekOverWeek { thisWeekAvg: number | null; lastWeekAvg: number | null; deltaPct: number | null }

const SHAME_TYPE_COLORS: Record<string, string> = {
  distraction: '#f59e0b',
  skipped_checkin: '#fb923c',
  missed_task: '#ef4444',
  late_completion: '#71717a',
  excuse: '#a855f7',
}
const SHAME_TYPE_LABELS: Record<string, string> = {
  distraction: 'Distraction',
  skipped_checkin: 'Skipped check-in',
  missed_task: 'Missed task',
  late_completion: 'Late completion',
  excuse: 'Excuse',
}

export function StatsView() {
  const history = useScoreHistory(30)
  const today = useTodayScore()
  const { xp } = useXP()
  const [focusDna, setFocusDna] = useState<HourData[]>([])
  const [shameTrend, setShameTrend] = useState<ShameTrendPoint[]>([])
  const [estimateAccuracy, setEstimateAccuracy] = useState<EstimateAccuracy | null>(null)
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeekStat[]>([])
  const [projectStats, setProjectStats] = useState<ProjectStat[]>([])
  const [freezeHistory, setFreezeHistory] = useState<FreezeEntry[]>([])
  const [weekOverWeek, setWeekOverWeek] = useState<WeekOverWeek | null>(null)

  useEffect(() => {
    ipc.invoke<HourData[]>('scores:focus-dna').then(setFocusDna).catch(() => {})
    ipc.invoke<ShameTrendPoint[]>('scores:shame-trend', 30).then(setShameTrend).catch(() => {})
    ipc.invoke<EstimateAccuracy>('scores:estimate-accuracy').then(setEstimateAccuracy).catch(() => {})
    ipc.invoke<DayOfWeekStat[]>('scores:day-of-week', 90).then(setDayOfWeek).catch(() => {})
    ipc.invoke<ProjectStat[]>('scores:by-project').then(setProjectStats).catch(() => {})
    ipc.invoke<FreezeEntry[]>('scores:freeze-history').then(setFreezeHistory).catch(() => {})
    ipc.invoke<WeekOverWeek>('scores:week-over-week').then(setWeekOverWeek).catch(() => {})
  }, [])

  const rankedDays = dayOfWeek.filter(d => d.avgScore !== null).sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
  const bestDay = rankedDays[0]
  const worstDay = rankedDays[rankedDays.length - 1]

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
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
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

        {/* Week over week */}
        {weekOverWeek && (weekOverWeek.thisWeekAvg !== null || weekOverWeek.lastWeekAvg !== null) && (
          <div className="rounded-2xl border p-4 flex items-center justify-between" style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-card-bg)' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>This Week vs Last Week</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--tf-text-muted)' }}>
                {weekOverWeek.thisWeekAvg ?? '--'}/100 avg this week · {weekOverWeek.lastWeekAvg ?? '--'}/100 last week
              </p>
            </div>
            {weekOverWeek.deltaPct !== null && (
              <div className={cn('flex items-center gap-1 text-sm font-mono font-bold',
                weekOverWeek.deltaPct > 0 ? 'text-emerald-400' : weekOverWeek.deltaPct < 0 ? 'text-red-400' : 'text-zinc-400'
              )}>
                {weekOverWeek.deltaPct > 0 ? <ArrowUp size={14} /> : weekOverWeek.deltaPct < 0 ? <ArrowDown size={14} /> : <Minus size={14} />}
                {Math.abs(weekOverWeek.deltaPct)}%
              </div>
            )}
          </div>
        )}

        {/* Shame trend */}
        {shameTrend.length > 0 && (
          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-card-bg)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--tf-text)' }}>Shame Log Trend (30 days)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={shameTrend.map(d => ({ ...d, date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--tf-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--tf-text-faint)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--tf-text-faint)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--tf-dialog-bg)', border: '1px solid var(--tf-border)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value: string) => SHAME_TYPE_LABELS[value] || value} />
                {Object.keys(SHAME_TYPE_COLORS).map(type => (
                  <Bar key={type} dataKey={type} stackId="shame" fill={SHAME_TYPE_COLORS[type]} radius={[0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Estimate accuracy */}
          {estimateAccuracy && estimateAccuracy.sampleSize > 0 && (
            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-card-bg)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Target size={15} className="text-indigo-400" />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>Estimate Accuracy</h2>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--tf-text-muted)' }}>
                Based on {estimateAccuracy.sampleSize} completed task{estimateAccuracy.sampleSize !== 1 ? 's' : ''} with logged time
              </p>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-mono font-bold" style={{ color: 'var(--tf-text)' }}>
                  {estimateAccuracy.avgRatio !== null ? `${Math.round(estimateAccuracy.avgRatio * 100)}%` : '--'}
                </span>
                <span className="text-xs" style={{ color: 'var(--tf-text-faint)' }}>of estimated time, on average</span>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-amber-400">{estimateAccuracy.underestimatedPct}% underestimated</span>
                <span className="text-emerald-400">{estimateAccuracy.overestimatedPct}% overestimated</span>
              </div>
            </div>
          )}

          {/* Best/worst day of week */}
          {rankedDays.length > 0 && (
            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-card-bg)' }}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--tf-text)' }}>Best &amp; Worst Days</h2>
              <div className="space-y-2">
                {bestDay && (
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--tf-text-muted)' }}>Best day</span>
                    <span className="font-mono font-semibold text-emerald-400">{bestDay.day} · {bestDay.avgScore}/100</span>
                  </div>
                )}
                {worstDay && worstDay.day !== bestDay?.day && (
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--tf-text-muted)' }}>Worst day</span>
                    <span className="font-mono font-semibold text-red-400">{worstDay.day} · {worstDay.avgScore}/100</span>
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={dayOfWeek}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--tf-text-faint)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--tf-dialog-bg)', border: '1px solid var(--tf-border)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="avgScore" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Per-project stats */}
        {projectStats.length > 0 && (
          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-card-bg)' }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--tf-text)' }}>By Project</h2>
            <div className="space-y-2">
              {projectStats.map(p => {
                const pct = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0
                const hours = Math.round(p.total_elapsed_seconds / 3600 * 10) / 10
                return (
                  <div key={p.project_id} className="flex items-center gap-3 text-sm">
                    <span className="flex-shrink-0">{p.emoji || '📁'}</span>
                    <span className="flex-1 truncate" style={{ color: 'var(--tf-text)' }}>{p.name}</span>
                    <span className="text-xs font-mono" style={{ color: 'var(--tf-text-faint)' }}>{p.completed_tasks}/{p.total_tasks} · {hours}h</span>
                    <div className="w-16 h-1.5 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'var(--tf-bg-tertiary)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Streak freeze history */}
        {freezeHistory.length > 0 && (
          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-card-bg)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Snowflake size={14} className="text-cyan-400" />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>Streak Freezes Used</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {freezeHistory.map(f => (
                <span key={f.date} className="text-xs px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (day {f.streak_day})
                </span>
              ))}
            </div>
          </div>
        )}
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
