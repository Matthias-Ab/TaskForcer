import { calculateTodayScore } from './ipc/scores.js'

const { Tray, Menu, BrowserWindow, nativeImage, app } = await import('electron')

let tray: InstanceType<typeof Tray> | null = null
let scoreUpdateInterval: ReturnType<typeof setInterval> | null = null

function getTrayIcon(score: number): Electron.NativeImage {
  const size = 16
  const buffer = Buffer.alloc(size * size * 4)
  const color = score >= 80 ? { r: 52, g: 211, b: 153 } : score >= 50 ? { r: 251, g: 191, b: 36 } : { r: 239, g: 68, b: 68 }
  for (let i = 0; i < size * size; i++) {
    const o = i * 4
    buffer[o] = color.r; buffer[o + 1] = color.g; buffer[o + 2] = color.b; buffer[o + 3] = 255
  }
  return nativeImage.createFromBuffer(buffer, { width: size, height: size })
}

export function createTray(mainWindow: InstanceType<typeof BrowserWindow>): InstanceType<typeof Tray> {
  tray = new Tray(getTrayIcon(0))
  tray.setToolTip('TaskForcer')
  updateTray(mainWindow)

  scoreUpdateInterval = setInterval(() => updateTray(mainWindow), 5 * 60 * 1000)
  tray.on('click', () => { mainWindow.show(); mainWindow.focus() })
  return tray
}

function updateTray(mainWindow: InstanceType<typeof BrowserWindow>): void {
  if (!tray) return
  let score = 0
  let scoreLabel = 'No data yet'
  try {
    const s = calculateTodayScore()
    score = Math.round(s.score)
    scoreLabel = `Today: ${score}/100`
    tray.setImage(getTrayIcon(score))
  } catch { /* noop */ }

  const menu = Menu.buildFromTemplate([
    { label: 'TaskForcer', enabled: false },
    { type: 'separator' },
    { label: scoreLabel, enabled: false },
    { type: 'separator' },
    { label: 'Show App', click: () => { mainWindow.show(); mainWindow.focus() } },
    { label: "Today's Tasks", click: () => { mainWindow.show(); mainWindow.focus(); mainWindow.webContents.send('navigate', '/today') } },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ])
  tray.setContextMenu(menu)
  tray.setTitle(` ${score}`)
}

export function destroyTray(): void {
  if (scoreUpdateInterval) clearInterval(scoreUpdateInterval)
  if (tray) { tray.destroy(); tray = null }
}
