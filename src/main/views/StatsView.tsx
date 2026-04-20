import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts'
import { useScoreHistory, useTodayScore } from '@/hooks/useScore'
import { pageTransition } from '@/lib/animations'
import { Flame, TrendingUp, CheckSquare2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StatsView() {
  const history = useScoreHistory(30)
  const today = useTodayScore()

  const avgScore = history.length > 0
    ? Math.round(history.reduce((s, d) => s + d.score, 0) / history.length)
    : 0

  const chartData = history.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: Math.round(d.score),
    completion: Math.round(d.completion_pct),
    focus: Math.round(d.focus_pct),
  }))

  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col h-full overflow-hidden"
    >
      <div className="flex items-center px-6 py-4 border-b border-zinc-800/40 flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Stats</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Last 30 days performance</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            label="Today's Score"
            value={today ? `${Math.round(today.score)}` : '--'}
            suffix="/100"
            color={!today ? 'text-zinc-400' : today.score >= 80 ? 'text-emerald-400' : today.score >= 50 ? 'text-amber-400' : 'text-red-400'}
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

        {/* Score chart */}
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Daily Score (30 days)</h2>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-zinc-600 text-sm">No data yet. Keep using TaskForcer!</p>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#52525b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#52525b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#scoreGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Completion vs Focus */}
        {chartData.length > 0 && (
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Completion vs Focus %</h2>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="completion" stroke="#10b981" strokeWidth={2} dot={false} name="Completion %" />
                <Line type="monotone" dataKey="focus" stroke="#f59e0b" strokeWidth={2} dot={false} name="Focus %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function StatCard({
  label, value, suffix, color, icon,
}: {
  label: string; value: string; suffix?: string; color: string; icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
      <div className="flex items-center gap-2 mb-2 text-zinc-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn('text-2xl font-mono font-bold tabular-nums', color)}>{value}</span>
        {suffix && <span className="text-sm text-zinc-600">{suffix}</span>}
      </div>
    </div>
  )
}
