"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerShameIpc = registerShameIpc;
const electron_1 = require("electron");
const db_1 = require("../db");
const crypto_1 = require("crypto");
function registerShameIpc() {
    electron_1.ipcMain.handle('shame:list', (_e, limit = 200, offset = 0) => {
        const rows = (0, db_1.getDb)().prepare('SELECT * FROM shame_log ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
        return rows;
    });
    electron_1.ipcMain.handle('shame:add', (_e, entry) => {
        const db = (0, db_1.getDb)();
        const id = (0, crypto_1.randomUUID)();
        const created_at = Date.now();
        db.prepare('INSERT INTO shame_log (id, type, task_id, message, created_at) VALUES (?, ?, ?, ?, ?)').run(id, entry.type, entry.task_id ?? null, entry.message, created_at);
        return { id, ...entry, created_at };
    });
    electron_1.ipcMain.handle('shame:clear', () => {
        (0, db_1.getDb)().prepare('DELETE FROM shame_log').run();
        return { ok: true };
    });
    electron_1.ipcMain.handle('shame:count', () => {
        const row = (0, db_1.getDb)().prepare('SELECT COUNT(*) as count FROM shame_log').get();
        return row.count;
    });
}
