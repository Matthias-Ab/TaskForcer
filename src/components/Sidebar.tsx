import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CalendarDays, CheckSquare2, Clock, BarChart2, Skull,
  Settings, Flame
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTodayScore } from '@/hooks/useScore'

const links = [
  { to: '/today', icon: CheckSquare2, label: 'Today', shortcut: '1' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar', shortcut: '2' },
  { to: '/upcoming', icon: Clock, label: 'Upcoming', shortcut: '3' },
  { to: '/stats', icon: BarChart2, label: 'Stats', shortcut: '4' },
  { to: '/shame', icon: Skull, label: 'Shame Log', shortcut: '5' },
]

export function Sidebar() {
  const score = useTodayScore()

  const scoreColor = !score ? 'text-zinc-500'
    : score.score >= 80 ? 'text-emerald-400'
    : score.score >= 50 ? 'text-amber-400'
    : 'text-red-400'

  return (
    <aside className="flex flex-col w-56 flex-shrink-0 border-r border-zinc-800/60 bg-zinc-950/80">
      {/* Score display */}
      <div className="px-4 py-4 border-b border-zinc-800/40">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Today's Score</span>
          {score?.streak_day ? (
            <div className="flex items-center gap-1 text-amber-400">
              <Flame size={12} />
              <span className="text-xs font-mono">{score.streak_day}</span>
            </div>
          ) : null}
        </div>
        <div className={cn('text-3xl font-mono font-bold mt-1 tabular-nums', scoreColor)}>
          {score ? Math.round(score.score) : '--'}
          <span className="text-base text-zinc-600 font-sans font-normal">/100</span>
        </div>
        {score && (
          <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', score.score >= 80 ? 'bg-emerald-500' : score.score >= 50 ? 'bg-amber-400' : 'bg-red-500')}
              initial={{ width: 0 }}
              animate={{ width: `${score.score}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {links.map(({ to, icon: Icon, label, shortcut }) => (
          <NavLink key={to} to={to}>
            {({ isActive }) => (
              <motion.div
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer',
                  'group relative',
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/30'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                )}
                whileHover={{ x: 1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1 }}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="flex-1">{label}</span>
                <span className="text-[10px] text-zinc-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                  ⌘{shortcut}
                </span>
                {isActive && (
                  <motion.div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-indigo-500 rounded-full"
                    layoutId="activeIndicator"
                  />
                )}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Settings link */}
      <div className="px-2 py-3 border-t border-zinc-800/40">
        <NavLink to="/settings">
          {({ isActive }) => (
            <motion.div
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer',
                isActive
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/60'
              )}
              whileHover={{ x: 1 }}
              whileTap={{ scale: 0.98 }}
            >
              <Settings size={16} />
              <span>Settings</span>
            </motion.div>
          )}
        </NavLink>
      </div>
    </aside>
  )
}
