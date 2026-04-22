import { ipcMain } from 'electron'
import { getDb, getSetting } from '../db'
import { randomUUID } from 'crypto'

export interface ShameEntry {
  id: string
  type: 'distraction' | 'skipped_checkin' | 'missed_task' | 'late_completion' | 'excuse'
  task_id: string | null
  message: string
  created_at: number
}

const ROASTS: Record<ShameEntry['type'], string[]> = {
  distraction: [
    'Incredible. You lasted {time} before your attention span gave up.',
    'Your focus just filed a restraining order against you.',
    'Another distraction? At this point just rename the task "Not Today".',
    'Scientists are baffled by your ability to avoid work so efficiently.',
    'You were supposed to be working. The internet thanks you though.',
  ],
  skipped_checkin: [
    'Check-in skipped. Was the task too boring or were you just busy being distracted?',
    'You ghosted your own task. Impressive commitment to avoidance.',
    'Skipped another check-in. The task is starting to feel unloved.',
    'Bold strategy — ignore the check-in and hope the task completes itself.',
    "Check-in skipped on \"{task}\". It's fine. Everything is fine.",
  ],
  missed_task: [
    '"{task}" survived another day untouched. Legendary procrastination.',
    'You let "{task}" die. Pour one out.',
    '"{task}" has been waiting so long it\'s considering therapy.',
    'Another day, another task sent to the graveyard. RIP "{task}".',
    '"{task}" missed. Your ancestors are disappointed.',
  ],
  late_completion: [
    'Better late than never — but barely.',
    'Finished it! Only {time} after the deadline. Totally fine.',
    'The task is done. The deadline is not fine, but the task is done.',
    'Completed — fashionably late as always.',
    'Done! The clock says you missed it. The clock is correct.',
  ],
  excuse: [
    'Filed under: Convincing Nobody.',
    'Noted. Still counts as a failure though.',
    'Great excuse. 0/10 would not accept.',
    'The excuse has been logged for posterity. And mockery.',
    'A valiant attempt at justification. Unaccepted.',
  ],
}

function getRoast(type: ShameEntry['type'], context?: string): string {
  const pool = ROASTS[type]
  const template = pool[Math.floor(Math.random() * pool.length)]
  return template
    .replace('{task}', context || 'the task')
    .replace('{time}', context || 'a few minutes')
}

export function registerShameIpc(): void {
  ipcMain.handle('shame:list', (_e, limit = 200, offset = 0) => {
    return getDb().prepare(
      'SELECT * FROM shame_log ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset) as ShameEntry[]
  })

  ipcMain.handle('shame:add', (_e, entry: Omit<ShameEntry, 'id' | 'created_at'>) => {
    const db = getDb()
    const id = randomUUID()
    const created_at = Date.now()
    const roastMode = getSetting('roast_mode') === 'true'
    const message = roastMode ? getRoast(entry.type, entry.task_id ? undefined : entry.message) : entry.message
    db.prepare(
      'INSERT INTO shame_log (id, type, task_id, message, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, entry.type, entry.task_id ?? null, message, created_at)
    return { id, ...entry, message, created_at }
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
