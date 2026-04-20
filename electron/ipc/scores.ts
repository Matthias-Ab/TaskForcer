import { ipcMain } from 'electron'
import { getDb } from '../db'

export interface DailyScore {
  date: string
  completion_pct: number
  focus_pct: number
  score: number
  streak_day: number
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

  const totalEstimate = allTasks.reduce((s, t) => s + (t.estimate_minutes || 30), 0) * 60 * 1000

  const sessions = db.prepare(`
    SELECT SUM(active_seconds) as active FROM sessions
    WHERE started_at BETWEEN ? AND ?
  `).get(todayStart.getTime(), todayEnd.getTime()) as { active: number }

  const activeSeconds = sessions?.active || 0
  const focusPct = totalEstimate > 0
    ? Math.min(1, (activeSeconds * 1000) / totalEstimate)
    : 0

  const completionPct = allTasks.length > 0 ? completedAll.length / allTasks.length : 0
  const criticalPct = critical.length > 0 ? completedCritical.length / critical.length : 1

  // penalties
  const checkinPenalties = (db.prepare(
    "SELECT COUNT(*) as c FROM shame_log WHERE type='skipped_checkin' AND date(created_at/1000,'unixepoch')=?"
  ).get(today) as { c: number })?.c || 0
  const distractionPenalties = (db.prepare(
    "SELECT COUNT(*) as c FROM shame_log WHERE type='distraction' AND date(created_at/1000,'unixepoch')=?"
  ).get(today) as { c: number })?.c || 0
  const missedPenalties = (db.prepare(
    "SELECT COUNT(*) as c FROM shame_log WHERE type='missed_task' AND date(created_at/1000,'unixepoch')=?"
  ).get(today) as { c: number })?.c || 0

  const rawScore = (
    0.5 * criticalPct +
    0.3 * completionPct +
    0.2 * focusPct
  ) * 100 - checkinPenalties * 5 - distractionPenalties * 3 - missedPenalties * 10

  const score = Math.max(0, Math.min(100, rawScore))

  // streak
  const yesterday = new Date(todayStart)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const prevStreak = (db.prepare(
    'SELECT streak_day FROM daily_scores WHERE date = ?'
  ).get(yesterdayStr) as { streak_day: number } | undefined)?.streak_day || 0
  const streakDay = score >= 70 ? prevStreak + 1 : 0

  db.prepare(`
    INSERT OR REPLACE INTO daily_scores (date, completion_pct, focus_pct, score, streak_day)
    VALUES (?, ?, ?, ?, ?)
  `).run(today, completionPct * 100, focusPct * 100, score, streakDay)

  return { date: today, completion_pct: completionPct * 100, focus_pct: focusPct * 100, score, streak_day: streakDay }
}

export function registerScoresIpc(): void {
  ipcMain.handle('scores:today', () => calculateTodayScore())

  ipcMain.handle('scores:history', (_e, days = 30) => {
    const rows = getDb().prepare(
      'SELECT * FROM daily_scores ORDER BY date DESC LIMIT ?'
    ).all(days) as DailyScore[]
    return rows.reverse()
  })

  ipcMain.handle('scores:streak', () => {
    const row = getDb().prepare(
      'SELECT streak_day FROM daily_scores ORDER BY date DESC LIMIT 1'
    ).get() as { streak_day: number } | undefined
    return row?.streak_day || 0
  })
}
