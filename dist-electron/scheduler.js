"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initScheduler = initScheduler;
exports.spawnRecurringTasks = spawnRecurringTasks;
exports.spawnNextRecurrence = spawnNextRecurrence;
const electron_1 = require("electron");
const db_1 = require("./db");
const forcing_1 = require("./forcing");
const crypto_1 = require("crypto");
const scores_1 = require("./ipc/scores");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const schedule = require('node-schedule');
function initScheduler() {
    // Midnight: spawn recurring tasks for tomorrow, check missed tasks
    schedule.scheduleJob('0 0 * * *', () => {
        spawnRecurringTasks();
        checkMissedTasks();
    });
    // Every 5 minutes: recalculate score
    schedule.scheduleJob('*/5 * * * *', () => {
        try {
            (0, scores_1.calculateTodayScore)();
        }
        catch { /* noop */ }
    });
    // Every minute: due-date notifications
    schedule.scheduleJob('* * * * *', () => {
        checkUpcomingNotifications();
        checkOverdueNotifications();
    });
}
function nextDueDate(rule, fromDate = new Date()) {
    const next = new Date(fromDate);
    next.setHours(9, 0, 0, 0);
    if (rule === 'daily') {
        next.setDate(next.getDate() + 1);
        return next;
    }
    if (rule === 'weekdays') {
        next.setDate(next.getDate() + 1);
        // Skip Saturday (6) and Sunday (0)
        while (next.getDay() === 0 || next.getDay() === 6) {
            next.setDate(next.getDate() + 1);
        }
        return next;
    }
    if (rule === 'weekly') {
        next.setDate(next.getDate() + 7);
        return next;
    }
    return null;
}
function spawnRecurringTasks(referenceDate) {
    const db = (0, db_1.getDb)();
    const ref = referenceDate || new Date();
    const recurring = db.prepare("SELECT * FROM tasks WHERE recurrence_rule IS NOT NULL AND status NOT IN ('cancelled') AND parent_task_id IS NULL").all();
    for (const task of recurring) {
        const due = nextDueDate(task.recurrence_rule, ref);
        if (!due)
            continue;
        const dateStr = due.toISOString().split('T')[0];
        // Check if a child already exists for this due date
        const exists = db.prepare("SELECT 1 FROM tasks WHERE parent_task_id = ? AND date(due_at/1000,'unixepoch') = ?").get(task.id, dateStr);
        if (!exists) {
            db.prepare(`
        INSERT INTO tasks (id, title, description, due_at, priority, estimate_minutes, status,
          created_at, recurrence_rule, parent_task_id, required_tools, allowed_urls,
          distraction_apps, tags)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
      `).run((0, crypto_1.randomUUID)(), task.title, task.description, due.getTime(), task.priority, task.estimate_minutes, Date.now(), task.recurrence_rule, task.id, task.required_tools, task.allowed_urls, task.distraction_apps, task.tags);
        }
    }
}
// Called from tasks:complete IPC when the completed task has a recurrence_rule
function spawnNextRecurrence(taskId) {
    const db = (0, db_1.getDb)();
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!task?.recurrence_rule)
        return;
    spawnRecurringTasks(new Date());
}
function checkMissedTasks() {
    const db = (0, db_1.getDb)();
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
        (0, forcing_1.addShameEntry)({ type: 'missed_task', task_id: task.id, message: `Missed task: "${task.title}"` });
    }
}
// Track which tasks we've already notified to avoid repeat toasts
const notifiedIds = new Set();
const overdueNotifiedIds = new Set();
function checkUpcomingNotifications() {
    const db = (0, db_1.getDb)();
    const now = Date.now();
    const in15 = now + 15 * 60 * 1000;
    const in16 = now + 16 * 60 * 1000;
    const upcoming = db.prepare(`
    SELECT * FROM tasks WHERE status NOT IN ('completed','cancelled') AND due_at BETWEEN ? AND ?
  `).all(in15, in16);
    for (const task of upcoming) {
        if (notifiedIds.has(task.id))
            continue;
        notifiedIds.add(task.id);
        if (electron_1.Notification.isSupported()) {
            new electron_1.Notification({ title: 'Due in 15 minutes', body: task.title }).show();
        }
    }
}
function checkOverdueNotifications() {
    const db = (0, db_1.getDb)();
    const now = Date.now();
    // Tasks that just became overdue in the last 2 minutes
    const twoMinAgo = now - 2 * 60 * 1000;
    const overdue = db.prepare(`
    SELECT * FROM tasks WHERE status NOT IN ('completed','cancelled') AND due_at BETWEEN ? AND ?
  `).all(twoMinAgo, now);
    for (const task of overdue) {
        if (overdueNotifiedIds.has(task.id))
            continue;
        overdueNotifiedIds.add(task.id);
        if (electron_1.Notification.isSupported()) {
            new electron_1.Notification({ title: '⚠️ Task overdue', body: task.title }).show();
        }
    }
}
