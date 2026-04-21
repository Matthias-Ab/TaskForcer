import { createRequire } from 'module'
import path from 'path'
import fs from 'fs'

const { app, safeStorage } = await import('electron')

const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3') as typeof import('better-sqlite3')

let DB_DIR: string
let DB_PATH: string
let db: import('better-sqlite3').Database

export function getDb() {
  if (!db) throw new Error('DB not initialized')
  return db
}

export function initDb(): void {
  DB_DIR = path.join(app.getPath('home'), '.taskforcer')
  DB_PATH = path.join(DB_DIR, 'taskforcer.db')

  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  migrate(db)
}

function migrate(db: import('better-sqlite3').Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      due_at INTEGER,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','critical')),
      estimate_minutes INTEGER DEFAULT 30,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','snoozed','cancelled')),
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      recurrence_rule TEXT,
      parent_task_id TEXT REFERENCES tasks(id),
      required_tools TEXT DEFAULT '[]',
      allowed_urls TEXT DEFAULT '[]',
      distraction_apps TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      active_seconds INTEGER DEFAULT 0,
      idle_seconds INTEGER DEFAULT 0,
      distracted_seconds INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS shame_log (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('distraction','skipped_checkin','missed_task','late_completion','excuse')),
      task_id TEXT REFERENCES tasks(id),
      message TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_scores (
      date TEXT PRIMARY KEY,
      completion_pct REAL DEFAULT 0,
      focus_pct REAL DEFAULT 0,
      score REAL DEFAULT 0,
      streak_day INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_task ON sessions(task_id);
    CREATE INDEX IF NOT EXISTS idx_shame_log_created ON shame_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_daily_scores_date ON daily_scores(date DESC);
  `)

  const defaults: Record<string, string> = {
    work_start: '09:00',
    work_end: '18:00',
    checkin_interval_min: '25',
    lockout_threshold: '50',
    idle_threshold_min: '10',
    auto_launch: 'false',
    distraction_apps: '[]',
    sound_enabled: 'true',
    focus_tracking: 'true',
    shame_log_public: 'false',
  }
  const insert = db.prepare(`INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)`)
  for (const [k, v] of Object.entries(defaults)) insert.run(k, v)
}

export function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  getDb().prepare('INSERT OR REPLACE INTO settings(key, value) VALUES (?, ?)').run(key, value)
}

export function encryptValue(value: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(value).toString('base64')
  }
  return value
}

export function decryptValue(value: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(value, 'base64'))
    } catch {
      return value
    }
  }
  return value
}
