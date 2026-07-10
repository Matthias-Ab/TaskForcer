import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Input } from './ui/Input'
import { useProjects } from '@/hooks/useProjects'
import { useAllTasks } from '@/hooks/useTasks'

const selectStyle = {
  background: 'var(--tf-input-bg)',
  borderColor: 'var(--tf-input-border)',
  color: 'var(--tf-input-text)',
}

export interface AdvancedFieldsValue {
  project_id: string
  blocked_by: string[]
  required_tools: string
  allowed_urls: string
  distraction_apps: string
}

interface TaskAdvancedFieldsProps {
  value: AdvancedFieldsValue
  onChange: (value: AdvancedFieldsValue) => void
  /** Exclude this task id from the "blocked by" picker (editing an existing task) */
  excludeTaskId?: string
  defaultOpen?: boolean
}

export function TaskAdvancedFields({ value, onChange, excludeTaskId, defaultOpen = false }: TaskAdvancedFieldsProps) {
  const [open, setOpen] = useState(defaultOpen)
  const { projects } = useProjects()
  const { tasks: allTasks } = useAllTasks()

  const blockableTasks = allTasks.filter(t =>
    t.id !== excludeTaskId && t.status !== 'completed' && t.status !== 'cancelled'
  )

  function set<K extends keyof AdvancedFieldsValue>(key: K, v: AdvancedFieldsValue[K]) {
    onChange({ ...value, [key]: v })
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-medium transition-colors"
        style={{ color: 'var(--tf-text-muted)' }}
      >
        <ChevronDown size={13} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
        Advanced (project, dependencies, forcing rules)
      </button>

      {open && (
        <div className="mt-3 space-y-3 rounded-xl border p-3" style={{ borderColor: 'var(--tf-border)' }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--tf-text-muted)' }}>Project</label>
              <select
                value={value.project_id}
                onChange={e => set('project_id', e.target.value)}
                className="rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={selectStyle}
              >
                <option value="">No project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.emoji ? `${p.emoji} ` : ''}{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--tf-text-muted)' }}>
                Blocked by ({value.blocked_by.length})
              </label>
              <select
                multiple
                value={value.blocked_by}
                onChange={e => set('blocked_by', Array.from(e.target.selectedOptions).map(o => o.value))}
                className="rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[74px]"
                style={selectStyle}
              >
                {blockableTasks.length === 0 && <option disabled>No other open tasks</option>}
                {blockableTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-[11px]" style={{ color: 'var(--tf-text-faint)' }}>
            Configure what counts as "on task" vs. "distracted" while this task is active.
          </p>
          <Input
            label="Required tools/apps"
            placeholder="e.g. VS Code, Figma"
            value={value.required_tools}
            onChange={e => set('required_tools', e.target.value)}
          />
          <Input
            label="Allowed URLs"
            placeholder="e.g. github.com, docs.google.com"
            value={value.allowed_urls}
            onChange={e => set('allowed_urls', e.target.value)}
          />
          <Input
            label="Distraction apps"
            placeholder="e.g. Twitter, YouTube, Slack"
            value={value.distraction_apps}
            onChange={e => set('distraction_apps', e.target.value)}
          />
        </div>
      )}
    </div>
  )
}

export function advancedFieldsFromTask(task?: {
  project_id?: string | null
  blocked_by?: string[]
  required_tools?: string[]
  allowed_urls?: string[]
  distraction_apps?: string[]
}): AdvancedFieldsValue {
  return {
    project_id: task?.project_id ?? '',
    blocked_by: task?.blocked_by ?? [],
    required_tools: (task?.required_tools ?? []).join(', '),
    allowed_urls: (task?.allowed_urls ?? []).join(', '),
    distraction_apps: (task?.distraction_apps ?? []).join(', '),
  }
}

export function advancedFieldsToTaskData(value: AdvancedFieldsValue) {
  const csvToList = (s: string) => s.split(',').map(v => v.trim()).filter(Boolean)
  return {
    project_id: value.project_id || null,
    blocked_by: value.blocked_by,
    required_tools: csvToList(value.required_tools),
    allowed_urls: csvToList(value.allowed_urls),
    distraction_apps: csvToList(value.distraction_apps),
  }
}
