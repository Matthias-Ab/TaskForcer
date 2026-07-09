import { ipcMain } from 'electron'
import { getDb } from '../db'
import { addShameEntry, ShameEntry } from '../forcing'

export function registerShameIpc(): void {
  ipcMain.handle('shame:list', (_e, limit = 200, offset = 0) => {
    return getDb().prepare(
      'SELECT * FROM shame_log ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset) as ShameEntry[]
  })

  ipcMain.handle('shame:add', (_e, entry: Omit<ShameEntry, 'id' | 'created_at'>) => {
    return addShameEntry(entry)
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
