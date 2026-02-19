const { app, BrowserWindow, ipcMain, powerSaveBlocker, safeStorage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');

// --- PRODUCTION SECURITY CONSTANTS ---
const ALLOWED_CHANNELS = [
    'window-minimize', 'window-maximize', 'window-close',
    'trigger-key', 'input-update', 'log-error',
    'get-app-version', 'open-external',
    'auth-save-session', 'auth-load-session', 'auth-clear-session', 'auth-open-login-window',
    'fs-read-json', 'fs-write-json',
    'get-login-item-settings', 'set-login-item-settings',
    'update-global-shortcuts'
];

const ALLOWED_FILES = ['profiles.json', 'user.json', 'settings.json'];

// 1. ISOLATE USER DATA
const userDataPath = path.join(app.getPath('appData'), 'srika-desktop-v1-ultimate-clean');
if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
}
app.setPath('userData', userDataPath);

const dataDir = path.join(userDataPath, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

function logToFile(msg) {
    const logPath = path.join(userDataPath, 'srika_main.log');
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    try { fs.appendFileSync(logPath, entry); } catch { }
    console.log(msg);
}

powerSaveBlocker.start('prevent-app-suspension');

let win;

// --- SINGLE INSTANCE LOCK & DEEP LINK HANDLING ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    // Register custom protocol
    if (process.defaultApp) {
        if (process.argv.length >= 2) {
            app.setAsDefaultProtocolClient('srika', process.execPath, [path.resolve(process.argv[1])]);
        }
    } else {
        app.setAsDefaultProtocolClient('srika');
    }

    app.on('second-instance', (event, commandLine) => {
        if (win) {
            if (win.isMinimized()) win.restore();
            win.focus();
        }
        const url = commandLine.find(arg => arg.startsWith('srika://'));
        if (url) validateAndHandleDeepLink(url);
    });

    app.on('open-url', (event, url) => {
        event.preventDefault();
        validateAndHandleDeepLink(url);
    });


    app.whenReady().then(() => {
        // --- SECURITY HEADER INJECTION (Required for SharedArrayBuffer/WASM) ---
        const { session } = require('electron');
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            const responseHeaders = { ...details.responseHeaders };

            // 1. Enforce multi-threaded isolation for main documents
            if (details.resourceType === 'mainFrame' || details.resourceType === 'subFrame') {
                responseHeaders['Cross-Origin-Opener-Policy'] = ['same-origin'];
                responseHeaders['Cross-Origin-Embedder-Policy'] = ['require-corp'];
            }

            // 2. Fix: Inject CORP for trusted external resources (Google Images, UI-Avatars)
            // This satisfies the COEP 'require-corp' check without breaking 3rd party images
            const url = details.url.toLowerCase();
            const isTrustedExternal = url.includes('googleusercontent.com') || url.includes('ui-avatars.com');

            if (isTrustedExternal) {
                responseHeaders['Cross-Origin-Resource-Policy'] = ['cross-origin'];
            }

            callback({ responseHeaders });
        });

        createWindow();
        startPythonBridge();
        registerGlobalShortcuts();
        setTimeout(checkForUpdates, 3000);

        const sessionData = loadAuthSession();
        if (sessionData && sessionData.user) {
            console.log('[Auth] Session restored from safeStorage');
            setTimeout(() => {
                if (win) win.webContents.send('auth-success', sessionData.user);
            }, 2000);
        }
    });
}


function validateAndHandleDeepLink(url) {
    try {
        const parsedUrl = new URL(url);

        // Check for Auth Token (Internal Flow)
        const hasToken = url.includes('access_token=') || url.includes('refresh_token=');

        // Check for Protocol (External Flow)
        const isSrikaProtocol = parsedUrl.protocol === 'srika:';

        if (!isSrikaProtocol && !hasToken) {
            console.warn('[Security] Rejected URL (Not SRIKA protocol or Auth Token):', url);
            return;
        }

        if (isSrikaProtocol && parsedUrl.host !== 'auth') {
            console.warn('[Security] Rejected malformed host:', parsedUrl.host);
            return;
        }

        console.log(`[Auth] Secure deep link received: ${url}`);
        if (win) {
            win.webContents.send('on-deep-link', url);
            if (win.isMinimized()) win.restore();
            win.focus();
        }
    } catch (e) {
        console.error('[Security] Failed to parse deep link:', e.message);
    }
}

