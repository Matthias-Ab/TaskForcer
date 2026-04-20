import { BrowserWindow, ipcMain } from 'electron'
import { getDb, getSetting } from './db'
import { addShameEntry } from './forcing'

let pollInterval: NodeJS.Timeout | null = null
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
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  activeSessionId = null
  currentTaskId = null
}

async function doPoll(): Promise<void> {
  if (!activeSessionId || !currentTaskId) return

  const focusEnabled = getSetting('focus_tracking')
  if (focusEnabled === 'false') return

  try {
    // Dynamic import since active-win is ESM-only in newer versions
    const activeWin = await import('active-win')
    const win = await activeWin.default()
    if (!win) return

    const appName = win.owner?.name || ''
    const winTitle = win.title || ''

    const db = getDb()
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(currentTaskId) as {
      required_tools: string
      distraction_apps: string
    } | undefined

    if (!task) return

    const requiredTools: string[] = JSON.parse(task.required_tools || '[]')
    const distractionApps: string[] = JSON.parse(task.distraction_apps || '[]')
    const globalDistractions: string[] = JSON.parse(getSetting('distraction_apps') || '[]')
    const allDistractions = [...distractionApps, ...globalDistractions]

    const isDistraction = allDistractions.some(
      app => appName.toLowerCase().includes(app.toLowerCase()) ||
             winTitle.toLowerCase().includes(app.toLowerCase())
    )
    const isRequired = requiredTools.some(
      tool => appName.toLowerCase().includes(tool.toLowerCase())
    )

    const secondsElapsed = POLL_MS / 1000

    if (isDistraction) {
      continuousDistractionSeconds += secondsElapsed
      db.prepare(
        'UPDATE sessions SET distracted_seconds = distracted_seconds + ? WHERE id = ?'
      ).run(secondsElapsed, activeSessionId)

      if (continuousDistractionSeconds >= DISTRACTION_TOAST_THRESHOLD) {
        continuousDistractionSeconds = 0
        distractionToastCount++

        notifyDistraction(appName, winTitle)

        if (distractionToastCount >= DISTRACTION_LOG_THRESHOLD) {
          distractionToastCount = 0
          addShameEntry({
            type: 'distraction',
            task_id: currentTaskId,
            message: `Distracted by "${appName}" while working on task`,
          })
        }
      }
    } else {
      continuousDistractionSeconds = 0
      const col = isRequired ? 'active_seconds' : 'active_seconds'
      db.prepare(
        `UPDATE sessions SET ${col} = ${col} + ? WHERE id = ?`
      ).run(secondsElapsed, activeSessionId)
    }
  } catch {
    // active-win may fail silently in some environments — that's fine
  }
}

function notifyDistraction(appName: string, _winTitle: string): void {
  const wins = BrowserWindow.getAllWindows()
  for (const win of wins) {
    if (!win.isDestroyed()) {
      win.webContents.send('focus:distraction-toast', { appName })
      break
    }
  }
}

ipcMain.handle('focus:start', (_e, sessionId: string, taskId: string) => {
  startFocusTracking(sessionId, taskId)
  return { ok: true }
})

ipcMain.handle('focus:stop', () => {
  stopFocusTracking()
  return { ok: true }
})
