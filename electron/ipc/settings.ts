import { ipcMain, safeStorage } from 'electron'
import { getSetting, setSetting, getDb, encryptValue, decryptValue } from '../db'

// Tables covered by export/import, in an order safe for re-insertion
// (projects before tasks, tasks before sessions, since tasks/sessions reference them).
const BACKUP_TABLES = ['projects', 'tasks', 'sessions', 'shame_log', 'daily_scores', 'settings', 'task_templates', 'xp_log'] as const

function getTableColumns(db: import('better-sqlite3').Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(r => r.name)
}

function buildExportPayload(): Record<string, unknown> {
  const db = getDb()
  const data: Record<string, unknown[]> = {}
  for (const table of BACKUP_TABLES) {
    data[table] = db.prepare(`SELECT * FROM ${table}`).all()
  }
  return { ...data, exported_at: new Date().toISOString(), version: 1 }
}

function applyImportPayload(payload: Record<string, unknown>): { ok: true } {
  const db = getDb()
  const rowsByTable = BACKUP_TABLES.map(table => ({
    table,
    rows: Array.isArray(payload[table]) ? payload[table] as Record<string, unknown>[] : null,
  }))
  if (rowsByTable.every(t => t.rows === null)) {
    throw new Error('Import file does not contain any recognized TaskForcer data')
  }

  const tx = db.transaction(() => {
    // Delete in reverse order so foreign-key references are cleared before their targets
    for (const table of [...BACKUP_TABLES].reverse()) {
      db.prepare(`DELETE FROM ${table}`).run()
    }
    for (const { table, rows } of rowsByTable) {
      if (!rows) continue
      const validColumns = new Set(getTableColumns(db, table))
      for (const row of rows) {
        const columns = Object.keys(row).filter(c => validColumns.has(c))
        if (!columns.length) continue
        const placeholders = columns.map(() => '?').join(', ')
        db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`)
          .run(...columns.map(c => row[c]))
      }
    }
  })
  tx()
  return { ok: true }
}

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', (_e, key: string) => getSetting(key))
  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    setSetting(key, value)
    return { ok: true }
  })
  ipcMain.handle('settings:getAll', () => {
    const rows = getDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  })

  ipcMain.handle('settings:export', () => buildExportPayload())
  ipcMain.handle('settings:import', (_e, payload: Record<string, unknown>) => applyImportPayload(payload))

  // Encrypted backup: same data, wrapped with OS-keychain-backed encryption (safeStorage).
  // Only decryptable on this machine, by this OS user -- not a portable/cross-device format.
  ipcMain.handle('settings:export-encrypted', () => {
    const json = JSON.stringify(buildExportPayload())
    return { data: encryptValue(json), encrypted: safeStorage.isEncryptionAvailable() }
  })

  ipcMain.handle('settings:import-encrypted', (_e, payload: { data: string }) => {
    // decryptValue never throws (falls back to returning its input on failure), so a bad/
    // foreign-machine backup surfaces here as invalid JSON rather than a decryption error.
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(decryptValue(payload.data))
    } catch {
      throw new Error('Could not decrypt this backup — it may be from a different computer or user account')
    }
    return applyImportPayload(parsed)
  })

  ipcMain.handle('settings:resetStreaks', () => {
    getDb().prepare('UPDATE daily_scores SET streak_day = 0').run()
    return { ok: true }
  })

  ipcMain.handle('settings:clearShameLog', () => {
    getDb().prepare('DELETE FROM shame_log').run()
    return { ok: true }
  })
}
