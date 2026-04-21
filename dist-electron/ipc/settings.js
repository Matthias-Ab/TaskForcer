"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSettingsIpc = registerSettingsIpc;
const electron_1 = require("electron");
const db_1 = require("../db");
function registerSettingsIpc() {
    electron_1.ipcMain.handle('settings:get', (_e, key) => (0, db_1.getSetting)(key));
    electron_1.ipcMain.handle('settings:set', (_e, key, value) => {
        (0, db_1.setSetting)(key, value);
        return { ok: true };
    });
    electron_1.ipcMain.handle('settings:getAll', () => {
        const rows = (0, db_1.getDb)().prepare('SELECT key, value FROM settings').all();
        return Object.fromEntries(rows.map(r => [r.key, r.value]));
    });
    electron_1.ipcMain.handle('settings:export', () => {
        const db = (0, db_1.getDb)();
        return {
            tasks: db.prepare('SELECT * FROM tasks').all(),
            sessions: db.prepare('SELECT * FROM sessions').all(),
            shame_log: db.prepare('SELECT * FROM shame_log').all(),
            daily_scores: db.prepare('SELECT * FROM daily_scores').all(),
            settings: db.prepare('SELECT * FROM settings').all(),
            exported_at: new Date().toISOString(),
        };
    });
    electron_1.ipcMain.handle('settings:resetStreaks', () => {
        (0, db_1.getDb)().prepare('UPDATE daily_scores SET streak_day = 0').run();
        return { ok: true };
    });
    electron_1.ipcMain.handle('settings:clearShameLog', () => {
        (0, db_1.getDb)().prepare('DELETE FROM shame_log').run();
        return { ok: true };
    });
}
