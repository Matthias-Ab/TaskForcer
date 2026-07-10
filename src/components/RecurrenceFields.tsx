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
}

export function recurrenceFromTask(recurrenceRule: string | null, recurrenceEndAt: number | null): RecurrenceValue {
  const customMatch = recurrenceRule?.match(/^custom:(\d+)$/)
  return {
    rule: customMatch ? 'custom' : (recurrenceRule || ''),
    customDays: customMatch ? customMatch[1] : '7',
    endDate: recurrenceEndAt ? new Date(recurrenceEndAt).toISOString().split('T')[0] : '',
  }
}

export function recurrenceToTaskData(value: RecurrenceValue): { recurrence_rule: string | null; recurrence_end_at: number | null } {
  const rule = value.rule === 'custom' ? `custom:${parseInt(value.customDays, 10) || 7}` : (value.rule || null)
  return {
    recurrence_rule: rule,
    recurrence_end_at: rule && value.endDate ? new Date(value.endDate).setHours(23, 59, 59, 999) : null,
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
          label="Ends on (optional)"
          type="date"
          value={value.endDate}
          onChange={e => onChange({ ...value, endDate: e.target.value })}
        />
      )}
    </div>
  )
}
