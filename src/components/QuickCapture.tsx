import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap } from 'lucide-react'
import { Task } from '@/hooks/useTasks'

interface ParsedCapture {
  title: string
  tags: string[]
  priority: Task['priority']
}

function parseCapture(raw: string): ParsedCapture {
  let title = raw
  const tags: string[] = []
  let priority: Task['priority'] = 'medium'

  // Extract #tags
  title = title.replace(/#(\w+)/g, (_, tag) => { tags.push(tag); return '' })

  // Extract !priority
  if (/!critical/i.test(title)) { priority = 'critical'; title = title.replace(/!critical/gi, '') }
  else if (/!high/i.test(title)) { priority = 'critical'; title = title.replace(/!high/gi, '') }
  else if (/!medium/i.test(title)) { priority = 'medium'; title = title.replace(/!medium/gi, '') }
  else if (/!low/i.test(title)) { priority = 'low'; title = title.replace(/!low/gi, '') }

  return { title: title.replace(/\s+/g, ' ').trim(), tags, priority }
}

interface QuickCaptureProps {
  onSubmit: (data: Partial<Task>) => Promise<unknown>
  autoFocus?: boolean
}

export function QuickCapture({ onSubmit, autoFocus }: QuickCaptureProps) {
  const [value, setValue] = useState('')
  const [preview, setPreview] = useState<ParsedCapture | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setValue(v)
    if (v.trim()) setPreview(parseCapture(v))
    else setPreview(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim() || loading) return
    const parsed = parseCapture(value)
    if (!parsed.title) return
    setLoading(true)
    await onSubmit({ title: parsed.title, tags: parsed.tags, priority: parsed.priority })
    setValue('')
    setPreview(null)
    setLoading(false)
  }

  const priorityColor = preview?.priority === 'critical' ? 'text-red-400' :
    preview?.priority === 'medium' ? 'text-amber-400' : 'text-zinc-400'

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all"
        style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-input-bg)' }}
      >
        <Zap size={14} className="text-indigo-400 flex-shrink-0" />
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          placeholder="Quick capture... #tag !priority"
          className="flex-1 bg-transparent text-sm focus:outline-none"
          style={{ color: 'var(--tf-input-text)' }}
          disabled={loading}
        />
        {value && (
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0" style={{ color: 'var(--tf-text-faint)', borderColor: 'var(--tf-border)' }}>↵</kbd>
        )}
      </div>

      {/* Live parse preview */}
      <AnimatePresence>
        {preview && preview.title && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full mt-1 left-0 right-0 px-3 py-2 rounded-xl border z-10 flex items-center gap-2"
            style={{ background: 'var(--tf-dialog-bg)', borderColor: 'var(--tf-border)' }}
          >
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${priorityColor}`}
              style={{ background: 'var(--tf-bg-tertiary)', borderColor: 'var(--tf-border)' }}>
              {preview.priority}
            </span>
            <span className="text-sm flex-1 truncate" style={{ color: 'var(--tf-text)' }}>{preview.title}</span>
            {preview.tags.map(t => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md text-indigo-400" style={{ background: 'var(--tf-bg-tertiary)' }}>
                #{t}
              </span>
            ))}
            <span className="text-[10px]" style={{ color: 'var(--tf-text-faint)' }}>press ↵</span>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
}
