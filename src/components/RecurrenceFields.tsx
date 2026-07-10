import { Input } from './ui/Input'

const selectStyle = {
  background: 'var(--tf-input-bg)',
  borderColor: 'var(--tf-input-border)',
  color: 'var(--tf-input-text)',
}

export interface RecurrenceValue {
  rule: string
  customDays: string
  endDate: string
  /** Time of day (HH:MM) for the reminder -- a recurring task has no single fixed date */
  time: string
}

/** First occurrence on/after now (tomorrow if the time already passed today), respecting the rule. */
function computeInitialDueDate(rule: string, timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const candidate = new Date()
  candidate.setHours(hours || 9, minutes || 0, 0, 0)
  if (candidate.getTime() <= Date.now()) {
    candidate.setDate(candidate.getDate() + 1)
  }
  if (rule === 'weekdays') {
    while (candidate.getDay() === 0 || candidate.getDay() === 6) {
      candidate.setDate(candidate.getDate() + 1)
    }
  }
  if (rule === 'mon_sat') {
    while (candidate.getDay() === 0) {
      candidate.setDate(candidate.getDate() + 1)
    }
  }
  return candidate.getTime()
}

export function recurrenceFromTask(recurrenceRule: string | null, recurrenceEndAt: number | null, dueAt?: number | null): RecurrenceValue {
  const customMatch = recurrenceRule?.match(/^custom:(\d+)$/)
  const pad = (n: number) => String(n).padStart(2, '0')
  const time = dueAt ? `${pad(new Date(dueAt).getHours())}:${pad(new Date(dueAt).getMinutes())}` : '09:00'
  return {
    rule: customMatch ? 'custom' : (recurrenceRule || ''),
    customDays: customMatch ? customMatch[1] : '7',
    endDate: recurrenceEndAt ? new Date(recurrenceEndAt).toISOString().split('T')[0] : '',
    time,
  }
}

/**
 * `existingDueAt`: when editing a task that already has a recurrence date, keep that same
 * date and just apply the (possibly-edited) time-of-day, instead of jumping to "next
 * occurrence from right now" -- otherwise saving unrelated edits would silently reschedule it.
 * Omit it when creating a new recurring task, where "next applicable slot from now" is correct.
 */
export function recurrenceToTaskData(value: RecurrenceValue, existingDueAt?: number | null): { recurrence_rule: string | null; recurrence_end_at: number | null; due_at?: number } {
  const rule = value.rule === 'custom' ? `custom:${parseInt(value.customDays, 10) || 7}` : (value.rule || null)
  let due_at: number | undefined
  if (rule) {
    if (existingDueAt) {
      const [hours, minutes] = value.time.split(':').map(Number)
      const d = new Date(existingDueAt)
      d.setHours(hours || 9, minutes || 0, 0, 0)
      due_at = d.getTime()
    } else {
      due_at = computeInitialDueDate(rule, value.time)
    }
  }
  return {
    recurrence_rule: rule,
    recurrence_end_at: rule && value.endDate ? new Date(value.endDate).setHours(23, 59, 59, 999) : null,
    ...(due_at !== undefined ? { due_at } : {}),
  }
}

interface RecurrenceFieldsProps {
  value: RecurrenceValue
  onChange: (value: RecurrenceValue) => void
}

export function RecurrenceFields({ value, onChange }: RecurrenceFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--tf-text-muted)' }}>Recurrence</label>
        <select
          value={value.rule}
          onChange={e => onChange({ ...value, rule: e.target.value })}
          className="rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500"
          style={selectStyle}
        >
          <option value="">None</option>
          <option value="daily">Daily</option>
          <option value="weekdays">Weekdays (Mon–Fri)</option>
          <option value="mon_sat">Mon–Sat (daily, skip Sunday)</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom interval...</option>
        </select>
      </div>

      {value.rule === 'custom' && (
        <Input
          label="Every N days"
          type="number"
          min="1"
          value={value.customDays}
          onChange={e => onChange({ ...value, customDays: e.target.value })}
        />
      )}

      {value.rule && (
        <Input
          label="Reminder time"
          type="time"
          value={value.time}
          onChange={e => onChange({ ...value, time: e.target.value })}
        />
      )}

      {value.rule && (
        <Input
          label="Ends on (optional)"
          type="date"
          value={value.endDate}
          onChange={e => onChange({ ...value, endDate: e.target.value })}
        />
      )}
    </div>
  )
}
