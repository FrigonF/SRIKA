const { contextBridge, ipcRenderer } = require('electron');
console.log('[Preload] Initializing...');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    triggerKey: (key) => ipcRenderer.send('trigger-key', key),
    setGameMode: (on) => ipcRenderer.send('set-game-mode', on),
    onAdminStatus: (callback) => ipcRenderer.on('admin-status', (event, status) => callback(status)),
    onSteamStatus: (callback) => ipcRenderer.on('steam-status', (event, status) => callback(status)),
    onTekkenStatus: (callback) => ipcRenderer.on('tekken-status', (event, status) => callback(status)),
    onEmergencyStop: (callback) => ipcRenderer.on('emergency-stop-trigger', () => callback()),
    onToggleCamera: (callback) => ipcRenderer.on('toggle-camera', () => callback()),
    onSidecarAction: (callback) => ipcRenderer.on('sidecar-action', (event, tokens) => callback(tokens)),
    logError: (err) => ipcRenderer.send('log-error', err),

    sendInput: (intents) => ipcRenderer.send('input-update', intents),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),

    // Secure Auth Storage
    authSaveSession: (session) => ipcRenderer.invoke('auth-save-session', session),
    authLoadSession: () => ipcRenderer.invoke('auth-load-session'),
    authClearSession: () => ipcRenderer.invoke('auth-clear-session'),
    authOpenLoginWindow: (url) => ipcRenderer.invoke('auth-open-login-window', url),

    onAuthSuccess: (callback) => ipcRenderer.on('auth-success', (event, user) => callback(user)),
    onAuthError: (callback) => ipcRenderer.on('auth-error', (event, error) => callback(error)),
    onDeepLink: (callback) => ipcRenderer.on('on-deep-link', (event, url) => callback(url)),
    logout: () => ipcRenderer.send('auth-logout'),
    resourcesPath: process.resourcesPath,

    // JSON Storage API
    readJson: (filename) => ipcRenderer.invoke('fs-read-json', filename),
    writeJson: (filename, data) => ipcRenderer.invoke('fs-write-json', { filename, data }),

    // Settings & System API
    getLoginItemSettings: () => ipcRenderer.invoke('get-login-item-settings'),
    setLoginItemSettings: (openAtLogin) => ipcRenderer.invoke('set-login-item-settings', { openAtLogin }),
    updateGlobalShortcuts: (bindings) => ipcRenderer.invoke('update-global-shortcuts', bindings),
    onGlobalShortcut: (callback) => ipcRenderer.on('global-shortcut-triggered', (event, action) => callback(action)),

    // In-App Update Events
    onUpdateFound: (callback) => ipcRenderer.on('update-found', (_, data) => callback(data)),
    onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_, data) => callback(data)),
    onUpdateComplete: (callback) => ipcRenderer.on('update-complete', (_, data) => callback(data)),
    onUpdateError: (callback) => ipcRenderer.on('update-error', (_, data) => callback(data)),
});
