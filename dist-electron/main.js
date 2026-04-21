"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = require("./db");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AutoLaunch = require('auto-launch');
const autoLauncher = new AutoLaunch({ name: 'TaskForcer', isHidden: true });
const tasks_1 = require("./ipc/tasks");
const shame_1 = require("./ipc/shame");
const scores_1 = require("./ipc/scores");
const settings_1 = require("./ipc/settings");
const forcing_1 = require("./forcing");
const focus_tracker_1 = require("./focus-tracker");
const scheduler_1 = require("./scheduler");
const tray_1 = require("./tray");
const widget_window_1 = require("./widget-window");
const isDev = process.env.NODE_ENV === 'development';
let mainWindow = null;
let morningWindow = null;
function createMainWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1100,
        height: 720,
        minWidth: 800,
        minHeight: 500,
        frame: false,
        show: false,
        backgroundColor: '#18181b',
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        (0, forcing_1.setupEndOfDayGuard)(mainWindow);
    });
    mainWindow.on('closed', () => { mainWindow = null; });
    electron_1.ipcMain.handle('window:minimize', () => mainWindow?.minimize());
    electron_1.ipcMain.handle('window:maximize', () => {
        if (mainWindow?.isMaximized())
            mainWindow.restore();
        else
            mainWindow?.maximize();
    });
    electron_1.ipcMain.handle('window:close', () => mainWindow?.close());
    electron_1.ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false);
    return mainWindow;
}
function createMorningWindow() {
    morningWindow = new electron_1.BrowserWindow({
        width: 700,
        height: 550,
        frame: false,
        show: false,
        resizable: false,
        center: true,
        backgroundColor: '#18181b',
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    if (isDev) {
        morningWindow.loadURL('http://localhost:5173/morning.html');
    }
    else {
        morningWindow.loadFile(path_1.default.join(__dirname, '../dist/morning.html'));
    }
    morningWindow.on('closed', () => { morningWindow = null; });
    return morningWindow;
}
function checkMorningPopup() {
    const today = new Date().toISOString().split('T')[0];
    const stateDir = path_1.default.join(electron_1.app.getPath('home'), '.taskforcer');
    const statePath = path_1.default.join(stateDir, 'state.json');
    if (!fs_1.default.existsSync(stateDir))
        fs_1.default.mkdirSync(stateDir, { recursive: true });
    let state = {};
    try {
        state = JSON.parse(fs_1.default.readFileSync(statePath, 'utf-8'));
    }
    catch { /* first run */ }
    if (state.morning_popup_date !== today) {
        state.morning_popup_date = today;
        fs_1.default.writeFileSync(statePath, JSON.stringify(state), 'utf-8');
        setTimeout(() => {
            if (morningWindow && !morningWindow.isDestroyed())
                morningWindow.show();
        }, 1500);
    }
}
function registerMainIpc() {
    electron_1.ipcMain.handle('morning:dismiss', () => {
        morningWindow?.hide();
        return { ok: true };
    });
    electron_1.ipcMain.handle('task:started', (_e, taskId, taskTitle) => {
        (0, widget_window_1.updateWidgetTask)(taskId, taskTitle);
        (0, widget_window_1.showWidget)();
        return { ok: true };
    });
    electron_1.ipcMain.handle('task:stopped', () => {
        (0, widget_window_1.updateWidgetTask)(null, null);
        return { ok: true };
    });
    electron_1.ipcMain.handle('shell:openExternal', (_e, url) => {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            electron_1.shell.openExternal(url);
        }
    });
    electron_1.ipcMain.handle('scoring:invalidate', () => {
        try {
            (0, scores_1.calculateTodayScore)();
        }
        catch { /* noop */ }
        return { ok: true };
    });
}
electron_1.app.whenReady().then(async () => {
    (0, db_1.initDb)();
    // Apply auto-launch setting
    const autoLaunchEnabled = (0, db_1.getSetting)('auto_launch') === 'true';
    autoLauncher.isEnabled().then((enabled) => {
        if (autoLaunchEnabled && !enabled)
            autoLauncher.enable().catch(() => { });
        else if (!autoLaunchEnabled && enabled)
            autoLauncher.disable().catch(() => { });
    }).catch(() => { });
    // Re-apply when user toggles the setting
    electron_1.ipcMain.handle('auto_launch:toggle', (_e, enable) => {
        if (enable)
            autoLauncher.enable().catch(() => { });
        else
            autoLauncher.disable().catch(() => { });
        return { ok: true };
    });
    (0, tasks_1.registerTaskIpc)();
    (0, shame_1.registerShameIpc)();
    (0, scores_1.registerScoresIpc)();
    (0, settings_1.registerSettingsIpc)();
    (0, forcing_1.registerForcingIpc)();
    (0, widget_window_1.registerWidgetIpc)();
    (0, focus_tracker_1.registerFocusIpc)();
    registerMainIpc();
    (0, scheduler_1.initScheduler)();
    (0, forcing_1.startIdleDetection)();
    const win = createMainWindow();
    createMorningWindow();
    (0, widget_window_1.createWidgetWindow)(isDev);
    win.once('ready-to-show', () => {
        (0, tray_1.createTray)(win);
        checkMorningPopup();
    });
    electron_1.app.on('activate', () => {
        if (!mainWindow)
            createMainWindow();
        else {
            mainWindow.show();
            mainWindow.focus();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        (0, tray_1.destroyTray)();
        electron_1.app.quit();
    }
});
electron_1.app.on('will-quit', () => (0, tray_1.destroyTray)());
