const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    triggerKey: (key) => ipcRenderer.send('trigger-key', key),
    setGameMode: (on) => ipcRenderer.send('set-game-mode', on),
    onAdminStatus: (callback) => ipcRenderer.on('admin-status', (event, status) => callback(status))
});
