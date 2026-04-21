import { createRequire } from 'module';
import { getDb } from './db.js';
import { addShameEntry } from './forcing.js';
import { Notification } from 'electron';
import { randomUUID } from 'crypto';
import { calculateTodayScore } from './ipc/scores.js';
const require = createRequire(import.meta.url);
const schedule = require('node-schedule');
export function initScheduler() {
    schedule.scheduleJob('0 0 * * *', () => {
        expandRecurrences();
        checkMissedTasks();
    });
    schedule.scheduleJob('*/5 * * * *', () => {
        try {
            calculateTodayScore();
        }
        catch { /* noop */ }
    });
    schedule.scheduleJob('* * * * *', () => {
        checkUpcomingNotifications();
    });
}
function expandRecurrences() {
    const db = getDb();
    const recurring = db.prepare("SELECT * FROM tasks WHERE recurrence_rule IS NOT NULL AND status NOT IN ('cancelled')").all();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    for (const task of recurring) {
        if (task.recurrence_rule === 'daily') {
            const exists = db.prepare("SELECT 1 FROM tasks WHERE parent_task_id = ? AND date(due_at/1000,'unixepoch') = date(?/1000,'unixepoch')").get(task.id, tomorrow.getTime());
            if (!exists) {
                db.prepare(`
          INSERT INTO tasks (id, title, description, due_at, priority, estimate_minutes, status,
            created_at, recurrence_rule, parent_task_id, required_tools, allowed_urls,
            distraction_apps, tags)
          VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
        `).run(randomUUID(), task.title, task.description, tomorrow.getTime(), task.priority, task.estimate_minutes, Date.now(), task.recurrence_rule, task.id, task.required_tools, task.allowed_urls, task.distraction_apps, task.tags);
            }
        }
    }
}
function checkMissedTasks() {
    const db = getDb();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStart = new Date(yesterday);
    yStart.setHours(0, 0, 0, 0);
    const yEnd = new Date(yesterday);
    yEnd.setHours(23, 59, 59, 999);
    const missed = db.prepare(`
    SELECT * FROM tasks WHERE status NOT IN ('completed','cancelled') AND due_at BETWEEN ? AND ?
  `).all(yStart.getTime(), yEnd.getTime());
    for (const task of missed) {
        addShameEntry({ type: 'missed_task', task_id: task.id, message: `Missed task: "${task.title}"` });
    }
}
function checkUpcomingNotifications() {
    const db = getDb();
    const now = Date.now();
    const in15 = now + 15 * 60 * 1000;
    const in16 = now + 16 * 60 * 1000;
    const upcoming = db.prepare(`
    SELECT * FROM tasks WHERE status NOT IN ('completed','cancelled') AND due_at BETWEEN ? AND ?
  `).all(in15, in16);
    for (const task of upcoming) {
        if (Notification.isSupported()) {
            new Notification({ title: 'Task due in 15 minutes', body: task.title }).show();
        }
    }
}
