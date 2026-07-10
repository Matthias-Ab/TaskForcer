import { Notification } from 'electron'
import { getDb, getSetting } from './db'
import { addShameEntry } from './forcing'
import { randomUUID } from 'crypto'
import { calculateTodayScore } from './ipc/scores'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const schedule = require('node-schedule') as typeof import('node-schedule')

export function initScheduler(): void {
  // Midnight: spawn recurring tasks for tomorrow, check missed tasks
  schedule.scheduleJob('0 0 * * *', () => {
    spawnRecurringTasks()
    checkMissedTasks()
  })

  // Every 5 minutes: recalculate score
  schedule.scheduleJob('*/5 * * * *', () => {
    try { calculateTodayScore() } catch { /* noop */ }
  })

  // Every minute: due-date notifications
  schedule.scheduleJob('* * * * *', () => {
    checkUpcomingNotifications()
    checkOverdueNotifications()
  })
}

interface RecurringTask {
  id: string
  title: string
  description: string
  priority: string
  estimate_minutes: number
  recurrence_rule: string
  recurrence_end_at: number | null
  project_id: string | null
  tags: string
  required_tools: string
  allowed_urls: string
  distraction_apps: string
  due_at: number | null
}

function nextDueDate(rule: string, fromDate: Date, originalDueAt: number | null): Date | null {
  const next = new Date(fromDate)
  if (originalDueAt !== null) {
    const orig = new Date(originalDueAt)
    next.setHours(orig.getHours(), orig.getMinutes(), 0, 0)
  } else {
    next.setHours(9, 0, 0, 0)
  }

  if (rule === 'daily') {
    next.setDate(next.getDate() + 1)
    return next
  }

  if (rule === 'weekdays') {
    next.setDate(next.getDate() + 1)
    // Skip Saturday (6) and Sunday (0)
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1)
    }
    return next
  }

  if (rule === 'mon_sat') {
    next.setDate(next.getDate() + 1)
    // Skip only Sunday (0)
    while (next.getDay() === 0) {
      next.setDate(next.getDate() + 1)
    }
    return next
  }

  if (rule === 'weekly') {
    next.setDate(next.getDate() + 7)
    return next
  }

  if (rule === 'monthly') {
    next.setMonth(next.getMonth() + 1)
    return next
  }

  const customMatch = rule.match(/^custom:(\d+)$/)
  if (customMatch) {
    const intervalDays = parseInt(customMatch[1], 10)
    if (intervalDays > 0) {
      next.setDate(next.getDate() + intervalDays)
      return next
    }
  }

  return null
}

