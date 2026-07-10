import { ipcMain } from 'electron'
import { getDb } from '../db'
import { randomUUID } from 'crypto'

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function unescapeIcsText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

function toIcsDate(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function fromIcsDate(value: string): number | null {
  // Handles both floating (YYYYMMDDTHHMMSS) and UTC (...Z) forms, and all-day (YYYYMMDD)
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z)?$/)
  if (!m) return null
  const [, y, mo, d, h = '00', mi = '00', s = '00', z] = m
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}${z ? 'Z' : ''}`
  const ts = new Date(iso).getTime()
  return Number.isNaN(ts) ? null : ts
}

// Folds long lines per RFC 5545 (75 octets, continuation lines start with a space)
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const chunks: string[] = []
  let rest = line
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75))
    rest = ' ' + rest.slice(75)
  }
  chunks.push(rest)
  return chunks.join('\r\n')
}

export function registerCalendarIpc(): void {
  ipcMain.handle('calendar:export-ics', () => {
    const db = getDb()
    const tasks = db.prepare(`
      SELECT id, title, description, due_at, estimate_minutes FROM tasks
      WHERE due_at IS NOT NULL AND status NOT IN ('cancelled')
    `).all() as { id: string; title: string; description: string; due_at: number; estimate_minutes: number }[]

    const now = toIcsDate(Date.now())
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TaskForcer//EN', 'CALSCALE:GREGORIAN']

    for (const t of tasks) {
      const durationMin = t.estimate_minutes || 30
      lines.push(
        'BEGIN:VEVENT',
        `UID:${t.id}@taskforcer`,
        `DTSTAMP:${now}`,
        `DTSTART:${toIcsDate(t.due_at)}`,
        `DTEND:${toIcsDate(t.due_at + durationMin * 60 * 1000)}`,
        `SUMMARY:${escapeIcsText(t.title)}`,
      )
      if (t.description) lines.push(`DESCRIPTION:${escapeIcsText(t.description)}`)
      lines.push('END:VEVENT')
    }
    lines.push('END:VCALENDAR')

    return lines.map(foldLine).join('\r\n')
  })

  ipcMain.handle('calendar:import-ics', (_e, icsText: string) => {
    const db = getDb()
    // Unfold continuation lines first
    const unfolded = icsText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
    const lines = unfolded.split(/\r\n|\n|\r/)

    const events: Record<string, string>[] = []
    let current: Record<string, string> | null = null
    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (line === 'BEGIN:VEVENT') { current = {}; continue }
      if (line === 'END:VEVENT') { if (current) events.push(current); current = null; continue }
      if (!current) continue
      const idx = line.indexOf(':')
      if (idx === -1) continue
      const key = line.slice(0, idx).split(';')[0] // drop params like ;TZID=...
      const value = line.slice(idx + 1)
      current[key] = value
    }

    let imported = 0
    const insert = db.prepare(`
      INSERT INTO tasks (id, title, description, due_at, priority, estimate_minutes, status,
        created_at, required_tools, allowed_urls, distraction_apps, tags)
      VALUES (?, ?, ?, ?, 'medium', 30, 'pending', ?, '[]', '[]', '[]', '[]')
    `)
    for (const ev of events) {
      if (!ev.SUMMARY) continue
      const dueAt = ev.DTSTART ? fromIcsDate(ev.DTSTART) : null
      const description = ev.DESCRIPTION ? unescapeIcsText(ev.DESCRIPTION) : ''
      insert.run(randomUUID(), unescapeIcsText(ev.SUMMARY), description, dueAt, Date.now())
      imported++
    }

    return { imported, total: events.length }
  })
}
