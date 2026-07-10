import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import log from 'electron-log/main'
import { initDb, getSetting } from './db'

// Logs uncaught exceptions/rejections to disk and shows an error dialog instead
// of silently dying (default behavior for the main process).
log.errorHandler.startCatching()

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AutoLaunch = require('auto-launch')
const autoLauncher = new AutoLaunch({ name: 'TaskForcer', isHidden: true })
import { registerTaskIpc } from './ipc/tasks'
import { registerShameIpc } from './ipc/shame'
import { registerScoresIpc, calculateTodayScore } from './ipc/scores'
import { registerSettingsIpc } from './ipc/settings'
import { registerTemplatesIpc } from './ipc/templates'
import { registerProjectsIpc } from './ipc/projects'
import { registerSessionsIpc } from './ipc/sessions'
import { registerForcingIpc, startIdleDetection, setupEndOfDayGuard, stopCheckinSchedule } from './forcing'
import { registerFocusIpc, stopFocusTracking } from './focus-tracker'
import { initScheduler } from './scheduler'
import { createTray, destroyTray } from './tray'
import { createWidgetWindow, showWidget, updateWidgetTask, registerWidgetIpc } from './widget-window'

const isDev = process.env.NODE_ENV === 'development'

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

let mainWindow: BrowserWindow | null = null
let morningWindow: BrowserWindow | null = null

function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 500,
    frame: false,
    show: false,
    backgroundColor: '#18181b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.on('closed', () => { mainWindow = null })
  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximize-changed', true))
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximize-changed', false))

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    log.error('Renderer process gone:', details)
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (isDev) mainWindow.loadURL('http://localhost:5173')
    else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  })

  mainWindow.webContents.on('unresponsive', () => {
    log.warn('Main window renderer became unresponsive')
  })

  return mainWindow
}

function createMorningWindow(): BrowserWindow {
  morningWindow = new BrowserWindow({
    width: 700,
    height: 550,
    frame: false,
    show: false,
    resizable: false,
    center: true,
    backgroundColor: '#18181b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    morningWindow.loadURL('http://localhost:5173/morning.html')
  } else {
    morningWindow.loadFile(path.join(__dirname, '../dist/morning.html'))
  }

  morningWindow.on('closed', () => { morningWindow = null })
  return morningWindow
}

function checkMorningPopup(): void {
  const today = new Date().toISOString().split('T')[0]
  const stateDir = path.join(app.getPath('home'), '.taskforcer')
  const statePath = path.join(stateDir, 'state.json')

  if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true })

  let state: Record<string, string> = {}
  try { state = JSON.parse(fs.readFileSync(statePath, 'utf-8')) } catch { /* first run */ }

  if (state.morning_popup_date !== today) {
    state.morning_popup_date = today
    fs.writeFileSync(statePath, JSON.stringify(state), 'utf-8')
    setTimeout(() => {
      if (morningWindow && !morningWindow.isDestroyed()) morningWindow.show()
    }, 1500)
  }
}

function registerMainIpc(): void {
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.restore()
    else mainWindow?.maximize()
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
  ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false)

  ipcMain.handle('morning:dismiss', () => {
    morningWindow?.hide()
    return { ok: true }
  })

  ipcMain.handle('task:started', (_e, taskId: string, taskTitle: string) => {
    updateWidgetTask(taskId, taskTitle)
    showWidget()
    return { ok: true }
  })

  ipcMain.handle('task:stopped', () => {
    updateWidgetTask(null, null)
    stopCheckinSchedule()
    stopFocusTracking()
    return { ok: true }
  })

  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
  })

  ipcMain.handle('scoring:invalidate', () => {
    try { calculateTodayScore() } catch { /* noop */ }
    return { ok: true }
  })
}

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) return

  let dbInit: { recoveredFromCorruption: boolean; quarantinePath?: string }
  try {
    dbInit = initDb()
  } catch (err) {
    log.error('Failed to initialize database:', err)
    dialog.showErrorBox(
      'TaskForcer failed to start',
      `The local database could not be opened, and TaskForcer cannot continue.\n\n` +
      `${err instanceof Error ? err.message : String(err)}\n\n` +
      `If this keeps happening after reinstalling, check the log file for details.`
    )
    app.quit()
    return
  }

  if (dbInit.recoveredFromCorruption) {
    dialog.showMessageBoxSync({
      type: 'warning',
      title: 'TaskForcer data was reset',
      message: 'Your local database file appeared to be corrupted, so TaskForcer started fresh with a new one.',
      detail: dbInit.quarantinePath
        ? `The old file was kept for inspection at:\n${dbInit.quarantinePath}`
        : undefined,
    })
  }

  // Apply auto-launch setting
  const autoLaunchEnabled = getSetting('auto_launch') === 'true'
  autoLauncher.isEnabled().then((enabled: boolean) => {
    if (autoLaunchEnabled && !enabled) autoLauncher.enable().catch(() => {})
    else if (!autoLaunchEnabled && enabled) autoLauncher.disable().catch(() => {})
  }).catch(() => {})

  // Re-apply when user toggles the setting
  ipcMain.handle('auto_launch:toggle', (_e, enable: boolean) => {
    if (enable) autoLauncher.enable().catch(() => {})
    else autoLauncher.disable().catch(() => {})
    return { ok: true }
  })

  registerTaskIpc()
  registerShameIpc()
  registerScoresIpc()
  registerSettingsIpc()
  registerTemplatesIpc()
  registerProjectsIpc()
  registerSessionsIpc()
  registerForcingIpc()
  registerWidgetIpc()
  registerFocusIpc()
  registerMainIpc()

  initScheduler()
  startIdleDetection()

  setupEndOfDayGuard()

  const win = createMainWindow()
  createMorningWindow()
  createWidgetWindow(isDev)

  win.once('ready-to-show', () => {
    createTray(win)
    checkMorningPopup()
  })

  app.on('activate', () => {
    if (!mainWindow) createMainWindow()
    else { mainWindow.show(); mainWindow.focus() }
  })
}).catch((err) => {
  log.error('Fatal error during startup:', err)
  dialog.showErrorBox('TaskForcer failed to start', err instanceof Error ? err.message : String(err))
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    destroyTray()
    app.quit()
  }
})

app.on('will-quit', () => destroyTray())
