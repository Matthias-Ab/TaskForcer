import { useState } from 'react'
import { Input, Textarea } from './ui/Input'
import { Button } from './ui/Button'
import { Task } from '@/hooks/useTasks'

interface EditTaskFormProps {
  task: Task
  onSubmit: (data: Partial<Task>) => Promise<unknown>
  onCancel: () => void
}

function tsToDatetimeLocal(ts: number | null): string {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const selectStyle = {
  background: 'var(--tf-input-bg)',
  borderColor: 'var(--tf-input-border)',
  color: 'var(--tf-input-text)',
}

export function EditTaskForm({ task, onSubmit, onCancel }: EditTaskFormProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [priority, setPriority] = useState<Task['priority']>(task.priority)
  const [dueDate, setDueDate] = useState(tsToDatetimeLocal(task.due_at))
  const [estimate, setEstimate] = useState(String(task.estimate_minutes || 30))
  const [tags, setTags] = useState((task.tags || []).join(', '))
  const [recurrence, setRecurrence] = useState(task.recurrence_rule || '')
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
    setLoading(false)
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
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={!title.trim() || loading}>
          Save Changes
        </Button>
      </div>
    </form>
  )
}
