import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electron', {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    on: (channel, listener) => {
        ipcRenderer.on(channel, (_event, ...args) => listener(...args));
    },
    off: (channel, listener) => {
        ipcRenderer.removeListener(channel, listener);
    },
    once: (channel, listener) => {
        ipcRenderer.once(channel, (_event, ...args) => listener(...args));
    },
});
