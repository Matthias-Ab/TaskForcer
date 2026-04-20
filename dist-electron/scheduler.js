"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initScheduler = initScheduler;
const node_schedule_1 = __importDefault(require("node-schedule"));
const db_1 = require("./db");
const forcing_1 = require("./forcing");
const electron_1 = require("electron");
const crypto_1 = require("crypto");
const scores_1 = require("./ipc/scores");
function initScheduler() {
    // Midnight: expand recurrence rules, check for missed tasks
    node_schedule_1.default.scheduleJob('0 0 * * *', () => {
        expandRecurrences();
        checkMissedTasks();
    });
    // Every 5 min: recalculate score
    node_schedule_1.default.scheduleJob('*/5 * * * *', () => {
        try {
            (0, scores_1.calculateTodayScore)();
        }
        catch { /* noop */ }
    });
    // Task due notifications (15 min before)
    node_schedule_1.default.scheduleJob('* * * * *', () => {
        checkUpcomingNotifications();
    });
}
function expandRecurrences() {
    const db = (0, db_1.getDb)();
    const recurring = db.prepare("SELECT * FROM tasks WHERE recurrence_rule IS NOT NULL AND status NOT IN ('cancelled')").all();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    for (const task of recurring) {
        // Simple daily recurrence expansion
        if (task.recurrence_rule === 'daily') {
            const exists = db.prepare("SELECT 1 FROM tasks WHERE parent_task_id = ? AND date(due_at/1000,'unixepoch') = date(?/1000,'unixepoch')").get(task.id, tomorrow.getTime());
            if (!exists) {
                db.prepare(`
          INSERT INTO tasks (id, title, description, due_at, priority, estimate_minutes, status,
            created_at, recurrence_rule, parent_task_id, required_tools, allowed_urls,
            distraction_apps, tags)
          VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
        `).run((0, crypto_1.randomUUID)(), task.title, task.description, tomorrow.getTime(), task.priority, task.estimate_minutes, Date.now(), task.recurrence_rule, task.id, task.required_tools, task.allowed_urls, task.distraction_apps, task.tags);
            }
        }
    }
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
    SELECT * FROM tasks
    WHERE status NOT IN ('completed', 'cancelled')
      AND due_at BETWEEN ? AND ?
  `).all(yStart.getTime(), yEnd.getTime());
    for (const task of missed) {
        (0, forcing_1.addShameEntry)({
            type: 'missed_task',
            task_id: task.id,
            message: `Missed task: "${task.title}"`,
        });
    }
}
function checkUpcomingNotifications() {
    const db = (0, db_1.getDb)();
    const now = Date.now();
    const in15 = now + 15 * 60 * 1000;
    const in16 = now + 16 * 60 * 1000;
    const upcoming = db.prepare(`
    SELECT * FROM tasks
    WHERE status NOT IN ('completed', 'cancelled')
      AND due_at BETWEEN ? AND ?
  `).all(in15, in16);
    for (const task of upcoming) {
        if (electron_1.Notification.isSupported()) {
            new electron_1.Notification({
                title: 'Task due in 15 minutes',
                body: task.title,
            }).show();
        }
    }
}
