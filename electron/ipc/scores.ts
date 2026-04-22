import { ipcMain } from 'electron'
import { getDb } from '../db'
import { randomUUID } from 'crypto'

export interface DailyScore {
  date: string
  completion_pct: number
  focus_pct: number
  score: number
  streak_day: number
  freeze_used: number
}

export interface XPStatus {
  total_xp: number
  level: number
  level_title: string
  xp_in_level: number
  xp_for_next: number
  xp_pct: number
}

// Level thresholds and titles
const LEVELS: { min: number; title: string }[] = [
  { min: 0,     title: 'Productive Intern' },
  { min: 100,   title: 'Task Wrangler' },
  { min: 300,   title: 'Focus Apprentice' },
  { min: 600,   title: 'Deadline Slayer' },
  { min: 1000,  title: 'Efficiency Expert' },
  { min: 1500,  title: 'Execution Machine' },
  { min: 2200,  title: 'Senior Executioner' },
  { min: 3000,  title: 'Velocity God' },
  { min: 4000,  title: 'Productivity Legend' },
  { min: 5500,  title: 'Transcendent Finisher' },
]

export function getXPStatus(totalXp: number): XPStatus {
  let level = 0
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVELS[i].min) { level = i; break }
  }
  const current = LEVELS[level].min
  const next = LEVELS[level + 1]?.min ?? current + 1000
  const xpInLevel = totalXp - current
  const xpForNext = next - current
  return {
    total_xp: totalXp,
    level,
    level_title: LEVELS[level].title,
    xp_in_level: xpInLevel,
    xp_for_next: xpForNext,
    xp_pct: Math.min(100, Math.round((xpInLevel / xpForNext) * 100)),
  }
}

function awardXP(reason: string, amount: number): void {
  const db = getDb()
  db.prepare('INSERT INTO xp_log (id, amount, reason, created_at) VALUES (?, ?, ?, ?)')
    .run(randomUUID(), amount, reason, Date.now())
}

export function getTotalXP(): number {
  const db = getDb()
  const row = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log').get() as { total: number }
  return row.total
}

export function getStreakFreezes(): number {
  const db = getDb()
  const row = db.prepare("SELECT COALESCE(value, '0') as v FROM settings WHERE key = 'streak_freezes'").get() as { v: string } | undefined
  return parseInt(row?.v ?? '0', 10)
}

