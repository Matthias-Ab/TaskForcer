import { useState, useEffect, useCallback } from 'react'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { scaleIn } from '@/lib/animations'
import {
  CheckSquare2, CalendarDays, Clock, BarChart2, Skull, Settings,
  Plus, Play, Search
} from 'lucide-react'
import { useTaskContext } from '@/contexts/TaskContext'

interface CommandPaletteProps {
  onCreateTask?: () => void
}

export function CommandPalette({ onCreateTask }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { tasks, startTask } = useTaskContext()

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (!open && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement).tagName
        const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable
        if (isTyping) return
        const shortcuts: Record<string, string> = {
          '1': '/today', '2': '/calendar', '3': '/upcoming', '4': '/stats', '5': '/shame',
        }
        if (shortcuts[e.key]) navigate(shortcuts[e.key])
        if (e.key === 'n' && onCreateTask) onCreateTask()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, navigate, onCreateTask])

  const runCommand = useCallback((fn: () => void) => {
    setOpen(false)
    fn()
  }, [])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-start justify-center pt-[15vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
            style={{ background: 'var(--tf-dialog-bg)', borderColor: 'var(--tf-border)' }}
          >
            <Command>
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--tf-border)' }}>
                <Search size={16} style={{ color: 'var(--tf-text-muted)' }} className="flex-shrink-0" />
                <Command.Input
                  placeholder="Search commands, navigate, start task..."
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: 'var(--tf-text)' }}
                  autoFocus
                />
                <kbd className="text-[10px] px-1.5 py-0.5 rounded border" style={{ color: 'var(--tf-text-faint)', borderColor: 'var(--tf-border)' }}>ESC</kbd>
              </div>

              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm" style={{ color: 'var(--tf-text-muted)' }}>
                  No commands found.
                </Command.Empty>

                <Command.Group
                  heading="Navigate"
                  className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
                  style={{ '--cmdk-group-heading-color': 'var(--tf-text-faint)' } as React.CSSProperties}
                >
                  {[
                    { label: 'Today', to: '/today', icon: CheckSquare2, key: '1' },
                    { label: 'Calendar', to: '/calendar', icon: CalendarDays, key: '2' },
                    { label: 'Upcoming', to: '/upcoming', icon: Clock, key: '3' },
                    { label: 'Stats', to: '/stats', icon: BarChart2, key: '4' },
                    { label: 'Shame Log', to: '/shame', icon: Skull, key: '5' },
                    { label: 'Settings', to: '/settings', icon: Settings, key: ',' },
                  ].map(({ label, to, icon: Icon, key }) => (
                    <Command.Item
                      key={to}
                      value={label}
                      onSelect={() => runCommand(() => navigate(to))}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm cursor-pointer transition-colors aria-selected:opacity-100"
                      style={{ color: 'var(--tf-text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--tf-bg-tertiary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <Icon size={14} style={{ color: 'var(--tf-text-faint)' }} />
                      <span style={{ color: 'var(--tf-text)' }}>{label}</span>
                      <kbd className="ml-auto text-[10px]" style={{ color: 'var(--tf-text-faint)' }}>⌘{key}</kbd>
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Actions">
                  <Command.Item
                    value="Create new task"
                    onSelect={() => runCommand(() => onCreateTask?.())}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm cursor-pointer transition-colors"
                    style={{ color: 'var(--tf-text)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--tf-bg-tertiary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <Plus size={14} className="text-indigo-400" />
                    Create new task
                    <kbd className="ml-auto text-[10px]" style={{ color: 'var(--tf-text-faint)' }}>N</kbd>
                  </Command.Item>
                </Command.Group>

                {pendingTasks.length > 0 && (
                  <Command.Group heading="Start Task">
                    {pendingTasks.slice(0, 5).map(task => (
                      <Command.Item
                        key={task.id}
                        value={`start ${task.title}`}
                        onSelect={() => runCommand(() => startTask(task.id))}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm cursor-pointer transition-colors"
                        style={{ color: 'var(--tf-text)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--tf-bg-tertiary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        <Play size={14} className="text-amber-400" />
                        <span className="truncate">{task.title}</span>
                        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${
                          task.priority === 'critical' ? 'text-red-400' :
                          task.priority === 'medium' ? 'text-amber-400' : ''
                        }`} style={task.priority === 'low' ? { color: 'var(--tf-text-faint)' } : {}}>
                          {task.priority}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
