const { contextBridge, ipcRenderer } = require('electron');
console.log('[Preload] Initializing...');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    triggerKey: (key) => ipcRenderer.send('trigger-key', key),
    setGameMode: (on) => ipcRenderer.send('set-game-mode', on),
    onAdminStatus: (callback) => {
        const listener = (event, status) => callback(status);
        ipcRenderer.on('admin-status', listener);
        return () => ipcRenderer.removeListener('admin-status', listener);
    },
    onSteamStatus: (callback) => {
        const listener = (event, status) => callback(status);
        ipcRenderer.on('steam-status', listener);
        return () => ipcRenderer.removeListener('steam-status', listener);
    },
    onTekkenStatus: (callback) => {
        const listener = (event, status) => callback(status);
        ipcRenderer.on('tekken-status', listener);
        return () => ipcRenderer.removeListener('tekken-status', listener);
    },
    onEmergencyStop: (callback) => {
        const listener = () => callback();
        ipcRenderer.on('emergency-stop-trigger', listener);
        return () => ipcRenderer.removeListener('emergency-stop-trigger', listener);
    },
    onToggleCamera: (callback) => {
        const listener = () => callback();
        ipcRenderer.on('toggle-camera', listener);
        return () => ipcRenderer.removeListener('toggle-camera', listener);
    },
    onSidecarAction: (callback) => {
        const listener = (event, tokens) => callback(tokens);
        ipcRenderer.on('sidecar-action', listener);
        return () => ipcRenderer.removeListener('sidecar-action', listener);
    },
    logError: (err) => ipcRenderer.send('log-error', err),

    sendInput: (intents) => ipcRenderer.send('input-update', intents),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),

    // Secure Auth Storage
    authSaveSession: (session) => ipcRenderer.invoke('auth-save-session', session),
    authLoadSession: () => ipcRenderer.invoke('auth-load-session'),
    authClearSession: () => ipcRenderer.invoke('auth-clear-session'),
    authOpenLoginWindow: (url) => ipcRenderer.invoke('auth-open-login-window', url),

    onAuthSuccess: (callback) => {
        const listener = (event, user) => callback(user);
        ipcRenderer.on('auth-success', listener);
        return () => ipcRenderer.removeListener('auth-success', listener);
    },
    onAuthError: (callback) => {
        const listener = (event, error) => callback(error);
        ipcRenderer.on('auth-error', listener);
        return () => ipcRenderer.removeListener('auth-error', listener);
    },
    onDeepLink: (callback) => {
        const listener = (event, url) => callback(url);
        ipcRenderer.on('on-deep-link', listener);
        return () => ipcRenderer.removeListener('on-deep-link', listener);
    },
    logout: () => ipcRenderer.send('auth-logout'),
    resourcesPath: process.resourcesPath,

    // JSON Storage API
    readJson: (filename) => ipcRenderer.invoke('fs-read-json', filename),
    writeJson: (filename, data) => ipcRenderer.invoke('fs-write-json', { filename, data }),

    // Settings & System API
    getLoginItemSettings: () => ipcRenderer.invoke('get-login-item-settings'),
    setLoginItemSettings: (openAtLogin) => ipcRenderer.invoke('set-login-item-settings', { openAtLogin }),
    updateGlobalShortcuts: (bindings) => ipcRenderer.invoke('update-global-shortcuts', bindings),
    onGlobalShortcut: (callback) => {
        const listener = (event, action) => callback(action);
        ipcRenderer.on('global-shortcut-triggered', listener);
        return () => ipcRenderer.removeListener('global-shortcut-triggered', listener);
    },

    // In-App Update Events
    onUpdateFound: (callback) => {
        const listener = (_, data) => callback(data);
        ipcRenderer.on('update-found', listener);
        return () => ipcRenderer.removeListener('update-found', listener);
    },
    onUpdateProgress: (callback) => {
        const listener = (_, data) => callback(data);
        ipcRenderer.on('update-progress', listener);
        return () => ipcRenderer.removeListener('update-progress', listener);
    },
    onUpdateComplete: (callback) => {
        const listener = (_, data) => callback(data);
        ipcRenderer.on('update-complete', listener);
        return () => ipcRenderer.removeListener('update-complete', listener);
    },
    onUpdateError: (callback) => {
        const listener = (_, data) => callback(data);
        ipcRenderer.on('update-error', listener);
        return () => ipcRenderer.removeListener('update-error', listener);
    },
});
