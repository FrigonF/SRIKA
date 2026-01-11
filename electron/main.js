const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const { powerSaveBlocker } = require('electron');

// Prevent app from suspended when in background
powerSaveBlocker.start('prevent-app-suspension');

let tray = null;
let win = null;

function createWindow() {
    win = new BrowserWindow({
        width: 1280,
        height: 800,
        backgroundColor: '#1a1d2e',
        frame: false, // COMPLETELY HIDE NATIVE FRAME AND CONTROLS
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            backgroundThrottling: false // CRITICAL: Run full speed in background
        }
    });

    // Window Control Handlers
    ipcMain.on('window-minimize', () => {
        // Option B: Minimize to Tray behavior
        win.hide();
        if (tray) {
            tray.displayBalloon({
                title: "SRIKA Running in Background",
                content: "Gesture Engine is active. Double-click tray icon to restore."
            });
        }
    });

    ipcMain.on('window-maximize', () => {
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
    });
    ipcMain.on('window-close', () => {
        // App close (Quit Engine)
        win.close();
    });

    // Input Handler (Python Sidecar)
    const pythonProcess = require('child_process').spawn('py', [path.join(__dirname, 'input_bridge.py')]);

    pythonProcess.stdout.on('data', (data) => {
        const message = data.toString().trim();
        console.log(`[Python] ${message}`);

        // Parse Admin Status
        if (message.startsWith('ADMIN_STATUS:')) {
            const isAdmin = message.split(':')[1] === 'TRUE';
            if (win && !win.isDestroyed()) {
                win.webContents.send('admin-status', isAdmin);
            }
        }
    });

    pythonProcess.stderr.on('data', (data) => console.error(`[Python Error] ${data}`));

    ipcMain.on('trigger-key', (event, key) => {
        // console.log('[Main] Send Key to Sidecar:', key); // Verbose logging disabled for latency
        if (pythonProcess.stdin.writable) {
            pythonProcess.stdin.write(key + '\n');
        }
    });

    ipcMain.on('set-game-mode', (event, on) => {
        const mode = on ? 'GAME' : 'STANDARD';
        console.log('[Main] Setting Sidecar Mode:', mode);
        if (pythonProcess.stdin.writable) {
            pythonProcess.stdin.write(`SET_MODE:${mode}\n`);
        }
    });

    win.loadURL('http://localhost:3000');

    // System Tray Creation
    tray = new Tray(path.join(__dirname, '../public/icon.ico')); // Fallback or need real icon path, assuming existence or generic
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show SRIKA', click: () => win.show() },
        { label: 'Exit', click: () => app.quit() }
    ]);
    tray.setToolTip('SRIKA Motion Engine');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
        win.show();
    });

    win.on('closed', () => {
        pythonProcess.kill();
        win = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
