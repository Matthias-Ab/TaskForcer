import { BrowserWindow, ipcMain, screen } from 'electron'
import path from 'path'

let widgetWin: BrowserWindow | null = null

export function createWidgetWindow(isDev: boolean): BrowserWindow {
  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize

  widgetWin = new BrowserWindow({
    width: 320,
    height: 90,
    x: width - 340,
    y: height - 110,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    widgetWin.loadURL('http://localhost:5173/widget.html')
  } else {
    widgetWin.loadFile(path.join(__dirname, '../dist/widget.html'))
  }

  widgetWin.on('closed', () => { widgetWin = null })
  return widgetWin
}

export function showWidget(): void {
  if (widgetWin && !widgetWin.isDestroyed()) widgetWin.show()
}

export function hideWidget(): void {
  if (widgetWin && !widgetWin.isDestroyed()) widgetWin.hide()
}

export function updateWidgetTask(taskId: string | null, taskTitle: string | null): void {
  if (widgetWin && !widgetWin.isDestroyed()) {
    widgetWin.webContents.send('widget:update-task', { taskId, taskTitle })
  }
}

export function registerWidgetIpc(): void {
  ipcMain.handle('widget:minimize-temporarily', () => {
    if (widgetWin && !widgetWin.isDestroyed()) {
      widgetWin.hide()
      setTimeout(() => { if (widgetWin && !widgetWin.isDestroyed()) widgetWin.show() }, 30 * 1000)
    }
    return { ok: true }
  })

  ipcMain.handle('widget:set-position', (_e, x: number, y: number) => {
    if (widgetWin && !widgetWin.isDestroyed()) widgetWin.setPosition(Math.round(x), Math.round(y))
    return { ok: true }
  })
}
