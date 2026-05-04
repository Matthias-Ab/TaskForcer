import { ipcMain } from 'electron'
import { getDb } from '../db'
import { randomUUID } from 'crypto'

export interface Project {
  id: string
  name: string
  color: string
  emoji: string
  created_at: number
}

export function registerProjectsIpc(): void {
  ipcMain.handle('projects:list', () => {
    return getDb().prepare('SELECT * FROM projects ORDER BY created_at ASC').all() as Project[]
  })

  ipcMain.handle('projects:create', (_e, data: { name: string; color: string; emoji: string }) => {
    const db = getDb()
    const project: Project = { id: randomUUID(), name: data.name, color: data.color || '#6366f1', emoji: data.emoji || '', created_at: Date.now() }
    db.prepare('INSERT INTO projects (id, name, color, emoji, created_at) VALUES (?, ?, ?, ?, ?)').run(project.id, project.name, project.color, project.emoji, project.created_at)
    return project
  })

  ipcMain.handle('projects:update', (_e, id: string, data: Partial<Project>) => {
    const db = getDb()
    const updates: string[] = []
    const params: unknown[] = []
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id') continue
      updates.push(`${key} = ?`)
      params.push(val)
    }
    if (!updates.length) return null
    params.push(id)
    db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params)
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project
  })

  ipcMain.handle('projects:delete', (_e, id: string) => {
    const db = getDb()
    // Unassign tasks from this project
    db.prepare('UPDATE tasks SET project_id = NULL WHERE project_id = ?').run(id)
    db.prepare('DELETE FROM projects WHERE id = ?').run(id)
    return { ok: true }
  })

  ipcMain.handle('projects:tasks', (_e, projectId: string) => {
    const db = getDb()
    const rows = db.prepare(
      "SELECT * FROM tasks WHERE project_id = ? AND parent_task_id IS NULL ORDER BY sort_order ASC, created_at ASC"
    ).all(projectId) as Record<string, unknown>[]
    return rows.map(r => ({
      ...r,
      tags: JSON.parse((r.tags as string) || '[]'),
      blocked_by: JSON.parse((r.blocked_by as string) || '[]'),
      required_tools: JSON.parse((r.required_tools as string) || '[]'),
      allowed_urls: JSON.parse((r.allowed_urls as string) || '[]'),
      distraction_apps: JSON.parse((r.distraction_apps as string) || '[]'),
      project_id: r.project_id || null,
      sort_order: r.sort_order || 0,
      elapsed_seconds: r.elapsed_seconds || 0,
    }))
  })
}
