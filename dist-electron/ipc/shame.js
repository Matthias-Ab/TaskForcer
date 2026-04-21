import { ipcMain } from 'electron';
import { getDb } from '../db.js';
import { randomUUID } from 'crypto';
export function registerShameIpc() {
    ipcMain.handle('shame:list', (_e, limit = 200, offset = 0) => {
        return getDb().prepare('SELECT * FROM shame_log ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    });
    ipcMain.handle('shame:add', (_e, entry) => {
        const db = getDb();
        const id = randomUUID();
        const created_at = Date.now();
        db.prepare('INSERT INTO shame_log (id, type, task_id, message, created_at) VALUES (?, ?, ?, ?, ?)').run(id, entry.type, entry.task_id ?? null, entry.message, created_at);
        return { id, ...entry, created_at };
    });
    ipcMain.handle('shame:clear', () => {
        getDb().prepare('DELETE FROM shame_log').run();
        return { ok: true };
    });
    ipcMain.handle('shame:count', () => {
        const row = getDb().prepare('SELECT COUNT(*) as count FROM shame_log').get();
        return row.count;
    });
}
