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

  // Daily shame-log breakdown by type, for the last N days
  ipcMain.handle('scores:shame-trend', (_e, days = 30) => {
    const db = getDb()
    const since = Date.now() - days * 24 * 60 * 60 * 1000
    const rows = db.prepare(`
      SELECT date(created_at/1000,'unixepoch') as date, type, COUNT(*) as count
      FROM shame_log
      WHERE created_at >= ?
      GROUP BY date, type
      ORDER BY date ASC
    `).all(since) as { date: string; type: string; count: number }[]

    const byDate = new Map<string, Record<string, number>>()
    for (const r of rows) {
      if (!byDate.has(r.date)) byDate.set(r.date, {})
      byDate.get(r.date)![r.type] = r.count
    }
    return Array.from(byDate.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date))
  })

  // Estimate accuracy: how estimate_minutes compares to actual elapsed_seconds for completed tasks
  ipcMain.handle('scores:estimate-accuracy', () => {
    const db = getDb()
    const rows = db.prepare(`
      SELECT estimate_minutes, elapsed_seconds FROM tasks
      WHERE status = 'completed' AND elapsed_seconds > 0 AND estimate_minutes > 0
    `).all() as { estimate_minutes: number; elapsed_seconds: number }[]

    if (!rows.length) return { sampleSize: 0, avgRatio: null, overestimatedPct: 0, underestimatedPct: 0 }

    const ratios = rows.map(r => (r.elapsed_seconds / 60) / r.estimate_minutes)
    const avgRatio = ratios.reduce((s, r) => s + r, 0) / ratios.length
    const overestimated = ratios.filter(r => r < 0.9).length
    const underestimated = ratios.filter(r => r > 1.1).length

    return {
      sampleSize: rows.length,
      avgRatio,
      overestimatedPct: Math.round((overestimated / rows.length) * 100),
      underestimatedPct: Math.round((underestimated / rows.length) * 100),
    }
  })

  // Average score by day-of-week, over the last N days
  ipcMain.handle('scores:day-of-week', (_e, days = 90) => {
    const db = getDb()
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const rows = db.prepare(`
      SELECT date, score FROM daily_scores WHERE date >= ?
    `).all(cutoff) as { date: string; score: number }[]

    const buckets: number[][] = Array.from({ length: 7 }, () => [])
    for (const r of rows) {
      const day = new Date(r.date + 'T00:00:00').getDay()
      buckets[day].push(r.score)
    }
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return labels.map((label, i) => ({
      day: label,
      avgScore: buckets[i].length ? Math.round(buckets[i].reduce((s, v) => s + v, 0) / buckets[i].length) : null,
      sampleSize: buckets[i].length,
    }))
  })

  // Completion rate and time spent per project
  ipcMain.handle('scores:by-project', () => {
    const db = getDb()
    return db.prepare(`
      SELECT
        p.id as project_id, p.name, p.color, p.emoji,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        COALESCE(SUM(t.elapsed_seconds), 0) as total_elapsed_seconds
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at ASC
    `).all()
  })

  // Dates where a streak freeze was used
  ipcMain.handle('scores:freeze-history', () => {
    const db = getDb()
    return db.prepare(`
      SELECT date, streak_day FROM daily_scores WHERE freeze_used = 1 ORDER BY date DESC
    `).all()
  })

  // This week's average score vs the prior week
  ipcMain.handle('scores:week-over-week', () => {
    const db = getDb()
    const now = new Date()
    const dayOfWeek = now.getDay()
    const thisWeekStart = new Date(now)
    thisWeekStart.setDate(now.getDate() - dayOfWeek)
    thisWeekStart.setHours(0, 0, 0, 0)
    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(thisWeekStart.getDate() - 7)

    const fmt = (d: Date) => d.toISOString().split('T')[0]
    const avgFor = (from: string, to: string) => {
      const row = db.prepare('SELECT AVG(score) as avg FROM daily_scores WHERE date >= ? AND date < ?').get(from, to) as { avg: number | null }
      return row.avg
    }
    const thisWeekAvg = avgFor(fmt(thisWeekStart), fmt(new Date(thisWeekStart.getTime() + 7 * 86400000)))
    const lastWeekAvg = avgFor(fmt(lastWeekStart), fmt(thisWeekStart))

    return {
      thisWeekAvg: thisWeekAvg !== null ? Math.round(thisWeekAvg) : null,
      lastWeekAvg: lastWeekAvg !== null ? Math.round(lastWeekAvg) : null,
      deltaPct: (thisWeekAvg !== null && lastWeekAvg) ? Math.round(((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100) : null,
    }
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
