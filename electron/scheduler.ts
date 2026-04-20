import schedule from 'node-schedule'
import { getDb, getSetting } from './db'
import { addShameEntry } from './forcing'
import { BrowserWindow, Notification } from 'electron'
import { randomUUID } from 'crypto'
import { calculateTodayScore } from './ipc/scores'

export function initScheduler(): void {
  // Midnight: expand recurrence rules, check for missed tasks
  schedule.scheduleJob('0 0 * * *', () => {
    expandRecurrences()
    checkMissedTasks()
  })

  // Every 5 min: recalculate score
  schedule.scheduleJob('*/5 * * * *', () => {
    try { calculateTodayScore() } catch { /* noop */ }
  })

  // Task due notifications (15 min before)
  schedule.scheduleJob('* * * * *', () => {
    checkUpcomingNotifications()
  })
}

function expandRecurrences(): void {
  const db = getDb()
  const recurring = db.prepare(
    "SELECT * FROM tasks WHERE recurrence_rule IS NOT NULL AND status NOT IN ('cancelled')"
  ).all() as {
    id: string; title: string; description: string; priority: string;
    estimate_minutes: number; recurrence_rule: string; tags: string;
    required_tools: string; allowed_urls: string; distraction_apps: string;
  }[]

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)

  for (const task of recurring) {
    // Simple daily recurrence expansion
    if (task.recurrence_rule === 'daily') {
      const exists = db.prepare(
        "SELECT 1 FROM tasks WHERE parent_task_id = ? AND date(due_at/1000,'unixepoch') = date(?/1000,'unixepoch')"
      ).get(task.id, tomorrow.getTime())

      if (!exists) {
        db.prepare(`
          INSERT INTO tasks (id, title, description, due_at, priority, estimate_minutes, status,
            created_at, recurrence_rule, parent_task_id, required_tools, allowed_urls,
            distraction_apps, tags)
          VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
        `).run(
          randomUUID(), task.title, task.description, tomorrow.getTime(),
          task.priority, task.estimate_minutes, Date.now(),
          task.recurrence_rule, task.id,
          task.required_tools, task.allowed_urls, task.distraction_apps, task.tags
        )
      }
    }
  }
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
    SELECT * FROM tasks
    WHERE status NOT IN ('completed', 'cancelled')
      AND due_at BETWEEN ? AND ?
  `).all(yStart.getTime(), yEnd.getTime()) as { id: string; title: string }[]

  for (const task of missed) {
    addShameEntry({
      type: 'missed_task',
      task_id: task.id,
      message: `Missed task: "${task.title}"`,
    })
  }
}

function checkUpcomingNotifications(): void {
  const db = getDb()
  const now = Date.now()
  const in15 = now + 15 * 60 * 1000
  const in16 = now + 16 * 60 * 1000

  const upcoming = db.prepare(`
    SELECT * FROM tasks
    WHERE status NOT IN ('completed', 'cancelled')
      AND due_at BETWEEN ? AND ?
  `).all(in15, in16) as { id: string; title: string }[]

  for (const task of upcoming) {
    if (Notification.isSupported()) {
      new Notification({
        title: 'Task due in 15 minutes',
        body: task.title,
      }).show()
    }
  }
}
