import { ipcMain } from 'electron';
import { getSetting, setSetting, getDb } from '../db.js';
export function registerSettingsIpc() {
    ipcMain.handle('settings:get', (_e, key) => getSetting(key));
    ipcMain.handle('settings:set', (_e, key, value) => {
        setSetting(key, value);
        return { ok: true };
    });
    ipcMain.handle('settings:getAll', () => {
        const rows = getDb().prepare('SELECT key, value FROM settings').all();
        return Object.fromEntries(rows.map(r => [r.key, r.value]));
    });
    ipcMain.handle('settings:export', () => {
        const db = getDb();
        return {
            tasks: db.prepare('SELECT * FROM tasks').all(),
            sessions: db.prepare('SELECT * FROM sessions').all(),
            shame_log: db.prepare('SELECT * FROM shame_log').all(),
            daily_scores: db.prepare('SELECT * FROM daily_scores').all(),
            settings: db.prepare('SELECT * FROM settings').all(),
            exported_at: new Date().toISOString(),
        };
    });
    ipcMain.handle('settings:resetStreaks', () => {
        getDb().prepare('UPDATE daily_scores SET streak_day = 0').run();
        return { ok: true };
    });
    ipcMain.handle('settings:clearShameLog', () => {
        getDb().prepare('DELETE FROM shame_log').run();
        return { ok: true };
    });
}
