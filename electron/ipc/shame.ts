import { ipcMain } from 'electron'
import { getDb } from '../db.js'
import { randomUUID } from 'crypto'

export interface ShameEntry {
  id: string
  type: 'distraction' | 'skipped_checkin' | 'missed_task' | 'late_completion' | 'excuse'
  task_id: string | null
  message: string
  created_at: number
}

export function registerShameIpc(): void {
  ipcMain.handle('shame:list', (_e, limit = 200, offset = 0) => {
    return getDb().prepare(
      'SELECT * FROM shame_log ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset) as ShameEntry[]
  })

  ipcMain.handle('shame:add', (_e, entry: Omit<ShameEntry, 'id' | 'created_at'>) => {
    const db = getDb()
    const id = randomUUID()
    const created_at = Date.now()
    db.prepare(
      'INSERT INTO shame_log (id, type, task_id, message, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, entry.type, entry.task_id ?? null, entry.message, created_at)
    return { id, ...entry, created_at }
  })

  ipcMain.handle('shame:clear', () => {
    getDb().prepare('DELETE FROM shame_log').run()
    return { ok: true }
  })

  ipcMain.handle('shame:count', () => {
    const row = getDb().prepare('SELECT COUNT(*) as count FROM shame_log').get() as { count: number }
    return row.count
  })
}
