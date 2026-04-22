"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.initDb = initDb;
exports.getSetting = getSetting;
exports.setSetting = setSetting;
exports.encryptValue = encryptValue;
exports.decryptValue = decryptValue;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3');
let DB_DIR;
let DB_PATH;
let db;
function getDb() {
    if (!db)
        throw new Error('DB not initialized');
    return db;
}
function initDb() {
    DB_DIR = path_1.default.join(electron_1.app.getPath('home'), '.taskforcer');
    DB_PATH = path_1.default.join(DB_DIR, 'taskforcer.db');
    if (!fs_1.default.existsSync(DB_DIR))
        fs_1.default.mkdirSync(DB_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
}
function migrate(db) {
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

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_task ON sessions(task_id);
    CREATE INDEX IF NOT EXISTS idx_shame_log_created ON shame_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_daily_scores_date ON daily_scores(date DESC);
    CREATE INDEX IF NOT EXISTS idx_xp_log_created ON xp_log(created_at DESC);
  `);
    // Migrations for existing DBs
    const cols = db.prepare(`PRAGMA table_info(daily_scores)`).all().map(c => c.name);
    if (!cols.includes('freeze_used')) {
        db.exec(`ALTER TABLE daily_scores ADD COLUMN freeze_used INTEGER DEFAULT 0`);
    }
    const defaults = {
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
    };
    const insert = db.prepare(`INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)`);
    for (const [k, v] of Object.entries(defaults))
        insert.run(k, v);
}
function getSetting(key) {
    const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row?.value ?? null;
}
function setSetting(key, value) {
    getDb().prepare('INSERT OR REPLACE INTO settings(key, value) VALUES (?, ?)').run(key, value);
}
function encryptValue(value) {
    if (electron_1.safeStorage.isEncryptionAvailable()) {
        return electron_1.safeStorage.encryptString(value).toString('base64');
    }
    return value;
}
function decryptValue(value) {
    if (electron_1.safeStorage.isEncryptionAvailable()) {
        try {
            return electron_1.safeStorage.decryptString(Buffer.from(value, 'base64'));
        }
        catch {
            return value;
        }
    }
    return value;
}
