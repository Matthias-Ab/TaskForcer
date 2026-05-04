import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays, CheckSquare2, Clock, BarChart2, Skull,
  Settings, Flame, Sun, Moon, Snowflake, Star, FolderOpen,
  Plus, RotateCcw, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTodayScore } from '@/hooks/useScore'
import { useTheme } from '@/contexts/ThemeContext'
import { useXP } from '@/hooks/useXP'
import { useConfetti } from '@/hooks/useConfetti'
import { useProjects } from '@/hooks/useProjects'
import { toast } from 'sonner'
import { useState } from 'react'

const links = [
  { to: '/today', icon: CheckSquare2, label: 'Today', shortcut: '1' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar', shortcut: '2' },
  { to: '/upcoming', icon: Clock, label: 'Upcoming', shortcut: '3' },
  { to: '/stats', icon: BarChart2, label: 'Stats', shortcut: '4' },
  { to: '/review', icon: RotateCcw, label: 'Weekly Review', shortcut: '6' },
  { to: '/shame', icon: Skull, label: 'Shame Log', shortcut: '5' },
]

const PROJECT_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16']

export function Sidebar() {
  const score = useTodayScore()
  const { theme, toggleTheme } = useTheme()
  const { xp, freezes, useFreeze } = useXP()
  const { projects, createProject } = useProjects()
  const navigate = useNavigate()
  const [freezeLoading, setFreezeLoading] = useState(false)
  const [showProjects, setShowProjects] = useState(true)
  const [creatingProject, setCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectEmoji, setNewProjectEmoji] = useState('')
  useConfetti(score)

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault()
    if (!newProjectName.trim()) return
    const color = PROJECT_COLORS[projects.length % PROJECT_COLORS.length]
    const p = await createProject({ name: newProjectName.trim(), color, emoji: newProjectEmoji.trim() })
    if (p) { navigate(`/project/${p.id}`); setCreatingProject(false); setNewProjectName(''); setNewProjectEmoji('') }
  }

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

        {/* Projects section */}
        <div className="pt-2 border-t mt-2" style={{ borderColor: 'var(--tf-border)' }}>
          <button
            onClick={() => setShowProjects(p => !p)}
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors"
            style={{ color: 'var(--tf-text-faint)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--tf-bg-tertiary)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <FolderOpen size={12} />
            <span className="flex-1 text-left">Projects</span>
            <ChevronDown size={11} className={cn('transition-transform', showProjects ? '' : '-rotate-90')} />
          </button>

          <AnimatePresence>
            {showProjects && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="pt-1 space-y-0.5">
                  {projects.map(p => (
                    <NavLink key={p.id} to={`/project/${p.id}`}>
                      {({ isActive }) => (
                        <motion.div
                          className={cn('flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm cursor-pointer transition-colors border',
                            isActive ? 'border-indigo-600/30 bg-indigo-600/20' : 'border-transparent'
                          )}
                          style={!isActive ? { color: 'var(--tf-text-muted)' } : { color: p.color }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--tf-bg-tertiary)' }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '' }}
                          whileHover={{ x: 1 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.1 }}
                        >
                          <span className="text-sm flex-shrink-0">{p.emoji || '📁'}</span>
                          <span className="flex-1 truncate text-xs">{p.name}</span>
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                        </motion.div>
                      )}
                    </NavLink>
                  ))}

                  {/* New project form */}
                  <AnimatePresence>
                    {creatingProject ? (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        onSubmit={handleCreateProject}
                        className="flex gap-1 px-1 pt-1"
                      >
                        <input value={newProjectEmoji} onChange={e => setNewProjectEmoji(e.target.value)}
                          placeholder="😀" maxLength={2}
                          className="w-8 text-center rounded-lg px-1 py-1 text-sm border focus:outline-none"
                          style={{ background: 'var(--tf-input-bg)', borderColor: 'var(--tf-input-border)', color: 'var(--tf-input-text)' }}
                        />
                        <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                          placeholder="Project name" autoFocus
                          onKeyDown={e => e.key === 'Escape' && setCreatingProject(false)}
                          className="flex-1 rounded-lg px-2 py-1 text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          style={{ background: 'var(--tf-input-bg)', borderColor: 'var(--tf-input-border)', color: 'var(--tf-input-text)' }}
                        />
                        <button type="submit" className="text-xs text-indigo-400 hover:text-indigo-300 px-1">Add</button>
                      </motion.form>
                    ) : (
                      <button
                        onClick={() => setCreatingProject(true)}
                        className="flex items-center gap-2 w-full px-3 py-1.5 rounded-xl text-xs transition-colors"
                        style={{ color: 'var(--tf-text-faint)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--tf-text-muted)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--tf-text-faint)')}
                      >
                        <Plus size={11} /> New project
                      </button>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
