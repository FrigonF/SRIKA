const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { spawn } = require('child_process');

// --- 1. SAFE ROOT RESOLUTION ---
const EXE_DIR = path.dirname(process.execPath);
const ROOT_DIR = path.resolve(EXE_DIR, '..');

const CURRENT_DIR = path.join(ROOT_DIR, 'current');
const VERSIONS_DIR = path.join(ROOT_DIR, 'versions');
const UPDATER_DIR = path.join(ROOT_DIR, 'updater');
const LOG_FILE = path.join(UPDATER_DIR, 'updater.log');
const LOCK_FILE = path.join(ROOT_DIR, 'update.lock');

// Ensure updater dir exists for logs
if (!fs.existsSync(UPDATER_DIR)) {
    try { fs.mkdirSync(UPDATER_DIR, { recursive: true }); } catch (e) { /* ignore */ }
}

function log(msg) {
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    try { fs.appendFileSync(LOG_FILE, entry); } catch (e) { console.error(e); }
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

const currentVersion = getArg('--from');
const targetVersion = getArg('--to');
const downloadUrl = getArg('--url');
const mainPid = getArg('--pid');

// --- SECURITY VALIDATION ---
const APPROVED_DOMAINS = [
    'github.com',
    'objects.githubusercontent.com'
];

if (!targetVersion || !downloadUrl) {
    log('Missing arguments (--to or --url). Exiting.');
    process.exit(1);
}

// Domain Whitelist Check
try {
    const parsedUrl = new URL(downloadUrl);
    if (parsedUrl.protocol !== 'https:') {
        log(`CRITICAL: Insecure protocol ${parsedUrl.protocol} rejected.`);
        process.exit(1);
    }
    const isApproved = APPROVED_DOMAINS.some(d => parsedUrl.hostname === d || parsedUrl.hostname.endsWith('.' + d));
    if (!isApproved) {
        log(`CRITICAL: Unauthorized download domain ${parsedUrl.hostname} rejected.`);
        process.exit(1);
    }
} catch (e) {
    log(`Malformed URL: ${downloadUrl}`);
    process.exit(1);
}

// --- VERSION COMPARISON ---
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

// --- CRASH RECOVERY ---
function performRecovery() {
    log('Checking for broken installation state...');

    const hasCurrent = fs.existsSync(CURRENT_DIR) && fs.existsSync(path.join(CURRENT_DIR, 'SRIKA.exe'));

    if (!hasCurrent) {
        log('CRITICAL: current/ folder missing or invalid.');
        // Try to find backups
        const backups = fs.readdirSync(ROOT_DIR)
            .filter(f => f.startsWith('backup_'))
            .sort((a, b) => b.localeCompare(a)); // Newest first

        if (backups.length > 0) {
            const latestBackup = path.join(ROOT_DIR, backups[0]);
            log(`Found backup: ${backups[0]}. Attempting restoration...`);
            try {
                fs.renameSync(latestBackup, CURRENT_DIR);
                log('Restoration successful.');
            } catch (e) {
                log(`Restoration failed: ${e.message}`);
            }
        } else {
            log('No backups found. Manual re-install required.');
        }
    } else {
        log('Current installation appears valid.');
    }
}

// --- CLEANUP STRATEGY (OLD BACKUPS) ---
function cleanupBackups() {
    try {
        const backups = fs.readdirSync(ROOT_DIR)
            .filter(f => f.startsWith('backup_'))
            .sort((a, b) => b.localeCompare(a)); // Newest first

        // Keep only the 1 latest backup
        if (backups.length > 1) {
            log(`Cleaning up ${backups.length - 1} old backups...`);
            for (let i = 1; i < backups.length; i++) {
                const p = path.join(ROOT_DIR, backups[i]);
                try {
                    fs.rmSync(p, { recursive: true, force: true });
                    log(`Deleted: ${backups[i]}`);
                } catch (e) {
                    log(`Failed to delete ${backups[i]}: ${e.message}`);
                }
            }
        }
    } catch (e) {
        log(`Backup cleanup error: ${e.message}`);
    }
}

// --- VALIDATION HELPERS ---
function validateZipStructure(zipPath) {
    try {
        const zip = new AdmZip(zipPath);
        const entries = zip.getEntries().map(e => e.entryName);
        const hasExe = entries.some(e => e === 'SRIKA.exe' || e.endsWith('/SRIKA.exe'));
        const hasResources = entries.some(e => e === 'resources/' || e.includes('/resources/'));
        return hasExe && hasResources;
    } catch (e) {
        log(`ZIP Validation Error: ${e.message}`);
        return false;
    }
}

function validateFolderStructure(folderPath) {
    const hasExe = fs.existsSync(path.join(folderPath, 'SRIKA.exe'));
    const hasResources = fs.existsSync(path.join(folderPath, 'resources'));
    return hasExe && hasResources;
}

// --- TRUSTED SHA EXTRACTION ---
async function getExpectedSha() {
    try {
        log('Fetching release metadata from GitHub...');
        const response = await axios.get('https://api.github.com/repos/FrigonF/SRIKA/releases/latest', {
            headers: { 'User-Agent': 'SRIKA-Updater' }
        });
        const body = response.data.body || '';
        const shaMatch = body.match(/SHA256:\s*([a-fA-F0-9]{64})/);
        return shaMatch ? shaMatch[1].toLowerCase() : null;
    } catch (e) {
        log(`Error fetching metadata: ${e.message}`);
        return null;
    }
}

// --- MAIN UPDATE PIPELINE ---
async function runUpdate() {
    // 0. DO NOT BREAK USER DATA
    // We are staying in ROOT_DIR, only modifying current/ and versions/

    // 1. Recovery Check
    performRecovery();

    // 2. Lock File
    if (fs.existsSync(LOCK_FILE)) {
        log('Update already in progress (lock file exists). Exiting.');
        process.exit(1);
    }
    fs.writeFileSync(LOCK_FILE, `PID: ${process.pid}\nTime: ${new Date().toISOString()}`);

    try {
        // 3. Downgrade/Same Version Protection
        if (currentVersion && compareVersions(targetVersion, currentVersion) <= 0) {
            log(`Protection: Rejecting downgrade/identical update. (Current: ${currentVersion}, Target: ${targetVersion})`);
            fs.unlinkSync(LOCK_FILE);
            process.exit(0);
        }

        const zipPath = path.join(VERSIONS_DIR, `${targetVersion}.zip`);
        const extractPath = path.join(VERSIONS_DIR, targetVersion);
        const expectedSha = await getExpectedSha();

        if (!expectedSha) throw new Error('Trusted SHA source unavailable.');

        if (!fs.existsSync(VERSIONS_DIR)) fs.mkdirSync(VERSIONS_DIR, { recursive: true });

        log(`Downloading ${targetVersion}...`);
        const response = await axios({ url: downloadUrl, method: 'GET', responseType: 'stream', headers: { 'User-Agent': 'SRIKA-Updater' } });
        const writer = fs.createWriteStream(zipPath);
        const hash = crypto.createHash('sha256');
        let downloadedSize = 0;

        response.data.on('data', chunk => { downloadedSize += chunk.length; hash.update(chunk); });
        response.data.pipe(writer);

        await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });

        const computedSha = hash.digest('hex').toLowerCase();
        log(`Download complete. Size: ${(downloadedSize / (1024 * 1024)).toFixed(2)} MB`);

        if (computedSha !== expectedSha) throw new Error('SHA256 Mismatch!');
        if (downloadedSize === 0) throw new Error('Empty download.');

        log('Verifying ZIP...');
        if (!validateZipStructure(zipPath)) throw new Error('ZIP structure invalid.');

        log('Extracting...');
        if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractPath, true);

        log('Verifying extracted content...');
        if (!validateFolderStructure(extractPath)) throw new Error('Extracted content invalid.');

        // 4. Atomic Swap Generator
        const timestamp = Date.now();
        const backupName = `backup_${timestamp}`;
        const batPath = path.join(ROOT_DIR, `swap_${timestamp}.bat`);

        // Handle PID waiting if provided
        const waitCmd = mainPid ? `tasklist /FI "PID eq ${mainPid}" | find ":" > nul\nif errorlevel 1 ( timeout /t 2 /nobreak >nul & goto wait_exit )\n` : `timeout /t 3 /nobreak >nul\n`;

        const batContent = `@echo off
echo [AtomicSwap] Starting...
:wait_exit
${waitCmd}
echo [AtomicSwap] Main process exited. Proceeding.

if not exist "${CURRENT_DIR}" (
    echo [Error] Current folder missing!
    goto restore_failure
)

echo [AtomicSwap] Rename current to backup...
move "${CURRENT_DIR}" "${path.join(ROOT_DIR, backupName)}"
if %errorlevel% neq 0 (
    echo [Error] Failed to backup.
    goto restore_failure
)

echo [AtomicSwap] Rename new to current...
move "${extractPath}" "${CURRENT_DIR}"
if %errorlevel% neq 0 (
    echo [Error] Failed to apply update. Rolling back...
    move "${path.join(ROOT_DIR, backupName)}" "${CURRENT_DIR}"
    goto restore_failure
)

echo [AtomicSwap] Success!
del "${zipPath}"
del "${LOCK_FILE}"
echo [AtomicSwap] Relaunching...
start "" "${path.join(CURRENT_DIR, 'SRIKA.exe')}"
del "%~f0" & exit

:restore_failure
echo [Critical] Swap failed. System state might be inconsistent.
del "${LOCK_FILE}"
pause
exit
`;

        fs.writeFileSync(batPath, batContent);

        // 5. Cleanup Strategy (Old backups)
        cleanupBackups();

        log('Spawning Swap Script...');
        const subprocess = spawn('cmd.exe', ['/c', batPath], { detached: true, stdio: 'ignore', cwd: ROOT_DIR, windowsHide: true });
        subprocess.unref();

        process.exit(0);

    } catch (err) {
        log(`CRITICAL: ${err.message}`);
        if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
        process.exit(1);
    }
}

runUpdate();
