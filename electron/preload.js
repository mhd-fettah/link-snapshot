const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
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
