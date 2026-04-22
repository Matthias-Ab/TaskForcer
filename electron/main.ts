import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import { initDb, getSetting } from './db'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AutoLaunch = require('auto-launch')
const autoLauncher = new AutoLaunch({ name: 'TaskForcer', isHidden: true })
import { registerTaskIpc } from './ipc/tasks'
import { registerShameIpc } from './ipc/shame'
import { registerScoresIpc, calculateTodayScore } from './ipc/scores'
import { registerSettingsIpc } from './ipc/settings'
import { registerTemplatesIpc } from './ipc/templates'
import { registerForcingIpc, startIdleDetection, setupEndOfDayGuard } from './forcing'
import { registerFocusIpc } from './focus-tracker'
import { initScheduler } from './scheduler'
import { createTray, destroyTray } from './tray'
import { createWidgetWindow, showWidget, updateWidgetTask, registerWidgetIpc } from './widget-window'

const isDev = process.env.NODE_ENV === 'development'

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
    setupEndOfDayGuard(mainWindow!)
  })

  mainWindow.on('closed', () => { mainWindow = null })

  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.restore()
    else mainWindow?.maximize()
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
  ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false)

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
  initDb()

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
  registerForcingIpc()
  registerWidgetIpc()
  registerFocusIpc()
  registerMainIpc()

  initScheduler()
  startIdleDetection()

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
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    destroyTray()
    app.quit()
  }
})

app.on('will-quit', () => destroyTray())
