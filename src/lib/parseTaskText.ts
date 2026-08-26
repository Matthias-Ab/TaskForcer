import { Task } from '@/hooks/useTasks'

export interface ParsedTaskText {
  title: string
  tags: string[]
  priority: Task['priority']
  due_at: number | null
  recurrence_rule: string | null
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const RECURRENCE_PATTERNS: [RegExp, string][] = [
  [/\bevery\s*weekdays?\b|\bweekdays?\b/i, 'weekdays'],
  [/\bevery\s*mon(?:-|\s*to\s*)sat\b|\bmon-sat\b/i, 'mon_sat'],
  [/\bevery\s*day\b|\bdaily\b/i, 'daily'],
  [/\bevery\s*week\b|\bweekly\b/i, 'weekly'],
  [/\bevery\s*month\b|\bmonthly\b/i, 'monthly'],
]

/** Skip forward past days a recurrence rule excludes (mirrors the scheduler's own skip logic). */
function applyRecurrenceSkip(rule: string, date: Date): Date {
  const d = new Date(date)
  if (rule === 'weekdays') {
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
  } else if (rule === 'mon_sat') {
    while (d.getDay() === 0) d.setDate(d.getDate() + 1)
  }
  return d
}

function nextWeekday(from: Date, targetDow: number, forceNext: boolean): Date {
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  let diff = (targetDow - d.getDay() + 7) % 7
  if (diff === 0 && forceNext) diff = 7
  d.setDate(d.getDate() + diff)
  return d
}

/**
 * Parses free text like "gym tomorrow 6am", "standup every weekday 9am", or
 * "call mom friday 3pm #family !low" into structured task fields, stripping
 * the recognized tokens out of the title as it goes.
 */
export function parseTaskText(raw: string, now: Date = new Date()): ParsedTaskText {
  let title = raw
  const tags: string[] = []
  let priority: Task['priority'] = 'medium'

  title = title.replace(/#(\w+)/g, (_, tag) => { tags.push(tag); return '' })

  if (/!critical/i.test(title)) { priority = 'critical'; title = title.replace(/!critical/gi, '') }
  else if (/!high/i.test(title)) { priority = 'critical'; title = title.replace(/!high/gi, '') }
  else if (/!medium/i.test(title)) { priority = 'medium'; title = title.replace(/!medium/gi, '') }
  else if (/!low/i.test(title)) { priority = 'low'; title = title.replace(/!low/gi, '') }

  let recurrence_rule: string | null = null
  for (const [pattern, rule] of RECURRENCE_PATTERNS) {
    if (pattern.test(title)) {
      recurrence_rule = rule
      title = title.replace(pattern, '')
      break
    }
  }

  let dateFound = false
  let baseDate = new Date(now)
  baseDate.setHours(0, 0, 0, 0)

  if (/\btoday\b/i.test(title)) {
    dateFound = true
    title = title.replace(/\btoday\b/i, '')
  } else if (/\btomorrow\b/i.test(title)) {
    dateFound = true
    baseDate.setDate(baseDate.getDate() + 1)
    title = title.replace(/\btomorrow\b/i, '')
  } else {
    const inDaysMatch = title.match(/\bin\s+(\d+)\s+days?\b/i)
    const weekdayMatch = title.match(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i)
    if (inDaysMatch) {
      dateFound = true
      baseDate.setDate(baseDate.getDate() + parseInt(inDaysMatch[1], 10))
      title = title.replace(inDaysMatch[0], '')
    } else if (weekdayMatch) {
      dateFound = true
      const forceNext = !!weekdayMatch[1]
      const dow = WEEKDAYS.indexOf(weekdayMatch[2].toLowerCase())
      baseDate = nextWeekday(now, dow, forceNext)
      title = title.replace(weekdayMatch[0], '')
    }
  }

  let hours: number | null = null
  let minutes = 0
  const ampmMatch = title.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
  if (ampmMatch) {
    hours = parseInt(ampmMatch[1], 10) % 12
    if (/pm/i.test(ampmMatch[3])) hours += 12
    minutes = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0
    title = title.replace(ampmMatch[0], '')
  } else {
    const hhmmMatch = title.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)
    if (hhmmMatch) {
      hours = parseInt(hhmmMatch[1], 10)
      minutes = parseInt(hhmmMatch[2], 10)
      title = title.replace(hhmmMatch[0], '')
    }
  }
  const timeFound = hours !== null

  title = title.replace(/\s+/g, ' ').trim()

  let due_at: number | null = null
  if (dateFound || timeFound || recurrence_rule) {
    let due = new Date(baseDate)
    if (recurrence_rule && !dateFound) due = applyRecurrenceSkip(recurrence_rule, due)
    due.setHours(timeFound ? hours! : 9, timeFound ? minutes : 0, 0, 0)
    // A bare time/recurrence with no explicit date that's already passed today rolls to tomorrow.
    if (!dateFound && due.getTime() <= now.getTime()) {
      due.setDate(due.getDate() + 1)
      if (recurrence_rule) due = applyRecurrenceSkip(recurrence_rule, due)
    }
    due_at = due.getTime()
  }

  return { title, tags, priority, due_at, recurrence_rule }
}
