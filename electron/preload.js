const { contextBridge, ipcRenderer } = require('electron');
const { parseUrls } = require('../src/urls');

contextBridge.exposeInMainWorld('api', {
    parseUrls,
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    saveLinks: (urls) => ipcRenderer.invoke('save-links', { urls }),
    loadLinks: () => ipcRenderer.invoke('load-links'),
    getConfig: () => ipcRenderer.invoke('get-config'),
    setConfig: (partial) => ipcRenderer.invoke('set-config', partial),
    startCapture: (opts) => ipcRenderer.invoke('start-capture', opts),
    cancelCapture: () => ipcRenderer.invoke('cancel-capture'),
    onProgress: (cb) => {
        const handler = (_, data) => cb(data);
        ipcRenderer.on('capture-progress', handler);
        return () => ipcRenderer.removeListener('capture-progress', handler);
    },
});

if (process.platform === 'win32') {
    window.addEventListener('DOMContentLoaded', () => {
        document.documentElement.classList.add('has-titlebar-overlay');
    });
}
