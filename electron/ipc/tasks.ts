import { ipcMain } from 'electron'
import { getDb } from '../db'
import { randomUUID } from 'crypto'
import { spawnNextRecurrence } from '../scheduler'

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
  project_id: string | null
  sort_order: number
  blocked_by: string[]
  elapsed_seconds: number
  required_tools: string[]
  allowed_urls: string[]
  distraction_apps: string[]
  tags: string[]
}

const UPDATABLE_FIELDS = new Set([
  'title', 'description', 'due_at', 'priority', 'estimate_minutes', 'status',
  'completed_at', 'recurrence_rule', 'parent_task_id', 'project_id', 'sort_order',
  'blocked_by', 'elapsed_seconds', 'required_tools', 'allowed_urls', 'distraction_apps', 'tags',
])

export function parseTask(row: Record<string, unknown>): Task {
  return {
    ...row,
    required_tools: JSON.parse((row.required_tools as string) || '[]'),
    allowed_urls: JSON.parse((row.allowed_urls as string) || '[]'),
    distraction_apps: JSON.parse((row.distraction_apps as string) || '[]'),
    tags: JSON.parse((row.tags as string) || '[]'),
    blocked_by: JSON.parse((row.blocked_by as string) || '[]'),
    project_id: (row.project_id as string) || null,
    sort_order: (row.sort_order as number) || 0,
    elapsed_seconds: (row.elapsed_seconds as number) || 0,
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
    if (filter?.date && !isNaN(new Date(filter.date).getTime())) {
      const start = new Date(filter.date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(filter.date)
      end.setHours(23, 59, 59, 999)
      query += " AND (due_at BETWEEN ? AND ? OR (due_at IS NULL AND date(created_at/1000, 'unixepoch') = ?))"
      params.push(start.getTime(), end.getTime(), filter.date)
    }
    query += ` ORDER BY
      CASE priority WHEN 'critical' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 END,
      due_at ASC NULLS LAST, created_at ASC`

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
        sort_order ASC,
        due_at ASC NULLS LAST,
        created_at ASC
    `).all(start.getTime(), end.getTime(), end.getTime()) as Record<string, unknown>[]
    return rows.map(parseTask)
  })

  ipcMain.handle('tasks:create', (_e, data: Partial<Omit<Task, 'id' | 'created_at'>> & { title: string }) => {
    const db = getDb()
    const task: Task = {
      title: data.title,
      description: data.description ?? '',
      due_at: data.due_at ?? null,
      priority: data.priority || 'medium',
      estimate_minutes: data.estimate_minutes ?? 30,
      status: data.status || 'pending',
      completed_at: data.completed_at ?? null,
      recurrence_rule: data.recurrence_rule ?? null,
      parent_task_id: data.parent_task_id ?? null,
      project_id: data.project_id ?? null,
      sort_order: data.sort_order ?? 0,
      blocked_by: data.blocked_by ?? [],
      elapsed_seconds: data.elapsed_seconds ?? 0,
      required_tools: data.required_tools ?? [],
      allowed_urls: data.allowed_urls ?? [],
      distraction_apps: data.distraction_apps ?? [],
      tags: data.tags ?? [],
      id: randomUUID(),
      created_at: Date.now(),
    }
    db.prepare(`
      INSERT INTO tasks (id, title, description, due_at, priority, estimate_minutes, status,
        created_at, completed_at, recurrence_rule, parent_task_id, project_id, sort_order,
        blocked_by, elapsed_seconds, required_tools, allowed_urls, distraction_apps, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      task.id, task.title, task.description, task.due_at, task.priority,
      task.estimate_minutes, task.status, task.created_at, task.completed_at,
      task.recurrence_rule, task.parent_task_id, task.project_id, task.sort_order,
      JSON.stringify(task.blocked_by), task.elapsed_seconds,
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
      if (!UPDATABLE_FIELDS.has(key)) continue
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
    const task = row ? parseTask(row) : null
    // Spawn next occurrence for recurring tasks
    if (task?.recurrence_rule) spawnNextRecurrence(id)
    return task
  })

  ipcMain.handle('tasks:start', (_e, id: string) => {
    const db = getDb()

    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined
    const task = row ? parseTask(row) : null
    if (task?.blocked_by.length) {
      const blockers = db.prepare(
        `SELECT title FROM tasks WHERE id IN (${task.blocked_by.map(() => '?').join(',')}) AND status NOT IN ('completed', 'cancelled')`
      ).all(...task.blocked_by) as { title: string }[]
      if (blockers.length) {
        throw new Error(`Blocked by: ${blockers.map(b => b.title).join(', ')}`)
      }
    }

    db.prepare(`UPDATE tasks SET status = 'pending' WHERE status = 'in_progress' AND id != ?`).run(id)
    db.prepare(`UPDATE tasks SET status = 'in_progress' WHERE id = ?`).run(id)
    // Defensively close any session left open by a prior task that never got an explicit stop event
    db.prepare(`UPDATE sessions SET ended_at = ? WHERE ended_at IS NULL AND task_id != ?`).run(Date.now(), id)

    const sessionId = randomUUID()
    db.prepare(`INSERT INTO sessions (id, task_id, started_at) VALUES (?, ?, ?)`).run(sessionId, id, Date.now())

    const updatedRow = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return { task: updatedRow ? parseTask(updatedRow) : null, sessionId }
  })

  ipcMain.handle('tasks:snooze', (_e, id: string, minutes: number) => {
    const snoozeUntil = Date.now() + minutes * 60 * 1000
    getDb().prepare(`UPDATE tasks SET status = 'snoozed', due_at = ? WHERE id = ?`).run(snoozeUntil, id)
    return { ok: true }
  })

  ipcMain.handle('tasks:reorder', (_e, orderedIds: string[]) => {
    const db = getDb()
    const update = db.prepare('UPDATE tasks SET sort_order = ? WHERE id = ?')
    const tx = db.transaction(() => {
      orderedIds.forEach((id, i) => update.run(i, id))
    })
    tx()
    return { ok: true }
  })

  ipcMain.handle('tasks:log-elapsed', (_e, id: string, seconds: number) => {
    getDb().prepare('UPDATE tasks SET elapsed_seconds = elapsed_seconds + ? WHERE id = ?').run(seconds, id)
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
