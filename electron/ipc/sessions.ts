import { ipcMain } from 'electron'
import { getDb } from '../db'

export interface SessionEntry {
  id: string
  task_id: string
  task_title: string
  started_at: number
  ended_at: number | null
  active_seconds: number
  idle_seconds: number
  distracted_seconds: number
}

export function registerSessionsIpc(): void {
  ipcMain.handle('sessions:list', (_e, limit = 50, offset = 0) => {
    return getDb().prepare(`
      SELECT s.id, s.task_id, t.title as task_title, s.started_at, s.ended_at,
             s.active_seconds, s.idle_seconds, s.distracted_seconds
      FROM sessions s
      JOIN tasks t ON t.id = s.task_id
      ORDER BY s.started_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as SessionEntry[]
  })

  ipcMain.handle('sessions:for-task', (_e, taskId: string) => {
    return getDb().prepare(`
      SELECT s.id, s.task_id, t.title as task_title, s.started_at, s.ended_at,
             s.active_seconds, s.idle_seconds, s.distracted_seconds
      FROM sessions s
      JOIN tasks t ON t.id = s.task_id
      WHERE s.task_id = ?
      ORDER BY s.started_at DESC
    `).all(taskId) as SessionEntry[]
  })
}
