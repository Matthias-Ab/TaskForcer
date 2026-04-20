"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electron', {
    invoke: (channel, ...args) => electron_1.ipcRenderer.invoke(channel, ...args),
    on: (channel, listener) => {
        electron_1.ipcRenderer.on(channel, (_event, ...args) => listener(...args));
    },
    off: (channel, listener) => {
        electron_1.ipcRenderer.removeListener(channel, listener);
    },
    once: (channel, listener) => {
        electron_1.ipcRenderer.once(channel, (_event, ...args) => listener(...args));
    },
});
