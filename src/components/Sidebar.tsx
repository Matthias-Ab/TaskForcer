import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CalendarDays, CheckSquare2, Clock, BarChart2, Skull,
  Settings, Flame, Sun, Moon, Snowflake, Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTodayScore } from '@/hooks/useScore'
import { useTheme } from '@/contexts/ThemeContext'
import { useXP } from '@/hooks/useXP'
import { useConfetti } from '@/hooks/useConfetti'
import { toast } from 'sonner'
import { useState } from 'react'

const links = [
  { to: '/today', icon: CheckSquare2, label: 'Today', shortcut: '1' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar', shortcut: '2' },
  { to: '/upcoming', icon: Clock, label: 'Upcoming', shortcut: '3' },
  { to: '/stats', icon: BarChart2, label: 'Stats', shortcut: '4' },
  { to: '/shame', icon: Skull, label: 'Shame Log', shortcut: '5' },
]

export function Sidebar() {
  const score = useTodayScore()
  const { theme, toggleTheme } = useTheme()
  const { xp, freezes, useFreeze } = useXP()
  const [freezeLoading, setFreezeLoading] = useState(false)
  useConfetti(score)

  const scoreColor = !score ? 'text-zinc-500'
    : score.score >= 80 ? 'text-emerald-400'
    : score.score >= 50 ? 'text-amber-400'
    : 'text-red-400'

  const scoreBarColor = !score ? '' : score.score >= 80 ? 'bg-emerald-500' : score.score >= 50 ? 'bg-amber-400' : 'bg-red-500'

  async function handleUseFreeze() {
    if (freezeLoading || freezes <= 0) return
    setFreezeLoading(true)
    const result = await useFreeze()
    setFreezeLoading(false)
    if (result.ok) {
      toast.success(`🧊 Streak frozen! Restored to day ${result.streak_restored}`)
    } else {
      toast.error(result.reason || 'No freezes available')
    }
  }

  return (
    <aside className="flex flex-col w-56 flex-shrink-0 border-r" style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-sidebar-bg)' }}>
      {/* Score display */}
      <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--tf-border)' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--tf-text-muted)' }}>Today's Score</span>
          <div className="flex items-center gap-1.5">
            {/* Streak freeze */}
            {freezes > 0 && (
              <button
                onClick={handleUseFreeze}
                disabled={freezeLoading}
                title={`${freezes} streak freeze${freezes > 1 ? 's' : ''} available — click to use`}
                className="flex items-center gap-0.5 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Snowflake size={11} />
                <span className="text-[10px] font-mono">{freezes}</span>
              </button>
            )}
            {score?.streak_day ? (
              <div className="flex items-center gap-0.5 text-amber-400">
                <Flame size={12} />
                <span className="text-xs font-mono">{score.streak_day}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className={cn('text-3xl font-mono font-bold tabular-nums', scoreColor)}>
          {score ? Math.round(score.score) : '--'}
          <span className="text-base font-sans font-normal" style={{ color: 'var(--tf-text-faint)' }}>/100</span>
        </div>

        {score && (
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--tf-bg-tertiary)' }}>
            <motion.div
              className={cn('h-full rounded-full', scoreBarColor)}
              initial={{ width: 0 }}
              animate={{ width: `${score.score}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        )}
      </div>

      {/* XP / Level display */}
      {xp && (
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--tf-border)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1">
              <Star size={11} className="text-indigo-400" />
              <span className="text-[10px] font-semibold text-indigo-400">Lv.{xp.level}</span>
            </div>
            <span className="text-[10px] font-mono" style={{ color: 'var(--tf-text-faint)' }}>
              {xp.xp_in_level}/{xp.xp_for_next} XP
            </span>
          </div>
          <p className="text-[11px] font-medium truncate mb-1.5" style={{ color: 'var(--tf-text-muted)' }}>
            {xp.level_title}
          </p>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--tf-bg-tertiary)' }}>
            <motion.div
              className="h-full rounded-full bg-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${xp.xp_pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {links.map(({ to, icon: Icon, label, shortcut }) => (
          <NavLink key={to} to={to}>
            {({ isActive }) => (
              <motion.div
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer group relative',
                  isActive ? 'bg-indigo-600/20 text-indigo-500 border border-indigo-600/30' : 'border border-transparent'
                )}
                style={!isActive ? { color: 'var(--tf-text-muted)' } : {}}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--tf-bg-tertiary)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '' }}
                whileHover={{ x: 1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1 }}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="flex-1">{label}</span>
                <span className="text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--tf-text-faint)' }}>
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

      {/* Bottom: theme toggle + settings */}
      <div className="px-2 py-3 border-t space-y-0.5" style={{ borderColor: 'var(--tf-border)' }}>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
          style={{ color: 'var(--tf-text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--tf-bg-tertiary)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>

        <NavLink to="/settings">
          {({ isActive }) => (
            <motion.div
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer')}
              style={{ color: 'var(--tf-text-muted)', background: isActive ? 'var(--tf-bg-tertiary)' : '' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--tf-bg-tertiary)')}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '' }}
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
