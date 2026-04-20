"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTray = createTray;
exports.destroyTray = destroyTray;
const electron_1 = require("electron");
const scores_1 = require("./ipc/scores");
let tray = null;
let scoreUpdateInterval = null;
function getTrayIcon(score) {
    // Create a simple colored icon using nativeImage
    const size = 16;
    const buffer = Buffer.alloc(size * size * 4);
    const color = score >= 80
        ? { r: 52, g: 211, b: 153 } // emerald
        : score >= 50
            ? { r: 251, g: 191, b: 36 } // amber
            : { r: 239, g: 68, b: 68 }; // red
    for (let i = 0; i < size * size; i++) {
        const offset = i * 4;
        buffer[offset] = color.r;
        buffer[offset + 1] = color.g;
        buffer[offset + 2] = color.b;
        buffer[offset + 3] = 255;
    }
    return electron_1.nativeImage.createFromBuffer(buffer, { width: size, height: size });
}
function createTray(mainWindow) {
    const icon = getTrayIcon(0);
    tray = new electron_1.Tray(icon);
    tray.setToolTip('TaskForcer');
    updateTray(mainWindow);
    scoreUpdateInterval = setInterval(() => {
        updateTray(mainWindow);
    }, 5 * 60 * 1000);
    tray.on('click', () => {
        mainWindow.show();
        mainWindow.focus();
    });
    return tray;
}
function updateTray(mainWindow) {
    if (!tray)
        return;
    let score = 0;
    let scoreLabel = 'No data yet';
    try {
        const s = (0, scores_1.calculateTodayScore)();
        score = Math.round(s.score);
        scoreLabel = `Today: ${score}/100`;
        tray.setImage(getTrayIcon(score));
    }
    catch { /* noop */ }
    const menu = electron_1.Menu.buildFromTemplate([
        { label: 'TaskForcer', enabled: false },
        { type: 'separator' },
        { label: scoreLabel, enabled: false },
        { type: 'separator' },
        {
            label: 'Show App',
            click: () => { mainWindow.show(); mainWindow.focus(); },
        },
        {
            label: 'Today\'s Tasks',
            click: () => {
                mainWindow.show();
                mainWindow.focus();
                mainWindow.webContents.send('navigate', '/today');
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => electron_1.app.quit(),
        },
    ]);
    tray.setContextMenu(menu);
    tray.setTitle(` ${score}`);
}
function destroyTray() {
    if (scoreUpdateInterval)
        clearInterval(scoreUpdateInterval);
    if (tray) {
        tray.destroy();
        tray = null;
    }
}
