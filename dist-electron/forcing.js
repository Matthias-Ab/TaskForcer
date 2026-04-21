"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addShameEntry = addShameEntry;
exports.startCheckinSchedule = startCheckinSchedule;
exports.stopCheckinSchedule = stopCheckinSchedule;
exports.startIdleDetection = startIdleDetection;
exports.setupEndOfDayGuard = setupEndOfDayGuard;
exports.registerForcingIpc = registerForcingIpc;
const electron_1 = require("electron");
const db_1 = require("./db");
const scores_1 = require("./ipc/scores");
const crypto_1 = require("crypto");
let checkinInterval = null;
let idleCheckInterval = null;
let activeTaskId = null;
function addShameEntry(entry) {
    const db = (0, db_1.getDb)();
    db.prepare('INSERT INTO shame_log (id, type, task_id, message, created_at) VALUES (?, ?, ?, ?, ?)').run((0, crypto_1.randomUUID)(), entry.type, entry.task_id ?? null, entry.message, Date.now());
}
function startCheckinSchedule(taskId) {
    stopCheckinSchedule();
    activeTaskId = taskId;
    const intervalMin = parseInt((0, db_1.getSetting)('checkin_interval_min') || '25', 10);
    checkinInterval = setInterval(() => showCheckinDialog(taskId), intervalMin * 60 * 1000);
}
function stopCheckinSchedule() {
    if (checkinInterval) {
        clearInterval(checkinInterval);
        checkinInterval = null;
    }
    activeTaskId = null;
}
function showCheckinDialog(taskId) {
    const db = (0, db_1.getDb)();
    const task = db.prepare('SELECT title FROM tasks WHERE id = ?').get(taskId);
    if (!task)
        return;
    const win = electron_1.BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
    win?.webContents.send('forcing:checkin-request', { taskId, taskTitle: task.title });
}
function startIdleDetection() {
    if (idleCheckInterval)
        clearInterval(idleCheckInterval);
    idleCheckInterval = setInterval(() => {
        const thresholdMin = parseInt((0, db_1.getSetting)('idle_threshold_min') || '10', 10);
        const idleSeconds = electron_1.powerMonitor.getSystemIdleTime();
        if (idleSeconds >= thresholdMin * 60) {
            const db = (0, db_1.getDb)();
            const hasCritical = db.prepare("SELECT 1 FROM tasks WHERE priority='critical' AND status NOT IN ('completed','cancelled') LIMIT 1").get();
            if (hasCritical)
                escalateIdleNag(idleSeconds);
        }
    }, 60 * 1000);
}
function escalateIdleNag(idleSeconds) {
    const mins = Math.floor(idleSeconds / 60);
    if (electron_1.Notification.isSupported()) {
        new electron_1.Notification({
            title: 'TaskForcer: You have critical tasks!',
            body: `You've been idle for ${mins} minutes.`,
        }).show();
    }
    if (idleSeconds >= 20 * 60) {
        const mainWin = electron_1.BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
        if (mainWin) {
            mainWin.show();
            mainWin.focus();
            mainWin.webContents.send('forcing:idle-alert', { idleMinutes: mins });
        }
    }
}
function setupEndOfDayGuard(win) {
    electron_1.app.on('before-quit', (e) => {
        const hour = new Date().getHours();
        const threshold = parseInt((0, db_1.getSetting)('lockout_threshold') || '50', 10);
        if (hour < 18)
            return;
        try {
            const score = (0, scores_1.calculateTodayScore)();
            if (score.score < threshold) {
                e.preventDefault();
                win.webContents.send('forcing:lockout-request', { score: score.score, threshold });
            }
        }
        catch { /* noop */ }
    });
}
function registerForcingIpc() {
    electron_1.ipcMain.handle('forcing:checkin-response', (_e, taskId, stillWorking) => {
        if (!stillWorking) {
            const db = (0, db_1.getDb)();
            const task = db.prepare('SELECT title FROM tasks WHERE id = ?').get(taskId);
            addShameEntry({ type: 'skipped_checkin', task_id: taskId, message: `Skipped check-in for: ${task?.title || taskId}` });
        }
        return { ok: true };
    });
    electron_1.ipcMain.handle('forcing:lockout-excuse', (_e, reason) => {
        addShameEntry({ type: 'excuse', message: `End-of-day excuse: ${reason}` });
        electron_1.app.exit(0);
        return { ok: true };
    });
    electron_1.ipcMain.handle('forcing:start-task-session', (_e, taskId) => {
        startCheckinSchedule(taskId);
        return { ok: true };
    });
    electron_1.ipcMain.handle('forcing:stop-task-session', () => {
        stopCheckinSchedule();
        return { ok: true };
    });
    electron_1.ipcMain.handle('forcing:get-active-task', () => activeTaskId);
}
