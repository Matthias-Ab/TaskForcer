const { contextBridge, ipcRenderer } = await import('electron')

type IpcListener = (...args: unknown[]) => void

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: IpcListener) => {
    ipcRenderer.on(channel, (_event, ...args) => listener(...args))
  },
  off: (channel: string, listener: IpcListener) => {
    ipcRenderer.removeListener(channel, listener as Parameters<typeof ipcRenderer.removeListener>[1])
  },
  once: (channel: string, listener: IpcListener) => {
    ipcRenderer.once(channel, (_event, ...args) => listener(...args))
  },
})
