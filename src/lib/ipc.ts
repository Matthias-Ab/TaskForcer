declare global {
  interface Window {
    electron: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
      on: (channel: string, listener: (...args: unknown[]) => void) => void
      off: (channel: string, listener: (...args: unknown[]) => void) => void
      once: (channel: string, listener: (...args: unknown[]) => void) => void
    }
  }
}

export const ipc = {
  invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T> {
    return window.electron.invoke(channel, ...args) as Promise<T>
  },
  on(channel: string, listener: (...args: unknown[]) => void): void {
    window.electron.on(channel, listener)
  },
  off(channel: string, listener: (...args: unknown[]) => void): void {
    window.electron.off(channel, listener)
  },
  once(channel: string, listener: (...args: unknown[]) => void): void {
    window.electron.once(channel, listener)
  },
}
