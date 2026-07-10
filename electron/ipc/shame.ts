import { ipcMain } from 'electron'
import { getDb } from '../db'
import { addShameEntry, ShameEntry } from '../forcing'
import { ShameType } from '../roasts'

export interface ShameFilters {
  type?: ShameType
  search?: string
  from?: number
  to?: number
}

function buildWhere(filters?: ShameFilters): { where: string; params: unknown[] } {
  const clauses: string[] = []
  const params: unknown[] = []
  if (filters?.type) { clauses.push('type = ?'); params.push(filters.type) }
  if (filters?.search) { clauses.push('message LIKE ? ESCAPE \'\\\''); params.push(`%${filters.search.replace(/[%_\\]/g, '\\$&')}%`) }
  if (filters?.from) { clauses.push('created_at >= ?'); params.push(filters.from) }
  if (filters?.to) { clauses.push('created_at <= ?'); params.push(filters.to) }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params }
}

export function registerShameIpc(): void {
  ipcMain.handle('shame:list', (_e, limit = 200, offset = 0, filters?: ShameFilters) => {
    const { where, params } = buildWhere(filters)
    return getDb().prepare(
      `SELECT * FROM shame_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as ShameEntry[]
  })

  ipcMain.handle('shame:add', (_e, entry: Omit<ShameEntry, 'id' | 'created_at'>) => {
    return addShameEntry(entry)
  })

  ipcMain.handle('shame:clear', () => {
    getDb().prepare('DELETE FROM shame_log').run()
    return { ok: true }
  })

  ipcMain.handle('shame:count', (_e, filters?: ShameFilters) => {
    const { where, params } = buildWhere(filters)
    const row = getDb().prepare(`SELECT COUNT(*) as count FROM shame_log ${where}`).get(...params) as { count: number }
    return row.count
  })
}