// --- SECURE TOKEN STORAGE ---
function saveAuthSession(accessToken, refreshToken, user, expiresAt) {
    const sessionPath = path.join(userDataPath, 'auth_session.enc');
    const session = { accessToken, refreshToken, user, expiresAt, savedAt: Date.now() };
    try {
        const encrypted = safeStorage.encryptString(JSON.stringify(session));
        fs.writeFileSync(sessionPath, encrypted);
    } catch (e) {
        console.error('[Auth] Failed to save session:', e);
    }
}

function loadAuthSession() {
    const sessionPath = path.join(userDataPath, 'auth_session.enc');
    if (!fs.existsSync(sessionPath)) return null;
    try {
        const encrypted = fs.readFileSync(sessionPath);
        const session = JSON.parse(safeStorage.decryptString(encrypted));
        return session;
    } catch (e) {
        console.error('[Auth] Failed to load session:', e);
        try { fs.unlinkSync(sessionPath); } catch { }
        return null;
    }
}

function clearAuthSession() {
    const sessionPath = path.join(userDataPath, 'auth_session.enc');
    try { if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath); } catch { }
}

// --- IPC HANDLERS ---
ipcMain.handle('auth-save-session', (event, data) => {
    if (!ALLOWED_CHANNELS.includes('auth-save-session')) return { success: false };
    saveAuthSession(data.accessToken, data.refreshToken, data.user, data.expiresAt);
    return { success: true };
});

ipcMain.handle('auth-load-session', () => {
    if (!ALLOWED_CHANNELS.includes('auth-load-session')) return null;
    return loadAuthSession();
});

ipcMain.handle('auth-clear-session', () => {
    if (!ALLOWED_CHANNELS.includes('auth-clear-session')) return { success: false };
    clearAuthSession();
    return { success: true };
});

ipcMain.handle('auth-open-login-window', async (event, url) => {
    if (!ALLOWED_CHANNELS.includes('auth-open-login-window')) return { success: false };
    return new Promise((resolve) => {
        const authWindow = new BrowserWindow({
            width: 800, height: 750, show: false, title: 'SRIKA - Secure Login',
            autoHideMenuBar: true, backgroundColor: '#0f172a',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
                webSecurity: true,
                partition: 'persist:auth'
            }
        });
        authWindow.loadURL(url);
        authWindow.once('ready-to-show', () => authWindow.show());

        const checkUrl = (targetUrl) => {
            const hasToken = targetUrl.includes('access_token=');
            if (hasToken || targetUrl.startsWith('srika://auth') || targetUrl.includes('srika.pages.dev')) {
                if (hasToken || targetUrl.startsWith('srika://auth')) validateAndHandleDeepLink(targetUrl);
                setTimeout(() => { if (!authWindow.isDestroyed()) authWindow.close(); }, 100);
                resolve({ success: true });
                return true;
            }
            return false;
        };

        authWindow.webContents.on('will-navigate', (e, url) => { if (checkUrl(url)) e.preventDefault(); });
        authWindow.webContents.on('will-redirect', (e, url) => { if (checkUrl(url)) e.preventDefault(); });
        authWindow.on('closed', () => resolve({ success: false, error: 'Window closed' }));
    });
});

function createWindow() {
    win = new BrowserWindow({
        width: 1280, height: 800, frame: false, backgroundColor: '#0f172a',
        title: 'Srika',
        icon: path.join(__dirname, '../resources/icon.png'),
        webPreferences: {
            nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true,
            preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false, devTools: !app.isPackaged
        }
    });

    if (app.isPackaged) {
        win.loadURL(`file://${path.join(__dirname, '../dist/index.html')}`);
    } else {
        win.loadURL('http://localhost:3000');
    }

    win.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith('http://localhost:3000') && !url.startsWith('file://')) event.preventDefault();
    });

    ipcMain.on('window-minimize', () => { if (ALLOWED_CHANNELS.includes('window-minimize')) win.minimize(); });
    ipcMain.on('window-maximize', () => {
        if (ALLOWED_CHANNELS.includes('window-maximize')) {
            if (win.isMaximized()) win.unmaximize(); else win.maximize();
        }
    });
    ipcMain.on('window-close', () => { if (ALLOWED_CHANNELS.includes('window-close')) win.close(); });
}

