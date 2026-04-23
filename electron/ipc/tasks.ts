import { ipcMain } from 'electron'
import { getDb } from '../db'
import { randomUUID } from 'crypto'

export interface Task {
  id: string
  title: string
  description: string
  due_at: number | null
  priority: 'low' | 'medium' | 'critical'
  estimate_minutes: number
  status: 'pending' | 'in_progress' | 'completed' | 'snoozed' | 'cancelled'
  created_at: number
  completed_at: number | null
  recurrence_rule: string | null
  parent_task_id: string | null
  required_tools: string[]
  allowed_urls: string[]
  distraction_apps: string[]
  tags: string[]
}

function parseTask(row: Record<string, unknown>): Task {
  return {
    ...row,
    required_tools: JSON.parse((row.required_tools as string) || '[]'),
    allowed_urls: JSON.parse((row.allowed_urls as string) || '[]'),
    distraction_apps: JSON.parse((row.distraction_apps as string) || '[]'),
    tags: JSON.parse((row.tags as string) || '[]'),
  } as Task
}

export function registerTaskIpc(): void {
  ipcMain.handle('tasks:list', (_e, filter?: { status?: string; date?: string }) => {
    const db = getDb()
    let query = 'SELECT * FROM tasks WHERE 1=1'
    const params: unknown[] = []

    if (filter?.status) {
      query += ' AND status = ?'
      params.push(filter.status)
    }
    if (filter?.date) {
      const start = new Date(filter.date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(filter.date)
      end.setHours(23, 59, 59, 999)
      query += ' AND (due_at BETWEEN ? AND ? OR (due_at IS NULL AND date(created_at/1000, "unixepoch") = ?))'
      params.push(start.getTime(), end.getTime(), filter.date)
    }
    query += ' ORDER BY priority DESC, due_at ASC NULLS LAST, created_at ASC'

    const rows = db.prepare(query).all(...params) as Record<string, unknown>[]
    return rows.map(parseTask)
  })

  ipcMain.handle('tasks:today', () => {
    const db = getDb()
    const today = new Date()
    const start = new Date(today)
    start.setHours(0, 0, 0, 0)
    const end = new Date(today)
    end.setHours(23, 59, 59, 999)

    const rows = db.prepare(`
      SELECT * FROM tasks
      WHERE status NOT IN ('completed', 'cancelled')
        AND (due_at BETWEEN ? AND ? OR due_at IS NULL OR due_at < ?)
      ORDER BY
        CASE priority WHEN 'critical' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 END,
        due_at ASC NULLS LAST
    `).all(start.getTime(), end.getTime(), end.getTime()) as Record<string, unknown>[]
    return rows.map(parseTask)
  })

  ipcMain.handle('tasks:create', (_e, data: Omit<Task, 'id' | 'created_at'>) => {
    const db = getDb()
    const task: Task = {
      ...data,
      id: randomUUID(),
      created_at: Date.now(),
      status: data.status || 'pending',
    }
    db.prepare(`
      INSERT INTO tasks (id, title, description, due_at, priority, estimate_minutes, status,
        created_at, completed_at, recurrence_rule, parent_task_id, required_tools, allowed_urls,
        distraction_apps, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      task.id, task.title, task.description, task.due_at, task.priority,
      task.estimate_minutes, task.status, task.created_at, task.completed_at,
      task.recurrence_rule, task.parent_task_id,
      JSON.stringify(task.required_tools), JSON.stringify(task.allowed_urls),
      JSON.stringify(task.distraction_apps), JSON.stringify(task.tags)
    )
    return task
  })

  ipcMain.handle('tasks:update', (_e, id: string, data: Partial<Task>) => {
    const db = getDb()
    const updates: string[] = []
    const params: unknown[] = []
    const jsonFields = new Set(['required_tools', 'allowed_urls', 'distraction_apps', 'tags'])

    for (const [key, val] of Object.entries(data)) {
      if (key === 'id') continue
      updates.push(`${key} = ?`)
      params.push(jsonFields.has(key) ? JSON.stringify(val) : val)
    }
    if (!updates.length) return null

    params.push(id)
    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params)

    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? parseTask(row) : null
  })

  ipcMain.handle('tasks:delete', (_e, id: string) => {
    const db = getDb()
    // Cascade delete subtasks
    db.prepare('DELETE FROM tasks WHERE parent_task_id = ?').run(id)
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
    return { ok: true }
  })

  ipcMain.handle('tasks:subtasks', (_e, parentId: string) => {
    const db = getDb()
    const rows = db.prepare(
      'SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY created_at ASC'
    ).all(parentId) as Record<string, unknown>[]
    return rows.map(parseTask)
  })

  ipcMain.handle('tasks:complete-subtasks', (_e, parentId: string) => {
    const db = getDb()
    const completedAt = Date.now()
    db.prepare(
      `UPDATE tasks SET status = 'completed', completed_at = ? WHERE parent_task_id = ? AND status != 'completed'`
    ).run(completedAt, parentId)
    return { ok: true }
  })

  ipcMain.handle('tasks:complete', (_e, id: string) => {
    const db = getDb()
    const completedAt = Date.now()
    db.prepare(`UPDATE tasks SET status = 'completed', completed_at = ? WHERE id = ?`).run(completedAt, id)
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? parseTask(row) : null
  })

  ipcMain.handle('tasks:start', (_e, id: string) => {
    const db = getDb()
    db.prepare(`UPDATE tasks SET status = 'pending' WHERE status = 'in_progress' AND id != ?`).run(id)
    db.prepare(`UPDATE tasks SET status = 'in_progress' WHERE id = ?`).run(id)

    const sessionId = randomUUID()
    db.prepare(`INSERT INTO sessions (id, task_id, started_at) VALUES (?, ?, ?)`).run(sessionId, id, Date.now())

    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return { task: row ? parseTask(row) : null, sessionId }
  })

  ipcMain.handle('tasks:snooze', (_e, id: string, minutes: number) => {
    const snoozeUntil = Date.now() + minutes * 60 * 1000
    getDb().prepare(`UPDATE tasks SET status = 'snoozed', due_at = ? WHERE id = ?`).run(snoozeUntil, id)
    return { ok: true }
  })

  ipcMain.handle('tasks:upcoming', () => {
    const db = getDb()
    const now = Date.now()
    const weekLater = now + 7 * 24 * 60 * 60 * 1000
    const rows = db.prepare(`
      SELECT * FROM tasks
      WHERE status NOT IN ('completed', 'cancelled')
        AND due_at BETWEEN ? AND ?
      ORDER BY due_at ASC
    `).all(now, weekLater) as Record<string, unknown>[]
    return rows.map(parseTask)
  })
}
