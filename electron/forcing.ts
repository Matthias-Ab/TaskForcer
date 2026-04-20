import {
  BrowserWindow, ipcMain, powerMonitor, Notification, app
} from 'electron'
import { getDb, getSetting } from './db'
import { randomUUID } from 'crypto'
import { calculateTodayScore } from './ipc/scores'

let checkinInterval: NodeJS.Timeout | null = null
let idleCheckInterval: NodeJS.Timeout | null = null
let activeTaskId: string | null = null
let checkinWindowRef: BrowserWindow | null = null

export function addShameEntry(entry: {
  type: 'distraction' | 'skipped_checkin' | 'missed_task' | 'late_completion' | 'excuse'
  task_id?: string | null
  message: string
}): void {
  const db = getDb()
  db.prepare(
    'INSERT INTO shame_log (id, type, task_id, message, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(randomUUID(), entry.type, entry.task_id ?? null, entry.message, Date.now())
}

export function startCheckinSchedule(taskId: string): void {
  stopCheckinSchedule()
  activeTaskId = taskId

  const intervalMin = parseInt(getSetting('checkin_interval_min') || '25', 10)
  checkinInterval = setInterval(() => {
    showCheckinDialog(taskId)
  }, intervalMin * 60 * 1000)
}

export function stopCheckinSchedule(): void {
  if (checkinInterval) {
    clearInterval(checkinInterval)
    checkinInterval = null
  }
  activeTaskId = null
}

function showCheckinDialog(taskId: string): void {
  const db = getDb()
  const task = db.prepare('SELECT title FROM tasks WHERE id = ?').get(taskId) as { title: string } | undefined
  if (!task) return

  const wins = BrowserWindow.getAllWindows()
  for (const win of wins) {
    if (!win.isDestroyed()) {
      win.webContents.send('forcing:checkin-request', { taskId, taskTitle: task.title })
      break
    }
  }
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

      if (hasCritical) escalateIdleNag(idleSeconds)
    }
  }, 60 * 1000)
}

function escalateIdleNag(idleSeconds: number): void {
  const mins = Math.floor(idleSeconds / 60)

  if (Notification.isSupported()) {
    new Notification({
      title: 'TaskForcer: You have critical tasks!',
      body: `You've been idle for ${mins} minutes. Critical tasks are waiting.`,
    }).show()
  }

  if (idleSeconds >= 20 * 60) {
    const mainWin = BrowserWindow.getAllWindows().find(w => !w.isDestroyed())
    if (mainWin) {
      mainWin.show()
      mainWin.focus()
      mainWin.webContents.send('forcing:idle-alert', { idleMinutes: mins })
    }
  }
}

export function setupEndOfDayGuard(win: BrowserWindow): void {
  app.on('before-quit', (e) => {
    const hour = new Date().getHours()
    const threshold = parseInt(getSetting('lockout_threshold') || '50', 10)
    if (hour < 18) return

    try {
      const score = calculateTodayScore()
      if (score.score < threshold) {
        e.preventDefault()
        win.webContents.send('forcing:lockout-request', { score: score.score, threshold })
      }
    } catch {
      // don't block quit if scoring fails
    }
  })
}

// IPC handlers for forcing mechanisms
export function registerForcingIpc(): void {
  ipcMain.handle('forcing:checkin-response', (_e, taskId: string, stillWorking: boolean) => {
    if (!stillWorking) {
      const db = getDb()
      const task = db.prepare('SELECT title FROM tasks WHERE id = ?').get(taskId) as { title: string } | undefined
      addShameEntry({
        type: 'skipped_checkin',
        task_id: taskId,
        message: `Skipped check-in for: ${task?.title || taskId}`,
      })
    }
    return { ok: true }
  })

  ipcMain.handle('forcing:lockout-excuse', (_e, reason: string) => {
    addShameEntry({
      type: 'excuse',
      message: `End-of-day excuse: ${reason}`,
    })
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
