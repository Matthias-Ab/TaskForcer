"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWidgetWindow = createWidgetWindow;
exports.showWidget = showWidget;
exports.hideWidget = hideWidget;
exports.updateWidgetTask = updateWidgetTask;
exports.registerWidgetIpc = registerWidgetIpc;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
let widgetWin = null;
const WIDGET_WIDTH = 320;
const WIDGET_HEIGHT = 90;
function createWidgetWindow(isDev) {
    const display = electron_1.screen.getPrimaryDisplay();
    const { width, height } = display.workAreaSize;
    widgetWin = new electron_1.BrowserWindow({
        width: WIDGET_WIDTH,
        height: WIDGET_HEIGHT,
        x: width - WIDGET_WIDTH - 20,
        y: height - WIDGET_HEIGHT - 60,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        show: false,
        hasShadow: true,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    if (isDev) {
        widgetWin.loadURL('http://localhost:5173/widget.html');
    }
    else {
        widgetWin.loadFile(path_1.default.join(__dirname, '../dist/widget.html'));
    }
    widgetWin.on('closed', () => { widgetWin = null; });
    return widgetWin;
}
function showWidget() {
    if (widgetWin && !widgetWin.isDestroyed())
        widgetWin.show();
}
function hideWidget() {
    if (widgetWin && !widgetWin.isDestroyed())
        widgetWin.hide();
}
function updateWidgetTask(taskId, taskTitle) {
    if (widgetWin && !widgetWin.isDestroyed()) {
        widgetWin.webContents.send('widget:update-task', { taskId, taskTitle });
    }
}
function registerWidgetIpc() {
    electron_1.ipcMain.handle('widget:minimize-temporarily', () => {
        if (widgetWin && !widgetWin.isDestroyed()) {
            widgetWin.hide();
            setTimeout(() => {
                if (widgetWin && !widgetWin.isDestroyed())
                    widgetWin.show();
            }, 30 * 1000);
        }
        return { ok: true };
    });
    electron_1.ipcMain.handle('widget:set-position', (_e, x, y) => {
        if (widgetWin && !widgetWin.isDestroyed())
            widgetWin.setPosition(Math.round(x), Math.round(y));
        return { ok: true };
    });
}
