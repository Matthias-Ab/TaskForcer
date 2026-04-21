import { getDb, getSetting } from './db.js';
import { calculateTodayScore } from './ipc/scores.js';
import { randomUUID } from 'crypto';
const { BrowserWindow, ipcMain, powerMonitor, Notification, app } = await import('electron');
let checkinInterval = null;
let idleCheckInterval = null;
let activeTaskId = null;
export function addShameEntry(entry) {
    const db = getDb();
    db.prepare('INSERT INTO shame_log (id, type, task_id, message, created_at) VALUES (?, ?, ?, ?, ?)').run(randomUUID(), entry.type, entry.task_id ?? null, entry.message, Date.now());
}
export function startCheckinSchedule(taskId) {
    stopCheckinSchedule();
    activeTaskId = taskId;
    const intervalMin = parseInt(getSetting('checkin_interval_min') || '25', 10);
    checkinInterval = setInterval(() => showCheckinDialog(taskId), intervalMin * 60 * 1000);
}
export function stopCheckinSchedule() {
    if (checkinInterval) {
        clearInterval(checkinInterval);
        checkinInterval = null;
    }
    activeTaskId = null;
}
function showCheckinDialog(taskId) {
    const db = getDb();
    const task = db.prepare('SELECT title FROM tasks WHERE id = ?').get(taskId);
    if (!task)
        return;
    const win = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
    win?.webContents.send('forcing:checkin-request', { taskId, taskTitle: task.title });
}
export function startIdleDetection() {
    if (idleCheckInterval)
        clearInterval(idleCheckInterval);
    idleCheckInterval = setInterval(() => {
        const thresholdMin = parseInt(getSetting('idle_threshold_min') || '10', 10);
        const idleSeconds = powerMonitor.getSystemIdleTime();
        if (idleSeconds >= thresholdMin * 60) {
            const db = getDb();
            const hasCritical = db.prepare("SELECT 1 FROM tasks WHERE priority='critical' AND status NOT IN ('completed','cancelled') LIMIT 1").get();
            if (hasCritical)
                escalateIdleNag(idleSeconds);
        }
    }, 60 * 1000);
}
function escalateIdleNag(idleSeconds) {
    const mins = Math.floor(idleSeconds / 60);
    if (Notification.isSupported()) {
        new Notification({
            title: 'TaskForcer: You have critical tasks!',
            body: `You've been idle for ${mins} minutes.`,
        }).show();
    }
    if (idleSeconds >= 20 * 60) {
        const mainWin = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
        if (mainWin) {
            mainWin.show();
            mainWin.focus();
            mainWin.webContents.send('forcing:idle-alert', { idleMinutes: mins });
        }
    }
}
export function setupEndOfDayGuard(win) {
    app.on('before-quit', (e) => {
        const hour = new Date().getHours();
        const threshold = parseInt(getSetting('lockout_threshold') || '50', 10);
        if (hour < 18)
            return;
        try {
            const score = calculateTodayScore();
            if (score.score < threshold) {
                e.preventDefault();
                win.webContents.send('forcing:lockout-request', { score: score.score, threshold });
            }
        }
        catch { /* noop */ }
    });
}
export function registerForcingIpc() {
    ipcMain.handle('forcing:checkin-response', (_e, taskId, stillWorking) => {
        if (!stillWorking) {
            const db = getDb();
            const task = db.prepare('SELECT title FROM tasks WHERE id = ?').get(taskId);
            addShameEntry({ type: 'skipped_checkin', task_id: taskId, message: `Skipped check-in for: ${task?.title || taskId}` });
        }
        return { ok: true };
    });
    ipcMain.handle('forcing:lockout-excuse', (_e, reason) => {
        addShameEntry({ type: 'excuse', message: `End-of-day excuse: ${reason}` });
        app.exit(0);
        return { ok: true };
    });
    ipcMain.handle('forcing:start-task-session', (_e, taskId) => {
        startCheckinSchedule(taskId);
        return { ok: true };
    });
    ipcMain.handle('forcing:stop-task-session', () => {
        stopCheckinSchedule();
        return { ok: true };
    });
    ipcMain.handle('forcing:get-active-task', () => activeTaskId);
}
