"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
const tasks_1 = require("./ipc/tasks");
const shame_1 = require("./ipc/shame");
const scores_1 = require("./ipc/scores");
const settings_1 = require("./ipc/settings");
const forcing_1 = require("./forcing");
const focus_tracker_1 = require("./focus-tracker");
const scheduler_1 = require("./scheduler");
const tray_1 = require("./tray");
const widget_window_1 = require("./widget-window");
const auto_launch_1 = __importDefault(require("auto-launch"));
const isDev = process.env.NODE_ENV === 'development';
let mainWindow = null;
let morningWindow = null;
let autoLauncher = null;
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
    // Window control IPC
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
    const Store = require('electron-store');
    const store = new Store({ name: 'taskforcer-state' });
    const lastShown = store.get('morning_popup_date', '');
    if (lastShown !== today) {
        store.set('morning_popup_date', today);
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
    electron_1.ipcMain.handle('scoring:invalidate', async () => {
        const { calculateTodayScore } = await Promise.resolve().then(() => __importStar(require('./ipc/scores')));
        try {
            calculateTodayScore();
        }
        catch { /* noop */ }
        return { ok: true };
    });
}
async function setupAutoLaunch() {
    autoLauncher = new auto_launch_1.default({
        name: 'TaskForcer',
        path: electron_1.app.getPath('exe'),
    });
}
electron_1.app.whenReady().then(async () => {
    (0, db_1.initDb)();
    // Register all IPC handlers
    (0, tasks_1.registerTaskIpc)();
    (0, shame_1.registerShameIpc)();
    (0, scores_1.registerScoresIpc)();
    (0, settings_1.registerSettingsIpc)();
    (0, forcing_1.registerForcingIpc)();
    (0, widget_window_1.registerWidgetIpc)();
    (0, focus_tracker_1.registerFocusIpc)();
    registerMainIpc();
    // Initialize features
    (0, scheduler_1.initScheduler)();
    (0, forcing_1.startIdleDetection)();
    // Create windows (morning preloaded hidden)
    const win = createMainWindow();
    createMorningWindow();
    (0, widget_window_1.createWidgetWindow)(isDev);
    // Tray
    mainWindow.once('ready-to-show', () => {
        (0, tray_1.createTray)(win);
        checkMorningPopup();
    });
    await setupAutoLaunch();
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
electron_1.app.on('will-quit', () => {
    (0, tray_1.destroyTray)();
});