function registerGlobalShortcuts() {
    const { globalShortcut } = require('electron');

    // 1. Toggle Camera (Ctrl+Shift+T)
    globalShortcut.register('CommandOrControl+Shift+T', () => {
        logToFile('[Shortcut] Camera Toggle triggered');
        if (win) win.webContents.send('toggle-camera');
    });

    // 2. Emergency Stop (Ctrl+Shift+Escape with fallback)
    try {
        const success = globalShortcut.register('CommandOrControl+Shift+Escape', () => {
            logToFile('[Shortcut] Emergency Stop triggered (Primary)');
            if (win) win.webContents.send('emergency-stop-trigger');
        });

        if (!success) {
            logToFile('[Shortcut] Primary Emergency Stop (Ctrl+Shift+Esc) failed to register. Falling back to Alt+Shift+E.');
            registerEmergencyFallback();
        }
    } catch (e) {
        logToFile(`[Shortcut] Error registering primary Emergency Stop: ${e.message}`);
        registerEmergencyFallback();
    }

    function registerEmergencyFallback() {
        globalShortcut.register('Alt+Shift+E', () => {
            logToFile('[Shortcut] Emergency Stop triggered (Fallback)');
            if (win) win.webContents.send('emergency-stop-trigger');
        });
    }
}

let pythonProcess;
function startPythonBridge() {
    logToFile('[Bridge] Starting Python Bridge...');
    try {
        const rootPath = path.dirname(process.execPath);
        const bundledPython = path.join(rootPath, 'resources', 'python', 'python.exe');

        // RESOLVE SCRIPT PATH (Bypass ASAR in production)
        const scriptPath = app.isPackaged
            ? path.join(process.resourcesPath, 'core', 'input_bridge.py')
            : path.join(__dirname, 'input_bridge.py');

        let cmd = 'py'; // Default for Dev
        if (app.isPackaged && fs.existsSync(bundledPython)) {
            cmd = bundledPython;
            logToFile(`[Bridge] Using bundled Python: ${cmd}`);
        } else {
            logToFile(`[Bridge] Using system Python (py). Script: ${scriptPath}`);
        }

        if (!fs.existsSync(scriptPath)) {
            logToFile(`[Bridge] CRITICAL: Script not found at ${scriptPath}`);
            if (!app.isPackaged) logToFile(`[Bridge] Dev Debug - __dirname: ${__dirname}`);
        }

        pythonProcess = spawn(cmd, [scriptPath]);
        logToFile(`[Bridge] Spawned PID: ${pythonProcess.pid}`);

        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            const lines = output.split('\n');

            for (let line of lines) {
                line = line.trim();
                if (!line) continue;

                // 1. Log to file for diagnostics
                logToFile(`[Python] ${line}`);

                // 2. Dispatch to Renderer (UI Updates)
                if (win) {
                    if (line.includes('G_ACTION:')) {
                        const actions = line.split('G_ACTION:')[1].trim().split(',').map(t => t.trim());
                        win.webContents.send('sidecar-action', actions);
                    }
                    if (line.includes('ADMIN_STATUS:')) win.webContents.send('admin-status', line.split('ADMIN_STATUS:')[1].trim() === 'TRUE');
                    if (line.includes('ACCESS_STATUS:')) win.webContents.send('access-status', line.split('ACCESS_STATUS:')[1].trim());
                    if (line.includes('DEBUG:')) win.webContents.send('sidecar-debug', line.split('DEBUG:')[1].trim());
                }
            }
        });

        pythonProcess.stderr.on('data', (data) => {
            logToFile(`[Python Error] ${data.toString()}`);
        });

        pythonProcess.on('exit', (code) => {
            logToFile(`[Bridge] Python exited with code ${code}`);
        });

    } catch (e) {
        logToFile(`[Bridge] FAILED TO SPAWN: ${e.message}`);
    }
}

