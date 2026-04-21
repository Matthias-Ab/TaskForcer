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
Object.defineProperty(exports, "__esModule", { value: true });
exports.startFocusTracking = startFocusTracking;
exports.stopFocusTracking = stopFocusTracking;
exports.registerFocusIpc = registerFocusIpc;
const electron_1 = require("electron");
const db_1 = require("./db");
const forcing_1 = require("./forcing");
let pollInterval = null;
let activeSessionId = null;
let currentTaskId = null;
let continuousDistractionSeconds = 0;
let distractionToastCount = 0;
const POLL_MS = 5000;
const DISTRACTION_TOAST_THRESHOLD = 60;
const DISTRACTION_LOG_THRESHOLD = 3;
function startFocusTracking(sessionId, taskId) {
    stopFocusTracking();
    activeSessionId = sessionId;
    currentTaskId = taskId;
    continuousDistractionSeconds = 0;
    distractionToastCount = 0;
    pollInterval = setInterval(doPoll, POLL_MS);
}
function stopFocusTracking() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
    activeSessionId = null;
    currentTaskId = null;
}
async function doPoll() {
    if (!activeSessionId || !currentTaskId)
        return;
    if ((0, db_1.getSetting)('focus_tracking') === 'false')
        return;
    try {
        const activeWin = await Promise.resolve().then(() => __importStar(require('active-win')));
        const win = await activeWin.default();
        if (!win)
            return;
        const appName = win.owner?.name || '';
        const db = (0, db_1.getDb)();
        const task = db.prepare('SELECT distraction_apps FROM tasks WHERE id = ?').get(currentTaskId);
        if (!task)
            return;
        const distractionApps = JSON.parse(task.distraction_apps || '[]');
        const globalDistractions = JSON.parse((0, db_1.getSetting)('distraction_apps') || '[]');
        const allDistractions = [...distractionApps, ...globalDistractions];
        const isDistraction = allDistractions.some(app => appName.toLowerCase().includes(app.toLowerCase()));
        const secondsElapsed = POLL_MS / 1000;
        if (isDistraction) {
            continuousDistractionSeconds += secondsElapsed;
            db.prepare('UPDATE sessions SET distracted_seconds = distracted_seconds + ? WHERE id = ?')
                .run(secondsElapsed, activeSessionId);
            if (continuousDistractionSeconds >= DISTRACTION_TOAST_THRESHOLD) {
                continuousDistractionSeconds = 0;
                distractionToastCount++;
                notifyDistraction(appName);
                if (distractionToastCount >= DISTRACTION_LOG_THRESHOLD) {
                    distractionToastCount = 0;
                    (0, forcing_1.addShameEntry)({ type: 'distraction', task_id: currentTaskId, message: `Distracted by "${appName}"` });
                }
            }
        }
        else {
            continuousDistractionSeconds = 0;
            db.prepare('UPDATE sessions SET active_seconds = active_seconds + ? WHERE id = ?')
                .run(secondsElapsed, activeSessionId);
        }
    }
    catch { /* active-win may fail silently */ }
}
function notifyDistraction(appName) {
    const win = electron_1.BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
    win?.webContents.send('focus:distraction-toast', { appName });
}
function registerFocusIpc() {
    electron_1.ipcMain.handle('focus:start', (_e, sessionId, taskId) => {
        startFocusTracking(sessionId, taskId);
        return { ok: true };
    });
    electron_1.ipcMain.handle('focus:stop', () => {
        stopFocusTracking();
        return { ok: true };
    });
}
