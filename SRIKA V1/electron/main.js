const { app, BrowserWindow, ipcMain, powerSaveBlocker, safeStorage, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');
const crypto = require('crypto');

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
    // Register custom srika-asset protocol for WASM/MediaPipe (bypass ASAR)
    protocol.registerSchemesAsPrivileged([
        { scheme: 'srika-asset', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: true } }
    ]);

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
        // Register the file handler for our custom scheme (Modern API)
        protocol.handle('srika-asset', async (request) => {
            try {
                const url = new URL(request.url);
                const logicalPath = decodeURIComponent(url.hostname + url.pathname);

                // Map logical paths to obscured physical paths
                let assetPath = logicalPath;
                if (logicalPath.startsWith('mediapipe/')) {
                    assetPath = logicalPath.replace('mediapipe/', '_mediapipe/');
                } else if (logicalPath.startsWith('engine/')) {
                    assetPath = logicalPath.replace('engine/', '_engine/');
                } else if (logicalPath.startsWith('srika_native/')) {
                    assetPath = logicalPath.replace('srika_native/', '_srika_native/');
                }

                const filePath = path.join(process.resourcesPath, assetPath);

                if (!fs.existsSync(filePath)) {
                    logToFile(`[Protocol] File NOT found: ${filePath}`);
                    return new Response('Not Found', { status: 404 });
                }

                const ext = path.extname(filePath).toLowerCase();
                const mimeMap = {
                    '.wasm': 'application/wasm',
                    '.js': 'text/javascript',
                    '.json': 'application/json',
                    '.bin': 'application/octet-stream',
                    '.data': 'application/octet-stream',
                    '.tflite': 'application/octet-stream'
                };

                const data = fs.readFileSync(filePath);
                return new Response(data, {
                    status: 200,
                    headers: {
                        'Content-Type': mimeMap[ext] || 'application/octet-stream',
                        'Cross-Origin-Resource-Policy': 'cross-origin',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            } catch (err) {
                logToFile(`[Protocol] Error handling request: ${err.message}`);
                return new Response(err.message, { status: 500 });
            }
        });

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
            const isTrustedExternal = url.includes('googleusercontent.com') || url.includes('ui-avatars.com') || url.startsWith('srika-asset://');

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

    // --- PRODUCTION HARDENING ---
    if (app.isPackaged) {
        win.removeMenu();
        win.webContents.on('devtools-opened', () => {
            win.webContents.closeDevTools();
        });
    }

    win.once('ready-to-show', () => {
        win.show();
    });

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

        // RESOLVE SCRIPT PATH (Bypass ASAR in production - uses obscured _core)
        const scriptPath = app.isPackaged
            ? path.join(process.resourcesPath, '_core', 'input_bridge.py')
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

// Download a URL to a file, emitting progress % as we go
function downloadFile(url, destPath, onProgress) {
    return new Promise((resolve, reject) => {
        let redirectCount = 0;
        const maxRedirects = 5;

        const request = (reqUrl) => {
            logToFile(`[Update] Requesting: ${reqUrl}`);
            const req = https.get(reqUrl, {
                headers: {
                    'User-Agent': 'SRIKA-Updater',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                },
                timeout: 15000 // 15s connection timeout
            });

            req.on('response', (res) => {
                // Handle Redirects
                if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
                    res.resume(); // CRITICAL: Consume the response stream to free the socket
                    if (redirectCount >= maxRedirects) {
                        return reject(new Error('Too many redirects'));
                    }
                    redirectCount++;
                    const nextUrl = res.headers.location;
                    if (!nextUrl) return reject(new Error(`Redirect status ${res.statusCode} without location header`));

                    logToFile(`[Update] Redirect (${redirectCount}) to ${nextUrl}`);
                    return request(nextUrl);
                }

                if (res.statusCode !== 200) {
                    res.resume();
                    return reject(new Error(`HTTP ${res.statusCode} at ${reqUrl}`));
                }

                const total = parseInt(res.headers['content-length'] || '0', 10);
                let downloaded = 0;
                const file = fs.createWriteStream(destPath);

                // --- INACTIVITY TIMEOUT ---
                // If we don't receive data for 30s, the connection is likely dead
                let inactivityTimer;
                const resetInactivityTimer = () => {
                    clearTimeout(inactivityTimer);
                    inactivityTimer = setTimeout(() => {
                        req.destroy();
                        res.destroy();
                        file.destroy();
                        reject(new Error('Download stalled: No data received for 30 seconds'));
                    }, 30000);
                };
                resetInactivityTimer();

                res.on('data', (chunk) => {
                    resetInactivityTimer();
                    downloaded += chunk.length;
                    if (total > 0 && onProgress) {
                        // Spread download across 0-85% range
                        onProgress(Math.round((downloaded / total) * 85));
                    }
                });

                res.on('error', (err) => {
                    clearTimeout(inactivityTimer);
                    file.destroy();
                    reject(err);
                });

                res.on('end', () => {
                    clearTimeout(inactivityTimer);
                    file.end();
                });

                file.on('finish', () => {
                    logToFile(`[Update] Download complete: ${downloaded} bytes`);
                    resolve();
                });

                file.on('error', (err) => {
                    clearTimeout(inactivityTimer);
                    req.destroy();
                    res.destroy();
                    reject(err);
                });

                res.pipe(file);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Connection timed out'));
            });

            req.on('error', (err) => {
                reject(err);
            });
        };

        request(url);
    });
}

// Verify SHA-256 of a file
function verifySha256(filePath, expectedHash) {
    const data = fs.readFileSync(filePath);
    const actual = crypto.createHash('sha256').update(data).digest('hex');
    return actual.toLowerCase() === expectedHash.toLowerCase();
}

// Central update state
let updateInProgress = false;

async function startInAppUpdate(version, downloadUrl, hash) {
    if (updateInProgress) return;
    updateInProgress = true;

    const sendProgress = (percent, status) => {
        logToFile(`[Update Status] ${percent}% — ${status}`);
        if (win) win.webContents.send('update-progress', { percent, status });
    };

    try {
        logToFile(`[Update] Starting update process for v${version}`);
        if (win) win.webContents.send('update-found', { version });
        sendProgress(0, `Initializing update v${version}...`);

        // 1. Setup paths
        const cacheDir = path.join(userDataPath, 'update-cache');
        const zipPath = path.join(cacheDir, `${version}.zip`);
        const extractDir = path.join(cacheDir, `extracted-${version}`);

        logToFile(`[Update] Cache Dir: ${cacheDir}`);

        // 2. Clear old state
        try {
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
                logToFile(`[Update] Created cache directory`);
            }
            if (fs.existsSync(extractDir)) {
                logToFile(`[Update] Cleaning old extraction directory...`);
                fs.rmSync(extractDir, { recursive: true, force: true });
            }
            if (fs.existsSync(zipPath)) {
                logToFile(`[Update] Removing old zip file...`);
                fs.unlinkSync(zipPath);
            }
        } catch (e) {
            logToFile(`[Update] Setup WARNING: ${e.message}`);
            // Non-fatal, we'll try to overwrite
        }

        // 3. Download
        sendProgress(2, 'Connecting to download server...');
        logToFile(`[Update] Initializing download from: ${downloadUrl}`);

        await downloadFile(downloadUrl, zipPath, (p) => {
            // Ensure we only send progress if it actually changed or is significant
            sendProgress(p, 'Downloading...');
        });

        // 4. Verify integrity
        sendProgress(86, 'Verifying file integrity...');
        logToFile(`[Update] Verifying SHA256...`);
        if (!verifySha256(zipPath, hash)) {
            throw new Error('Integrity check failed: The downloaded file is corrupted or incomplete.');
        }
        sendProgress(88, 'Integrity verified ✓');

        // 5. Extract
        sendProgress(90, 'Extracting package...');
        logToFile(`[Update] Extracting with PowerShell...`);
        const { execSync } = require('child_process');
        // Use -ErrorAction Stop to catch PS errors
        execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`, { stdio: 'inherit' });
        logToFile(`[Update] Extraction complete.`);

        // 6. Build Swap Script
        sendProgress(95, 'Preparing final application...');
        const appDir = path.dirname(process.execPath);
        const swapScript = path.join(cacheDir, 'swap.ps1');

        logToFile(`[Update] Creating swap script at: ${swapScript}`);
        const psContent = `
$src = '${extractDir.replace(/'/g, "''")}';
$dst = '${appDir.replace(/'/g, "''")}';
$exe = '${process.execPath.replace(/'/g, "''")}';
$AppPid = ${process.pid};