function launchUpdater(toVersion, downloadUrl, hash) {
    const updaterScript = app.isPackaged
        ? path.join(process.resourcesPath, 'updater', 'index.js')
        : path.resolve(__dirname, '../updater/index.js');

    logToFile(`[Update] Launching updater. Script: ${updaterScript}`);

    if (!fs.existsSync(updaterScript)) {
        logToFile(`[Update] ERROR: Updater script NOT FOUND at ${updaterScript}`);
        return;
    }

    // Find node.exe - bundled alongside the Electron binary
    const appDir = path.dirname(process.execPath);
    const nodeExe = path.join(appDir, 'node.exe');
    const nodeExists = fs.existsSync(nodeExe);
    logToFile(`[Update] node.exe at ${nodeExe}: ${nodeExists}`);

    const { dialog } = require('electron');
    dialog.showMessageBox({
        type: 'info',
        title: 'SRIKA Update Ready',
        message: `v${toVersion} is available!`,
        detail: `Installing update... The app will restart automatically.\n\nDo NOT close Task Manager if you see SRIKA downloading.`,
        buttons: ['Update Now']
    }).then(() => {
        const args = [updaterScript, '--from', app.getVersion(), '--to', toVersion, '--url', downloadUrl, '--hash', hash, '--pid', process.pid.toString()];

        try {
            let execPath, spawnArgs;

            if (nodeExists) {
                // Best case: use bundled node.exe directly
                execPath = nodeExe;
                spawnArgs = args;
                logToFile('[Update] Using bundled node.exe to run updater.');
            } else {
                // Fallback: Use Electron binary with ELECTRON_RUN_AS_NODE
                execPath = process.execPath;
                spawnArgs = args;
                logToFile('[Update] node.exe NOT found. Falling back to Electron + ELECTRON_RUN_AS_NODE.');
            }

            const spawnEnv = {
                ...process.env,
                ELECTRON_RUN_AS_NODE: '1',  // string '1', not number
                ELECTRON_NO_ASAR: '1'
            };

            const child = spawn(execPath, spawnArgs, {
                detached: true,
                stdio: ['ignore', 'ignore', 'ignore'],
                env: spawnEnv,
                windowsHide: false  // Show the window so user can see it in taskbar
            });

            child.on('error', (err) => {
                logToFile(`[Update] SPAWN ERROR: ${err.message}`);
            });

            child.unref();
            logToFile(`[Update] Updater spawned (PID: ${child.pid}). Quitting app.`);
            setTimeout(() => app.quit(), 500);
        } catch (e) {
            logToFile(`[Update] CRITICAL SPAWN FAILURE: ${e.message}`);
        }
    });
}



// Helper: Compare semantic versions (Major.Minor.Patch)
function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const a = parts1[i] || 0;
        const b = parts2[i] || 0;
        if (a > b) return 1;
        if (a < b) return -1;
    }
    return 0;
}

function checkForUpdates() {
    if (!app.isPackaged) {
        logToFile('[Update] Skipping update check (not packaged)');
        return;
    }

    const GITHUB_API = 'https://api.github.com/repos/FrigonF/SRIKA/releases/latest';

    const req = https.get(GITHUB_API, {
        headers: {
            'User-Agent': 'SRIKA-Updater',
            'Accept': 'application/vnd.github+json'
        }
    }, (res) => {
        if (res.statusCode !== 200) {
            logToFile(`[Update] Failed to check. Status: ${res.statusCode}`);
            res.resume();
            return;
        }

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const release = JSON.parse(data);

                // 1. Strict Version Parsing
                let latestVersion = release.tag_name;
                if (latestVersion.startsWith('v')) {
                    latestVersion = latestVersion.substring(1);
                }

                const currentVersion = app.getVersion();
                logToFile(`[Update] Current: ${currentVersion}, Latest: ${latestVersion}`);

                if (compareVersions(latestVersion, currentVersion) <= 0) {
                    logToFile('[Update] No new version available (or older).');
                    return;
                }

                // 2. SHA256 Extraction
                const body = release.body || '';
                const shaMatch = body.match(/SHA256:\s*([a-fA-F0-9]{64})/);
                if (!shaMatch) {
                    logToFile('[Update] CRITICAL: SHA256 hash not found in release body. Aborting.');
                    return;
                }
                const expectedHash = shaMatch[1].toLowerCase();
                logToFile(`[Update] Expected SHA256: ${expectedHash}`);

                // 3. Strict Asset Selection
                if (!release.assets || !Array.isArray(release.assets)) {
                    console.log('[Update] Release has no assets.');
                    return;
                }

                const zipAsset = release.assets.find(asset =>
                    asset.name.toLowerCase().endsWith('.zip') &&
                    asset.state === 'uploaded'
                );

                if (!zipAsset) {
                    logToFile('[Update] No suitable .zip asset found.');
                    return;
                }

                const downloadUrl = zipAsset.browser_download_url;
                logToFile(`[Update] Found: ${zipAsset.name} @ ${downloadUrl}`);

                // 4. Launch Updater
                launchUpdater(latestVersion, downloadUrl, expectedHash);

            } catch (e) {
                logToFile(`[Update] Failed to parse response: ${e.message}`);
            }
        });
    });

    req.on('error', (e) => {
        logToFile(`[Update] Network error: ${e.message}`);
    });
}


