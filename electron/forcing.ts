import { BrowserWindow, ipcMain, powerMonitor, Notification, app } from 'electron'
import { getDb, getSetting } from './db'
import { calculateTodayScore } from './ipc/scores'
import { randomUUID } from 'crypto'
import { getRoast, ShameType } from './roasts'

let checkinInterval: ReturnType<typeof setInterval> | null = null
let idleCheckInterval: ReturnType<typeof setInterval> | null = null
let activeTaskId: string | null = null

export interface ShameEntry {
  id: string
  type: ShameType
  task_id: string | null
  message: string
  created_at: number
}

// Only these categories use the {task} placeholder in their roast templates
const TASK_CONTEXT_TYPES = new Set<ShameType>(['skipped_checkin', 'missed_task'])

export function addShameEntry(entry: {
  type: ShameType
  task_id?: string | null
  message: string
}): ShameEntry {
  const db = getDb()
  const roastMode = getSetting('roast_mode') === 'true'

  let context: string | undefined
  if (roastMode && entry.task_id && TASK_CONTEXT_TYPES.has(entry.type)) {
    const task = db.prepare('SELECT title FROM tasks WHERE id = ?').get(entry.task_id) as { title: string } | undefined
    context = task?.title
  }
  const message = roastMode ? getRoast(entry.type, context) : entry.message

  const id = randomUUID()
  const created_at = Date.now()
  db.prepare(
    'INSERT INTO shame_log (id, type, task_id, message, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, entry.type, entry.task_id ?? null, message, created_at)
  return { id, type: entry.type, task_id: entry.task_id ?? null, message, created_at }
}

const DEFAULT_CHECKIN_INTERVALS: Record<string, string> = {
  critical: 'checkin_interval_critical',
  medium: 'checkin_interval_medium',
  low: 'checkin_interval_low',
}
const DEFAULT_CHECKIN_MINUTES: Record<string, string> = {
  critical: '15',
  medium: '25',
  low: '40',
}

export function startCheckinSchedule(taskId: string): void {
  stopCheckinSchedule()
  activeTaskId = taskId

  const db = getDb()
  const task = db.prepare('SELECT priority FROM tasks WHERE id = ?').get(taskId) as { priority: string } | undefined
  const priority = task?.priority || 'medium'
  const settingKey = DEFAULT_CHECKIN_INTERVALS[priority] || 'checkin_interval_medium'
  const fallback = DEFAULT_CHECKIN_MINUTES[priority] || '25'
  const intervalMin = parseInt(getSetting(settingKey) || getSetting('checkin_interval_min') || fallback, 10)

  checkinInterval = setInterval(() => showCheckinDialog(taskId), intervalMin * 60 * 1000)
}

export function stopCheckinSchedule(): void {
  if (checkinInterval) { clearInterval(checkinInterval); checkinInterval = null }
  activeTaskId = null
}

function showCheckinDialog(taskId: string): void {
  const db = getDb()
  const task = db.prepare('SELECT title FROM tasks WHERE id = ?').get(taskId) as { title: string } | undefined
  if (!task) return

  const win = BrowserWindow.getAllWindows().find(w => !w.isDestroyed())
  win?.webContents.send('forcing:checkin-request', { taskId, taskTitle: task.title })
}

export function startIdleDetection(): void {
  if (idleCheckInterval) clearInterval(idleCheckInterval)

  idleCheckInterval = setInterval(() => {
    const thresholdMin = parseInt(getSetting('idle_threshold_min') || '10', 10)
    const idleSeconds = powerMonitor.getSystemIdleTime()

    if (idleSeconds >= thresholdMin * 60) {
      const db = getDb()
      const hasCritical = db.prepare(
        "SELECT 1 FROM tasks WHERE priority='critical' AND status NOT IN ('completed','cancelled') LIMIT 1"
      ).get()
      if (hasCritical) escalateIdleNag(idleSeconds, thresholdMin)
    }
  }, 60 * 1000)
}

function escalateIdleNag(idleSeconds: number, thresholdMin: number): void {
  const mins = Math.floor(idleSeconds / 60)
  if (getSetting('notify_idle') !== 'false' && Notification.isSupported()) {
    new Notification({
      title: 'TaskForcer: You have critical tasks!',
      body: `You've been idle for ${mins} minutes.`,
    }).show()
  }
  // Bring the window to the front once idle time doubles the configured threshold
  if (idleSeconds >= thresholdMin * 2 * 60) {
    const mainWin = BrowserWindow.getAllWindows().find(w => !w.isDestroyed())
    if (mainWin) {
      mainWin.show()
      mainWin.focus()
      mainWin.webContents.send('forcing:idle-alert', { idleMinutes: mins })
    }
  }
}

let endOfDayGuardRegistered = false

export function setupEndOfDayGuard(): void {
  if (endOfDayGuardRegistered) return
  endOfDayGuardRegistered = true

  app.on('before-quit', (e) => {
    const hour = new Date().getHours()
    const threshold = parseInt(getSetting('lockout_threshold') || '50', 10)
    if (hour < 18) return
    const win = BrowserWindow.getAllWindows().find(w => !w.isDestroyed())
    if (!win) return
    try {
      const score = calculateTodayScore()
      if (score.score < threshold) {
        e.preventDefault()
        win.webContents.send('forcing:lockout-request', { score: score.score, threshold })
      }
    } catch { /* noop */ }
  })
}

export function registerForcingIpc(): void {
  ipcMain.handle('forcing:checkin-response', (_e, taskId: string, stillWorking: boolean) => {
    if (!stillWorking) {
      const db = getDb()
      const task = db.prepare('SELECT title FROM tasks WHERE id = ?').get(taskId) as { title: string } | undefined
      addShameEntry({ type: 'skipped_checkin', task_id: taskId, message: `Skipped check-in for: ${task?.title || taskId}` })
    }
    return { ok: true }
  })

  ipcMain.handle('forcing:lockout-excuse', (_e, reason: string) => {
    addShameEntry({ type: 'excuse', message: `End-of-day excuse: ${reason}` })
    app.exit(0)
    return { ok: true }
  })

  ipcMain.handle('forcing:start-task-session', (_e, taskId: string) => {
    startCheckinSchedule(taskId)
    return { ok: true }
  })

  ipcMain.handle('forcing:stop-task-session', () => {
    stopCheckinSchedule()
    return { ok: true }
  })

  ipcMain.handle('forcing:get-active-task', () => activeTaskId)
}
