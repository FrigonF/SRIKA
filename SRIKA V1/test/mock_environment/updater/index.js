const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { spawn } = require('child_process');

// --- 1. SAFE ROOT RESOLUTION ---
// Resolve root relative to the executable (process.execPath)
// In packaged app: .../SRIKA/current/SRIKA.exe -> root is .../SRIKA/
// In dev: process.execPath might be node.exe, updated assumes we are in project root
// const EXE_DIR = ...
// Valid structure: ROOT/current/SRIKA.exe -> ROOT is up one level

        const ROOT_DIR = String.raw`D:\Initiavates\Business\Srika\SRIKA V1\test\mock_environment`;
        const EXE_DIR = path.join(ROOT_DIR, 'current');
        // Overridden lines below
        

const CURRENT_DIR = path.join(ROOT_DIR, 'current');
const VERSIONS_DIR = path.join(ROOT_DIR, 'versions');
const UPDATER_DIR = path.join(ROOT_DIR, 'updater');
// userData passed loosely or resolved safely? User said "Mapped to app.getPath('userData')"
// We won't touch userData in this script as per safety rules.

const LOG_FILE = path.join(UPDATER_DIR, 'updater.log');

function log(msg) {
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(LOG_FILE, entry);
    console.log(msg);
}

log(`Updater started. ExecPath: ${process.execPath}`);
log(`Root detected: ${ROOT_DIR}`);

// --- ARGS PARSING ---
const args = process.argv.slice(2);
const getArg = (key) => {
    const idx = args.indexOf(key);
    return idx !== -1 ? args[idx + 1] : null;
};

const version = getArg('--to');
const url = getArg('--url');
const hash = getArg('--hash');

if (!version || !url) {
    log('Missing arguments. Cleaning up and exiting.');
    process.exit(1);
}

// --- 2. CRASH RECOVERY (BEFORE UPDATE) ---
function performRecovery() {
    log('Checking for recovery...');

    // Check for backup folders (backup_TIMESTAMP)
    const dirs = fs.readdirSync(ROOT_DIR).filter(d => d.startsWith('backup_'));
    if (dirs.length > 0) {
        log(`Found backup folders: ${dirs.join(', ')}`);

        // If current/ is missing, we MUST restore
        if (!fs.existsSync(CURRENT_DIR)) {
            const latestBackup = dirs.sort().pop(); // Last one
            const backupPath = path.join(ROOT_DIR, latestBackup);
            log(`CRITICAL: 'current' folder missing! Restoring from ${latestBackup}...`);
            try {
                fs.renameSync(backupPath, CURRENT_DIR);
                log('Restored successfully.');
            } catch (e) {
                log(`Failed to restore backup: ${e.message}`);
                process.exit(1); // Fatal
            }
        }
    }
}

performRecovery();

// --- 3. DOWNLOAD & VERIFY ---
async function downloadAndVerify() {
    const zipPath = path.join(VERSIONS_DIR, `${version}.zip`);
    const extractPath = path.join(VERSIONS_DIR, version);

    // Ensure versions dir exists
    if (!fs.existsSync(VERSIONS_DIR)) fs.mkdirSync(VERSIONS_DIR, { recursive: true });

    log(`Downloading ${version} from ${url}...`);

    const writer = fs.createWriteStream(zipPath);
    const hasher = crypto.createHash('sha256');

    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        response.data.pipe(writer);
        response.data.pipe(hasher); // Stream hash calculation

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        const downloadedHash = hasher.digest('hex');
        log(`Download complete. Hash: ${downloadedHash}`);

        if (hash && downloadedHash !== hash) {
            throw new Error(`Hash mismatch! Expected ${hash}, got ${downloadedHash}`);
        }

        // --- 4. SAFE EXTRACTION ---
        log(`Extracting to ${extractPath}...`);
        if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });

        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractPath, true);

        // --- VALIDATION ---
        const exePath = path.join(extractPath, 'SRIKA.exe'); // Or whatever the main binary is
        // Adapt check for dev env vs prod
        // In prod, check for 'resources' folder too

        // NOTE: For robustness, we check if ANY content exists.
        // Specific file check depends on build output structure.
        if (fs.readdirSync(extractPath).length === 0) {
            throw new Error('Extracted folder is empty!');
        }

        log('Extraction validated.');

        // --- 5. ATOMIC SWAP ---
        log('Performing atomic swap...');
        const backupName = `backup_${Date.now()}`;
        const backupPath = path.join(ROOT_DIR, backupName);

        // 1. Rename current -> backup
        if (fs.existsSync(CURRENT_DIR)) {
            fs.renameSync(CURRENT_DIR, backupPath);
        }

        // 2. Rename new -> current
        try {
            fs.renameSync(extractPath, CURRENT_DIR);
        } catch (e) {
            log(`Swap failed: ${e.message}. Rolling back...`);
            // Restore backup
            if (fs.existsSync(backupPath)) {
                fs.renameSync(backupPath, CURRENT_DIR);
            }
            throw e;
        }

        log('Swap successful.');

        // --- 6. LAUNCH ---
        const launchPath = path.join(CURRENT_DIR, 'SRIKA.exe');
        log(`Launching ${launchPath}...`);

        // Detached spawn - updater exits, app lives
        // Use 'start' on windows to ensure proper detachment if direct spawn is tricky
        // But requested spawn directly.
        const subprocess = spawn(launchPath, [], {
            detached: true,
            stdio: 'ignore',
            cwd: CURRENT_DIR
        });
        subprocess.unref();

        log('Exiting updater.');
        process.exit(0);

    } catch (err) {
        log(`Update failed: ${err.message}`);
        // Cleanup zip
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        // Cleanup extract
        if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });

        process.exit(1);
    }
}

downloadAndVerify();