Write-Host "SRIKA Update Service Started";
$retry = 0;
while ((Get-Process -Id $AppPid -ErrorAction SilentlyContinue) -and ($retry -lt 20)) {
    Write-Host "Waiting for Srika to exit... ($retry/20)";
    Start-Sleep -Seconds 1;
    $retry++;
}

if (Get-Process -Id $AppPid -ErrorAction SilentlyContinue) {
    Write-Host "Forcing process termination...";
    Stop-Process -Id $AppPid -Force -ErrorAction SilentlyContinue;
}

Write-Host "Unlocking destination files...";
attrib -R "$dst\\*" /S /D

Write-Host "Syncing files...";
robocopy "$src" "$dst" /MIR /A-:R /R:2 /W:2 /NFL /NDL /NJH /NJS | Out-Null;

Write-Host "Update Successful. Relaunching...";
Start-Process "$exe";
`;
        fs.writeFileSync(swapScript, psContent, 'utf8');

        // 7. Restart phase
        sendProgress(99, 'Update ready. Restarting app...');
        if (win) win.webContents.send('update-complete', { version });

        logToFile(`[Update] Handing over to swap script. Quitting.`);
        await new Promise(r => setTimeout(r, 1000));

        const { exec } = require('child_process');
        exec(`powershell -NoProfile -Command "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \\"${swapScript}\\"' -Verb RunAs"`, (err) => {
            if (err) logToFile(`[Update] CRITICAL: Failed to launch swap script: ${err.message}`);
        });

        setTimeout(() => app.quit(), 1000);

    } catch (err) {
        logToFile(`[Update] FATAL ERROR: ${err.message}`);
        if (win) win.webContents.send('update-error', { message: err.message });
        updateInProgress = false;
    }
}

// ─── VERSION CHECK ────────────────────────────────────────────────────────────

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

    const GITHUB_API = 'https://api.github.com/repos/FrigonF/Srika/releases/latest';

    const req = https.get(GITHUB_API, {
        headers: {
            'User-Agent': 'SRIKA-Updater',
            'Accept': 'application/vnd.github+json'
        }
    }, (res) => {
        if (res.statusCode !== 200) {
            logToFile(`[Update] Failed to check.Status: ${res.statusCode} `);
            res.resume();
            return;
        }

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const release = JSON.parse(data);

                // GUARD: Invalid or missing release data
                if (!release || typeof release !== 'object') {
                    logToFile('[Update] Invalid release response from GitHub.');
                    return;
                }

                let latestVersion = release.tag_name;
                if (!latestVersion || typeof latestVersion !== 'string') {
                    logToFile('[Update] No valid tag_name found in release.');
                    return;
                }

                if (latestVersion.startsWith('v')) latestVersion = latestVersion.substring(1);

                const currentVersion = app.getVersion();
                logToFile(`[Update] Current: ${currentVersion}, Latest: ${latestVersion} `);

                if (compareVersions(latestVersion, currentVersion) <= 0) {
                    logToFile('[Update] Already up to date.');
                    return;
                }

                const body = release.body || '';
                const shaMatch = body.match(/SHA256:\s*([a-fA-F0-9]{64})/);
                if (!shaMatch) {
                    logToFile('[Update] CRITICAL: SHA256 not found in release body. Skip.');
                    return;
                }
                const expectedHash = shaMatch[1].toLowerCase();

                if (!release.assets || !Array.isArray(release.assets)) {
                    logToFile('[Update] Release has no assets.');
                    return;
                }

                const zipAsset = release.assets.find(a =>
                    a && a.name && a.name.toLowerCase().endsWith('.zip') && a.state === 'uploaded'
                );

                if (!zipAsset) {
                    logToFile('[Update] No .zip asset found.');
                    return;
                }

                logToFile(`[Update] Update available: v${latestVersion} — starting in -app update.`);
                startInAppUpdate(latestVersion, zipAsset.browser_download_url, expectedHash);

            } catch (e) {
                logToFile(`[Update] ERROR in check loop: ${e.message} `);
            }
        });
    });

    req.on('error', (e) => {
        logToFile(`[Update] Network error: ${e.message} `);
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
                logToFile(`[IPC] Command: ${key} `);
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
            console.warn(`[Security] Rejected unsafe shortcut: ${accelerator} `);
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
