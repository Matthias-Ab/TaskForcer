export const ipc = {
    invoke(channel, ...args) {
        return window.electron.invoke(channel, ...args);
    },
    on(channel, listener) {
        window.electron.on(channel, listener);
    },
    off(channel, listener) {
        window.electron.off(channel, listener);
    },
    once(channel, listener) {
        window.electron.once(channel, listener);
    },
};