export function spawnRecurringTasks(referenceDate?: Date, onlyTaskId?: string): void {
  const db = getDb()
  const ref = referenceDate || new Date()

  let recurring: RecurringTask[]
  if (onlyTaskId) {
    // onlyTaskId is whatever task was just completed -- almost always a spawned child after the
    // first cycle, not the root template. Every child's parent_task_id points directly at the
    // root (flat, not chained), so resolve to the root before looking it up; otherwise this only
    // ever worked for completing the original template itself, and silently did nothing for
    // every occurrence after that.
    const completed = db.prepare('SELECT parent_task_id FROM tasks WHERE id = ?').get(onlyTaskId) as { parent_task_id: string | null } | undefined
    const rootId = completed?.parent_task_id ?? onlyTaskId
    const row = db.prepare(
      "SELECT * FROM tasks WHERE id = ? AND recurrence_rule IS NOT NULL AND status NOT IN ('cancelled')"
    ).get(rootId) as RecurringTask | undefined
    recurring = row ? [row] : []
  } else {
    recurring = db.prepare(
      "SELECT * FROM tasks WHERE recurrence_rule IS NOT NULL AND status NOT IN ('cancelled') AND parent_task_id IS NULL"
    ).all() as RecurringTask[]
  }

  for (const task of recurring) {
    // Advance from the most recent occurrence in this series (the template itself, or its
    // latest spawned child -- whichever is later), not from "today". Only spawn once that
    // occurrence has actually come due; otherwise every midnight scan would compute a fresh
    // "today + interval" target and spawn a new duplicate every single day forever.
    const latest = db.prepare(`
      SELECT MAX(due_at) as due_at FROM (
        SELECT due_at FROM tasks WHERE id = ?
        UNION ALL
        SELECT due_at FROM tasks WHERE parent_task_id = ?
      )
    `).get(task.id, task.id) as { due_at: number | null }
    const latestDueAt = latest?.due_at ?? task.due_at
    if (latestDueAt === null || latestDueAt > ref.getTime()) continue

    const due = nextDueDate(task.recurrence_rule, new Date(latestDueAt), latestDueAt)
    if (!due) continue
    if (task.recurrence_end_at && due.getTime() > task.recurrence_end_at) continue

    const dateStr = due.toISOString().split('T')[0]

    // Check if a child already exists for this due date
    const exists = db.prepare(
      "SELECT 1 FROM tasks WHERE parent_task_id = ? AND date(due_at/1000,'unixepoch') = ?"
    ).get(task.id, dateStr)

    if (!exists) {
      db.prepare(`
        INSERT INTO tasks (id, title, description, due_at, priority, estimate_minutes, status,
          created_at, recurrence_rule, recurrence_end_at, parent_task_id, project_id, required_tools, allowed_urls,
          distraction_apps, tags)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(), task.title, task.description, due.getTime(),
        task.priority, task.estimate_minutes, Date.now(),
        task.recurrence_rule, task.recurrence_end_at, task.id, task.project_id,
        task.required_tools, task.allowed_urls, task.distraction_apps, task.tags
      )
    }
  }
}

// Called from tasks:complete IPC when the completed task has a recurrence_rule
export function spawnNextRecurrence(taskId: string): void {
  spawnRecurringTasks(new Date(), taskId)
}

function checkMissedTasks(): void {
  const db = getDb()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yStart = new Date(yesterday)
  yStart.setHours(0, 0, 0, 0)
  const yEnd = new Date(yesterday)
  yEnd.setHours(23, 59, 59, 999)

  const missed = db.prepare(`
    SELECT * FROM tasks WHERE status NOT IN ('completed','cancelled') AND due_at BETWEEN ? AND ?
  `).all(yStart.getTime(), yEnd.getTime()) as { id: string; title: string }[]

  for (const task of missed) {
    addShameEntry({ type: 'missed_task', task_id: task.id, message: `Missed task: "${task.title}"` })
  }
}

// Track which tasks we've already notified to avoid repeat toasts
const notifiedIds = new Set<string>()
const overdueNotifiedIds = new Set<string>()

function checkUpcomingNotifications(): void {
  if (getSetting('notify_due_soon') === 'false') return
  const db = getDb()
  const now = Date.now()
  const in15 = now + 15 * 60 * 1000
  const in16 = now + 16 * 60 * 1000

  const upcoming = db.prepare(`
    SELECT * FROM tasks WHERE status NOT IN ('completed','cancelled') AND due_at BETWEEN ? AND ?
  `).all(in15, in16) as { id: string; title: string }[]

  for (const task of upcoming) {
    if (notifiedIds.has(task.id)) continue
    notifiedIds.add(task.id)
    if (Notification.isSupported()) {
      new Notification({ title: 'Due in 15 minutes', body: task.title }).show()
    }
  }
}

function checkOverdueNotifications(): void {
  if (getSetting('notify_overdue') === 'false') return
  const db = getDb()
  const now = Date.now()
  // Tasks that just became overdue in the last 2 minutes
  const twoMinAgo = now - 2 * 60 * 1000

  const overdue = db.prepare(`
    SELECT * FROM tasks WHERE status NOT IN ('completed','cancelled') AND due_at BETWEEN ? AND ?
  `).all(twoMinAgo, now) as { id: string; title: string }[]

  for (const task of overdue) {
    if (overdueNotifiedIds.has(task.id)) continue
    overdueNotifiedIds.add(task.id)
    if (Notification.isSupported()) {
      new Notification({ title: '⚠️ Task overdue', body: task.title }).show()
    }
  }
}
