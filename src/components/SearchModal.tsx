import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, AlertTriangle, Circle, CheckSquare2, Clock } from 'lucide-react'
import { ipc } from '@/lib/ipc'
import { Task } from '@/hooks/useTasks'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { scaleIn } from '@/lib/animations'

interface SearchModalProps {
  open: boolean
  onClose: () => void
  onPreview: (task: Task) => void
}

export function SearchModal({ open, onClose, onPreview }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      ipc.invoke<Task[]>('tasks:list').then(setAllTasks)
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const results = query.trim().length < 1 ? [] : allTasks.filter(t => {
    const q = query.toLowerCase()
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.tags || []).some(tag => tag.toLowerCase().includes(q))
    )
  }).slice(0, 12)

  useEffect(() => { setSelected(0) }, [query])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!open) return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && results[selected]) { onPreview(results[selected]); onClose() }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, results, selected, onClose, onPreview])

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
            style={{ background: 'var(--tf-dialog-bg)', borderColor: 'var(--tf-border)' }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--tf-border)' }}>
              <Search size={16} style={{ color: 'var(--tf-text-muted)' }} className="flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search tasks by title, tag, or description..."
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: 'var(--tf-text)' }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ color: 'var(--tf-text-faint)' }}>
                  <X size={14} />
                </button>
              )}
              <kbd className="text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0" style={{ color: 'var(--tf-text-faint)', borderColor: 'var(--tf-border)' }}>
                ESC
              </kbd>
            </div>

            {/* Results */}
            {query.trim() && (
              <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
                {results.length === 0 ? (
                  <p className="text-center text-sm py-8" style={{ color: 'var(--tf-text-muted)' }}>
                    No tasks found for "{query}"
                  </p>
                ) : (
                  results.map((task, i) => (
                    <SearchResult
                      key={task.id}
                      task={task}
                      active={i === selected}
                      query={query}
                      onSelect={() => { onPreview(task); onClose() }}
                    />
                  ))
                )}
              </div>
            )}

            {!query.trim() && (
              <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--tf-text-faint)' }}>
                Type to search across all tasks
              </div>
            )}

            {/* Footer hint */}
            <div className="flex items-center gap-4 px-4 py-2 border-t text-[10px]" style={{ borderColor: 'var(--tf-border)', color: 'var(--tf-text-faint)' }}>
              <span><kbd className="font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono">↵</kbd> open preview</span>
              <span><kbd className="font-mono">Esc</kbd> close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function highlight(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-indigo-500/30 text-indigo-300 rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

function SearchResult({ task, active, query, onSelect }: { task: Task; active: boolean; query: string; onSelect: () => void }) {
  const overdue = isOverdue(task.due_at) && task.status !== 'completed'
  const isDone = task.status === 'completed'

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
        active ? 'bg-indigo-600/15' : ''
      )}
      style={!active ? {} : {}}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--tf-bg-tertiary)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = '' }}
    >
      {/* Status icon */}
      <div className="flex-shrink-0">
        {isDone ? (
          <CheckSquare2 size={14} className="text-emerald-500" />
        ) : task.priority === 'critical' ? (
          <AlertTriangle size={14} className="text-red-400" />
        ) : (
          <Circle size={14} className={task.priority === 'medium' ? 'text-amber-400' : ''} style={task.priority === 'low' ? { color: 'var(--tf-text-faint)' } : {}} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate', isDone ? 'line-through' : '')} style={{ color: isDone ? 'var(--tf-text-faint)' : 'var(--tf-text)' }}>
          {highlight(task.title, query)}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.tags?.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] px-1 py-0.5 rounded" style={{ background: 'var(--tf-bg-tertiary)', color: 'var(--tf-text-muted)' }}>
              {highlight(tag, query)}
            </span>
          ))}
          {task.description && (
            <span className="text-[10px] truncate max-w-[180px]" style={{ color: 'var(--tf-text-faint)' }}>
              {task.description.slice(0, 60)}{task.description.length > 60 ? '…' : ''}
            </span>
          )}
        </div>
      </div>

      {task.due_at && (
        <span className={cn('text-[10px] flex items-center gap-1 flex-shrink-0', overdue ? 'text-red-400' : '')}
          style={overdue ? {} : { color: 'var(--tf-text-faint)' }}>
          <Clock size={9} />
          {formatDate(task.due_at)}
        </span>
      )}
    </button>
  )
}
