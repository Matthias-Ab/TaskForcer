import { ipcMain } from 'electron'
import { getDb } from '../db'
import { randomUUID } from 'crypto'

export interface TaskTemplate {
  id: string
  name: string
  data: {
    title: string
    description: string
    priority: 'low' | 'medium' | 'critical'
    estimate_minutes: number
    tags: string[]
    recurrence_rule: string | null
  }
  created_at: number
}

export function registerTemplatesIpc(): void {
  ipcMain.handle('templates:list', () => {
    const rows = getDb().prepare('SELECT * FROM task_templates ORDER BY created_at DESC').all() as { id: string; name: string; data: string; created_at: number }[]
    return rows.map(r => ({ ...r, data: JSON.parse(r.data) }))
  })

  ipcMain.handle('templates:save', (_e, name: string, data: TaskTemplate['data']) => {
    const id = randomUUID()
    getDb().prepare('INSERT INTO task_templates (id, name, data, created_at) VALUES (?, ?, ?, ?)')
      .run(id, name, JSON.stringify(data), Date.now())
    return { id, name, data, created_at: Date.now() }
  })

  ipcMain.handle('templates:delete', (_e, id: string) => {
    getDb().prepare('DELETE FROM task_templates WHERE id = ?').run(id)
    return { ok: true }
  })
}