export function calculateTodayScore(): DailyScore {
  const db = getDb()
  const today = new Date().toISOString().split('T')[0]

  const todayStart = new Date(today)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)

  const allTasks = db.prepare(`
    SELECT * FROM tasks
    WHERE status NOT IN ('cancelled')
      AND (due_at BETWEEN ? AND ? OR (due_at IS NULL AND date(created_at/1000,'unixepoch') = ?))
  `).all(todayStart.getTime(), todayEnd.getTime(), today) as { status: string; priority: string; estimate_minutes: number }[]

  const critical = allTasks.filter(t => t.priority === 'critical')
  const completedCritical = critical.filter(t => t.status === 'completed')
  const completedAll = allTasks.filter(t => t.status === 'completed')

  const sessions = db.prepare(`
    SELECT SUM(active_seconds) as active FROM sessions WHERE started_at BETWEEN ? AND ?
  `).get(todayStart.getTime(), todayEnd.getTime()) as { active: number }

  const activeSeconds = sessions?.active || 0
  const totalEstimateSec = allTasks.reduce((s, t) => s + (t.estimate_minutes || 30), 0) * 60
  const focusPct = totalEstimateSec > 0 ? Math.min(1, activeSeconds / totalEstimateSec) : 0
  const completionPct = allTasks.length > 0 ? completedAll.length / allTasks.length : 0
  const criticalPct = critical.length > 0 ? completedCritical.length / critical.length : 1

  const checkinPenalties = (db.prepare("SELECT COUNT(*) as c FROM shame_log WHERE type='skipped_checkin' AND date(created_at/1000,'unixepoch')=?").get(today) as { c: number })?.c || 0
  const distractionPenalties = (db.prepare("SELECT COUNT(*) as c FROM shame_log WHERE type='distraction' AND date(created_at/1000,'unixepoch')=?").get(today) as { c: number })?.c || 0
  const missedPenalties = (db.prepare("SELECT COUNT(*) as c FROM shame_log WHERE type='missed_task' AND date(created_at/1000,'unixepoch')=?").get(today) as { c: number })?.c || 0

  const rawScore = (0.5 * criticalPct + 0.3 * completionPct + 0.2 * focusPct) * 100
    - checkinPenalties * 5 - distractionPenalties * 3 - missedPenalties * 10
  const score = Math.max(0, Math.min(100, rawScore))

  // Streak logic with freeze support
  const yesterday = new Date(todayStart)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const prevRow = db.prepare('SELECT streak_day, freeze_used FROM daily_scores WHERE date = ?').get(yesterdayStr) as { streak_day: number; freeze_used: number } | undefined
  const prevStreak = prevRow?.streak_day || 0

  const existingToday = db.prepare('SELECT streak_day, freeze_used FROM daily_scores WHERE date = ?').get(today) as { streak_day: number; freeze_used: number } | undefined
  const freezeUsed = existingToday?.freeze_used || 0

  let streakDay: number
  if (score >= 70) {
    streakDay = prevStreak + 1
    // Award XP for completing the day (only once per day)
    const alreadyAwarded = db.prepare("SELECT 1 FROM xp_log WHERE reason = ? AND date(created_at/1000,'unixepoch') = ?").get(`day_complete:${today}`, today)
    if (!alreadyAwarded) {
      const xpAmount = Math.round(score / 10) + (completedAll.length * 5) + (completedCritical.length * 10)
      awardXP(`day_complete:${today}`, xpAmount)
      // Award streak milestone freezes
      if (streakDay % 7 === 0) {
        const current = getStreakFreezes()
        db.prepare("INSERT OR REPLACE INTO settings(key, value) VALUES ('streak_freezes', ?)").run(String(current + 1))
      }
    }
  } else {
    streakDay = 0
  }

  db.prepare(`INSERT OR REPLACE INTO daily_scores (date, completion_pct, focus_pct, score, streak_day, freeze_used) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(today, completionPct * 100, focusPct * 100, score, streakDay, freezeUsed)

  return { date: today, completion_pct: completionPct * 100, focus_pct: focusPct * 100, score, streak_day: streakDay, freeze_used: freezeUsed }
}

export function registerScoresIpc(): void {
  ipcMain.handle('scores:today', () => calculateTodayScore())

  ipcMain.handle('scores:history', (_e, days = 30) => {
    return (getDb().prepare('SELECT * FROM daily_scores ORDER BY date DESC LIMIT ?').all(days) as DailyScore[]).reverse()
  })

  ipcMain.handle('scores:streak', () => {
    const row = getDb().prepare('SELECT streak_day FROM daily_scores ORDER BY date DESC LIMIT 1').get() as { streak_day: number } | undefined
    return row?.streak_day || 0
  })

  ipcMain.handle('scores:xp', () => {
    const total = getTotalXP()
    return getXPStatus(total)
  })

  ipcMain.handle('scores:streak-freezes', () => getStreakFreezes())

  ipcMain.handle('scores:use-freeze', () => {
    const db = getDb()
    const freezes = getStreakFreezes()
    if (freezes <= 0) return { ok: false, reason: 'No freezes available' }

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // Restore yesterday's streak into today
    const prevStreak = (db.prepare('SELECT streak_day FROM daily_scores WHERE date = ?').get(yesterdayStr) as { streak_day: number } | undefined)?.streak_day || 1
    db.prepare(`INSERT OR REPLACE INTO daily_scores (date, completion_pct, focus_pct, score, streak_day, freeze_used) VALUES (?, 0, 0, 0, ?, 1)`)
      .run(today, prevStreak)
    db.prepare("INSERT OR REPLACE INTO settings(key, value) VALUES ('streak_freezes', ?)").run(String(freezes - 1))

    return { ok: true, streak_restored: prevStreak }
  })

  // Focus DNA: hourly completion heatmap
  ipcMain.handle('scores:focus-dna', () => {
    const db = getDb()
    const rows = db.prepare(`
      SELECT strftime('%H', completed_at/1000, 'unixepoch') as hour,
             COUNT(*) as count
      FROM tasks
      WHERE status = 'completed' AND completed_at IS NOT NULL
      GROUP BY hour
      ORDER BY hour
    `).all() as { hour: string; count: number }[]

    const heatmap = Array.from({ length: 24 }, (_, i) => {
      const found = rows.find(r => parseInt(r.hour) === i)
      return { hour: i, count: found?.count || 0 }
    })
    return heatmap
  })
}