ipcMain.on('trigger-key', (event, key) => {
    if (ALLOWED_CHANNELS.includes('trigger-key')) {
        if (pythonProcess && pythonProcess.stdin) {
            pythonProcess.stdin.write(key + '\n');

            // Heartbeat for RAW_LM
            if (key.startsWith('RAW_LM:')) {
                if (!global.lm_count) global.lm_count = 0;
                global.lm_count++;
                if (global.lm_count % 100 === 0) {
                    logToFile(`[IPC] Landmarks flowing: ${global.lm_count} frames sent to Python.`);
                }
            } else if (!key.includes('idle')) {
                logToFile(`[IPC] Command: ${key}`);
            }
        } else {
            if (!global.lm_warn) {
                logToFile('[IPC] ERROR: trigger-key received but pythonProcess is NULL or stdin closed.');
                global.lm_warn = true;
                setTimeout(() => global.lm_warn = false, 5000);
            }
        }
    }
});

ipcMain.handle('get-app-version', () => {
    if (!ALLOWED_CHANNELS.includes('get-app-version')) return 'Unknown';
    try {
        const versionPath = path.join(path.dirname(process.execPath), 'app_version.json');
        if (fs.existsSync(versionPath)) return JSON.parse(fs.readFileSync(versionPath, 'utf8')).version;
    } catch { }
    return app.getVersion();
});

ipcMain.handle('open-external', async (event, url) => {
    if (ALLOWED_CHANNELS.includes('open-external')) {
        try { await shell.openExternal(url); return { success: true }; } catch { return { success: false }; }
    }
    return { success: false };
});

ipcMain.on('input-update', (event, intents) => {
    if (ALLOWED_CHANNELS.includes('input-update') && pythonProcess && pythonProcess.stdin) {
        pythonProcess.stdin.write(((intents && intents.length > 0) ? intents.join(',') : "idle") + '\n');
    }
});

ipcMain.handle('fs-read-json', async (event, filename) => {
    if (ALLOWED_CHANNELS.includes('fs-read-json') && ALLOWED_FILES.includes(filename)) {
        const filePath = path.join(dataDir, filename);
        if (!fs.existsSync(filePath)) return null;
        try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
    }
    throw new Error('Access Denied');
});

ipcMain.handle('fs-write-json', async (event, { filename, data }) => {
    if (ALLOWED_CHANNELS.includes('fs-write-json') && ALLOWED_FILES.includes(filename)) {
        if (typeof data !== 'object' || data === null) throw new Error('Invalid Data');
        try { fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2), 'utf8'); return { success: true }; } catch { return { success: false }; }
    }
    throw new Error('Access Denied');
});

ipcMain.handle('get-login-item-settings', () => {
    if (!ALLOWED_CHANNELS.includes('get-login-item-settings')) return { openAtLogin: false };
    return { openAtLogin: app.getLoginItemSettings().openAtLogin };
});

ipcMain.handle('set-login-item-settings', async (event, { openAtLogin }) => {
    if (!ALLOWED_CHANNELS.includes('set-login-item-settings')) return { success: false };

    // Race condition prevention: Avoid overlapping registry writes
    if (app.isSettingLoginItem) return { success: false };
    app.isSettingLoginItem = true;

    try {
        app.setLoginItemSettings({ openAtLogin, path: process.execPath, args: [] });
        // Simulate a small delay to ensure OS catches up
        await new Promise(r => setTimeout(r, 500));
        return { success: true };
    } finally {
        app.isSettingLoginItem = false;
    }
});

ipcMain.handle('update-global-shortcuts', (event, bindings) => {
    if (!ALLOWED_CHANNELS.includes('update-global-shortcuts')) return {};
    const { globalShortcut } = require('electron');

    // Security: Restricted keys that cannot be rebound
    const RESTRICTED_KEYS = ['Alt+Control+Delete', 'Control+Alt+Delete', 'Super', 'Command', 'Win'];

    globalShortcut.unregisterAll();
    const results = {};
    for (const [action, accelerator] of Object.entries(bindings)) {
        // Validation: Whitelist allowed characters (A-Z, 0-9, +, CmdOrCtrl, Shift, Alt, Space)
        const isSafe = /^[a-zA-Z0-9\+\s]+$/.test(accelerator) ||
            accelerator.includes('CmdOrCtrl') ||
            accelerator.includes('Shift') ||
            accelerator.includes('Alt');

        const isRestricted = RESTRICTED_KEYS.some(rk => accelerator.includes(rk));

        if (isSafe && !isRestricted) {
            try {
                results[action] = globalShortcut.register(accelerator, () => {
                    if (win) win.webContents.send('global-shortcut-triggered', action);
                });
            } catch { results[action] = false; }
        } else {
            console.warn(`[Security] Rejected unsafe shortcut: ${accelerator}`);
            results[action] = false;
        }
    }
    return results;
});

ipcMain.on('log-error', (event, error) => {
    console.error('######## RENDERER ERROR ########');
    console.error(error);
    console.error('################################');
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
