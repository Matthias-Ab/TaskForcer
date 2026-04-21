import { useState } from 'react'
import { Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input, Textarea } from './ui/Input'
import { Button } from './ui/Button'
import { scaleIn } from '@/lib/animations'
import { Task } from '@/hooks/useTasks'

interface CreateTaskFormProps {
  onSubmit: (data: Partial<Task>) => Promise<unknown>
  onCancel?: () => void
  compact?: boolean
}

const selectStyle = {
  background: 'var(--tf-input-bg)',
  borderColor: 'var(--tf-input-border)',
  color: 'var(--tf-input-text)',
}

export function CreateTaskForm({ onSubmit, onCancel, compact = false }: CreateTaskFormProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [dueDate, setDueDate] = useState('')
  const [estimate, setEstimate] = useState('30')
  const [tags, setTags] = useState('')
  const [recurrence, setRecurrence] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    await onSubmit({
      title: title.trim(),
      description,
      priority,
      due_at: dueDate ? new Date(dueDate).getTime() : null,
      estimate_minutes: parseInt(estimate) || 30,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      recurrence_rule: recurrence || null,
    })
    setTitle('')
    setDescription('')
    setDueDate('')
    setEstimate('30')
    setTags('')
    setRecurrence('')
    setLoading(false)
    setOpen(false)
  }

  if (compact) {
    return (
      <div>
        <AnimatePresence>
          {!open ? (
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border border-dashed text-sm transition-colors"
              style={{ borderColor: 'var(--tf-border)', color: 'var(--tf-text-muted)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--tf-text)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--tf-text-muted)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--tf-text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--tf-border)' }}
            >
              <Plus size={14} />
              Add task...
              <span className="ml-auto text-xs font-mono" style={{ color: 'var(--tf-text-faint)' }}>N</span>
            </motion.button>
          ) : (
            <motion.form
              variants={scaleIn} initial="hidden" animate="visible" exit="exit"
              onSubmit={handleSubmit}
              className="rounded-xl border border-indigo-500/30 p-4 space-y-3"
              style={{ background: 'var(--tf-bg-secondary)' }}
            >
              <Input
                autoFocus
                placeholder="Task title..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setOpen(false)}
              />
              <div className="flex gap-2">
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as Task['priority'])}
                  className="flex-1 rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={selectStyle}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="critical">Critical</option>
                </select>
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="flex-1"
                  placeholder="Due date"
                />
                <Input
                  type="number"
                  value={estimate}
                  onChange={e => setEstimate(e.target.value)}
                  placeholder="Min"
                  className="w-20"
                  min="1"
                />
              </div>
              <Input
                placeholder="Tags (comma-separated)"
                value={tags}
                onChange={e => setTags(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={!title.trim() || loading}>
                  Add Task
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Title"
        placeholder="What needs to be done?"
        value={title}
        onChange={e => setTitle(e.target.value)}
        autoFocus
      />
      <Textarea
        label="Description"
        placeholder="Optional details..."
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={3}
      />
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--tf-text-muted)' }}>Priority</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as Task['priority'])}
            className="rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500"
            style={selectStyle}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <Input
          label="Due date"
          type="datetime-local"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
        />
        <Input
          label="Estimate (min)"
          type="number"
          value={estimate}
          onChange={e => setEstimate(e.target.value)}
          min="1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Tags"
          placeholder="work, health, learning"
          value={tags}
          onChange={e => setTags(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--tf-text-muted)' }}>Recurrence</label>
          <select
            value={recurrence}
            onChange={e => setRecurrence(e.target.value)}
            className="rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500"
            style={selectStyle}
          >
            <option value="">None</option>
            <option value="daily">Daily</option>
            <option value="weekdays">Weekdays (Mon–Fri)</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        )}
        <Button type="submit" variant="primary" disabled={!title.trim() || loading}>
          Create Task
        </Button>
      </div>
    </form>
  )
}
