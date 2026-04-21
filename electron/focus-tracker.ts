import { getDb, getSetting } from './db.js'
import { addShameEntry } from './forcing.js'

const { BrowserWindow, ipcMain } = await import('electron')

let pollInterval: ReturnType<typeof setInterval> | null = null
let activeSessionId: string | null = null
let currentTaskId: string | null = null
let continuousDistractionSeconds = 0
let distractionToastCount = 0

const POLL_MS = 5000
const DISTRACTION_TOAST_THRESHOLD = 60
const DISTRACTION_LOG_THRESHOLD = 3

export function startFocusTracking(sessionId: string, taskId: string): void {
  stopFocusTracking()
  activeSessionId = sessionId
  currentTaskId = taskId
  continuousDistractionSeconds = 0
  distractionToastCount = 0
  pollInterval = setInterval(doPoll, POLL_MS)
}

export function stopFocusTracking(): void {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
  activeSessionId = null
  currentTaskId = null
}

async function doPoll(): Promise<void> {
  if (!activeSessionId || !currentTaskId) return
  if (getSetting('focus_tracking') === 'false') return

  try {
    const activeWin = await import('active-win')
    const win = await activeWin.default()
    if (!win) return

    const appName = win.owner?.name || ''
    const db = getDb()
    const task = db.prepare('SELECT distraction_apps FROM tasks WHERE id = ?').get(currentTaskId) as {
      distraction_apps: string
    } | undefined
    if (!task) return

    const distractionApps: string[] = JSON.parse(task.distraction_apps || '[]')
    const globalDistractions: string[] = JSON.parse(getSetting('distraction_apps') || '[]')
    const allDistractions = [...distractionApps, ...globalDistractions]

    const isDistraction = allDistractions.some(a => appName.toLowerCase().includes(a.toLowerCase()))
    const secondsElapsed = POLL_MS / 1000

    if (isDistraction) {
      continuousDistractionSeconds += secondsElapsed
      db.prepare('UPDATE sessions SET distracted_seconds = distracted_seconds + ? WHERE id = ?')
        .run(secondsElapsed, activeSessionId)

      if (continuousDistractionSeconds >= DISTRACTION_TOAST_THRESHOLD) {
        continuousDistractionSeconds = 0
        distractionToastCount++
        notifyDistraction(appName)

        if (distractionToastCount >= DISTRACTION_LOG_THRESHOLD) {
          distractionToastCount = 0
          addShameEntry({ type: 'distraction', task_id: currentTaskId, message: `Distracted by "${appName}"` })
        }
      }
    } else {
      continuousDistractionSeconds = 0
      db.prepare('UPDATE sessions SET active_seconds = active_seconds + ? WHERE id = ?')
        .run(secondsElapsed, activeSessionId)
    }
  } catch { /* active-win may fail silently */ }
}

function notifyDistraction(appName: string): void {
  const win = BrowserWindow.getAllWindows().find(w => !w.isDestroyed())
  win?.webContents.send('focus:distraction-toast', { appName })
}

export function registerFocusIpc(): void {
  ipcMain.handle('focus:start', (_e, sessionId: string, taskId: string) => {
    startFocusTracking(sessionId, taskId)
    return { ok: true }
  })

  ipcMain.handle('focus:stop', () => {
    stopFocusTracking()
    return { ok: true }
  })
}
