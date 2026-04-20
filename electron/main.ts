import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { initDb } from './db'
import { registerTaskIpc } from './ipc/tasks'
import { registerShameIpc } from './ipc/shame'
import { registerScoresIpc } from './ipc/scores'
import { registerSettingsIpc } from './ipc/settings'
import { registerForcingIpc, startIdleDetection, setupEndOfDayGuard } from './forcing'
import { initScheduler } from './scheduler'
import { createTray, destroyTray } from './tray'
import { createWidgetWindow, showWidget, updateWidgetTask } from './widget-window'
import AutoLaunch from 'auto-launch'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let morningWindow: BrowserWindow | null = null
let autoLauncher: AutoLaunch | null = null

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

  // Window control IPC
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
  const Store = require('electron-store')
  const store = new Store({ name: 'taskforcer-state' })
  const lastShown = store.get('morning_popup_date', '')

  if (lastShown !== today) {
    store.set('morning_popup_date', today)
    setTimeout(() => {
      if (morningWindow && !morningWindow.isDestroyed()) morningWindow.show()
    }, 1500)
  }
}

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
  // Only allow http/https URLs
  if (url.startsWith('http://') || url.startsWith('https://')) {
    shell.openExternal(url)
  }
})

async function setupAutoLaunch(): Promise<void> {
  autoLauncher = new AutoLaunch({
    name: 'TaskForcer',
    path: app.getPath('exe'),
  })
}

app.whenReady().then(async () => {
  initDb()

  // Register all IPC handlers
  registerTaskIpc()
  registerShameIpc()
  registerScoresIpc()
  registerSettingsIpc()
  registerForcingIpc()

  // Initialize features
  initScheduler()
  startIdleDetection()

  // Create windows (morning preloaded hidden)
  const win = createMainWindow()
  createMorningWindow()
  createWidgetWindow(isDev)

  // Tray
  mainWindow!.once('ready-to-show', () => {
    createTray(win)
    checkMorningPopup()
  })

  await setupAutoLaunch()

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

app.on('will-quit', () => {
  destroyTray()
})
