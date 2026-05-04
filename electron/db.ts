import { app, safeStorage } from 'electron'
import path from 'path'
import fs from 'fs'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3') as typeof import('better-sqlite3')

let DB_DIR: string
let DB_PATH: string
let db: import('better-sqlite3').Database

const settingCache = new Map<string, string>()

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
  db.pragma('wal_autocheckpoint = 1000')

  db.transaction(() => migrate(db))()
}

// ---------------------------------------------------------------------------
// Schema baseline — tables that exist from day 1
// ---------------------------------------------------------------------------
function createBaseTables(db: import('better-sqlite3').Database): void {
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

    CREATE TABLE IF NOT EXISTS task_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS xp_log (
      id TEXT PRIMARY KEY,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      emoji TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status   ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due       ON tasks(due_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_parent    ON tasks(parent_task_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_task   ON sessions(task_id);
    CREATE INDEX IF NOT EXISTS idx_shame_log_created   ON shame_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_daily_scores_date   ON daily_scores(date DESC);
    CREATE INDEX IF NOT EXISTS idx_xp_log_created      ON xp_log(created_at DESC);
  `)
}

// ---------------------------------------------------------------------------
// Numbered migrations — append only, never edit existing entries
// ---------------------------------------------------------------------------
const MIGRATIONS: string[] = [
  // 1 — columns added after initial release
  `ALTER TABLE tasks ADD COLUMN project_id TEXT REFERENCES projects(id)`,
  // 2
  `ALTER TABLE tasks ADD COLUMN sort_order INTEGER DEFAULT 0`,
  // 3
  `ALTER TABLE tasks ADD COLUMN blocked_by TEXT DEFAULT '[]'`,
  // 4
  `ALTER TABLE tasks ADD COLUMN elapsed_seconds INTEGER DEFAULT 0`,
  // 5
  `ALTER TABLE daily_scores ADD COLUMN freeze_used INTEGER DEFAULT 0`,
  // 6 — index on project_id (safe to run after column exists)
  `CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)`,
]

function runMigrations(db: import('better-sqlite3').Database): void {
  const { version } = db.prepare(
    `SELECT IFNULL(MAX(version), 0) AS version FROM schema_version`
  ).get() as { version: number }

  for (let i = version; i < MIGRATIONS.length; i++) {
    try {
      db.exec(MIGRATIONS[i])
    } catch (err: unknown) {
      // Tolerate "duplicate column name" and "index already exists" — these mean
      // the migration already applied outside the versioning system (old installs).
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('duplicate column name') && !msg.includes('already exists')) {
        throw err
      }
    }
    db.prepare(`INSERT INTO schema_version VALUES (?)`).run(i + 1)
  }
}

// ---------------------------------------------------------------------------
// Default settings seed
// ---------------------------------------------------------------------------
function seedSettings(db: import('better-sqlite3').Database): void {
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

function migrate(db: import('better-sqlite3').Database): void {
  createBaseTables(db)
  runMigrations(db)
  seedSettings(db)
}

// ---------------------------------------------------------------------------
// Settings helpers with in-memory cache
// ---------------------------------------------------------------------------
export function getSetting(key: string): string | null {
  if (settingCache.has(key)) return settingCache.get(key)!
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  const value = row?.value ?? null
  if (value !== null) settingCache.set(key, value)
  return value
}

export function setSetting(key: string, value: string): void {
  getDb().prepare('INSERT OR REPLACE INTO settings(key, value) VALUES (?, ?)').run(key, value)
  settingCache.set(key, value)
}

// ---------------------------------------------------------------------------
// Encryption helpers
// ---------------------------------------------------------------------------
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
