const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const { spawn, execSync } = require('child_process');

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

log(`Updater started. v2 (Dependency-Free). ExecPath: ${process.execPath}`);
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
        const backups = fs.readdirSync(ROOT_DIR)
            .filter(f => f.startsWith('backup_'))
            .sort((a, b) => b.localeCompare(a));

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
            log('No backups found.');
        }
    } else {
        log('Current installation appears valid.');
    }
}

// --- HELPER: HTTPS GET ---
function fetch(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: { 'User-Agent': 'SRIKA-Updater' }
        };
        https.get(url, options, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return fetch(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`Status: ${res.statusCode}`));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

// --- TRUSTED SHA EXTRACTION ---
async function getExpectedSha() {
    try {
        log('Fetching release metadata from GitHub...');
        const release = await fetch('https://api.github.com/repos/FrigonF/SRIKA/releases/latest');
        const body = release.body || '';
        const shaMatch = body.match(/SHA256:\s*([a-fA-F0-9]{64})/);
        return shaMatch ? shaMatch[1].toLowerCase() : null;
    } catch (e) {
        log(`Error fetching metadata: ${e.message}`);
        return null;
    }
}

// --- MAIN UPDATE PIPELINE ---
async function runUpdate() {
    performRecovery();

    if (fs.existsSync(LOCK_FILE)) {
        log('Update already in progress. Exiting.');
        process.exit(1);
    }
    fs.writeFileSync(LOCK_FILE, `PID: ${process.pid}\nTime: ${new Date().toISOString()}`);

    try {
        if (currentVersion && compareVersions(targetVersion, currentVersion) <= 0) {
            log(`Protection: Rejecting downgrade. (Current: ${currentVersion}, Target: ${targetVersion})`);
            fs.unlinkSync(LOCK_FILE);
            process.exit(0);
        }

        const zipPath = path.join(VERSIONS_DIR, `${targetVersion}.zip`);
        const extractPath = path.join(VERSIONS_DIR, targetVersion);
        const expectedSha = await getExpectedSha();

        if (!expectedSha) throw new Error('Trusted SHA source unavailable.');
        if (!fs.existsSync(VERSIONS_DIR)) fs.mkdirSync(VERSIONS_DIR, { recursive: true });

        log(`Downloading ${targetVersion}...`);
        await new Promise((resolve, reject) => {
            const file = fs.createWriteStream(zipPath);
            const hash = crypto.createHash('sha256');

            const download = (url) => {
                https.get(url, { headers: { 'User-Agent': 'SRIKA-Updater' } }, (res) => {
                    if (res.statusCode === 301 || res.statusCode === 302) {
                        return download(res.headers.location);
                    }
                    if (res.statusCode !== 200) return reject(new Error(`Status: ${res.statusCode}`));

                    res.on('data', chunk => { hash.update(chunk); });
                    res.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        const computedSha = hash.digest('hex').toLowerCase();
                        if (computedSha !== expectedSha) return reject(new Error('SHA256 Mismatch!'));
                        resolve();
                    });
                }).on('error', reject);
            };
            download(downloadUrl);
        });

        log('Extracting (PowerShell)...');
        if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });

        // Use PowerShell for dependency-free extraction
        const psCmd = `Expand-Archive -Path "${zipPath}" -DestinationPath "${extractPath}" -Force`;
        execSync(`powershell -Command "${psCmd}"`, { stdio: 'inherit' });

        log('Verifying extraction...');
        if (!fs.existsSync(path.join(extractPath, 'SRIKA.exe'))) throw new Error('Extracted content invalid (SRIKA.exe missing).');

        // Atomic Swap Script
        const timestamp = Date.now();
        const backupName = `backup_${timestamp}`;
        const batPath = path.join(ROOT_DIR, `swap_${timestamp}.bat`);
        const waitCmd = mainPid ? `:wait_exit\ntasklist /FI "PID eq ${mainPid}" | find ":" > nul\nif errorlevel 1 ( timeout /t 2 /nobreak >nul & goto wait_exit )\n` : `timeout /t 3 /nobreak >nul\n`;

        const batContent = `@echo off
echo [AtomicSwap] Starting...
${waitCmd}
if not exist "${CURRENT_DIR}" goto skip_backup
move "${CURRENT_DIR}" "${path.join(ROOT_DIR, backupName)}"
:skip_backup
move "${extractPath}" "${CURRENT_DIR}"
if %errorlevel% neq 0 (
    echo [Error] Swap failed. Rolling back...
    if exist "${path.join(ROOT_DIR, backupName)}" move "${path.join(ROOT_DIR, backupName)}" "${CURRENT_DIR}"
)
del "${zipPath}"
del "${LOCK_FILE}"
start "" "${path.join(CURRENT_DIR, 'SRIKA.exe')}"
del "%~f0" & exit
`;

        fs.writeFileSync(batPath, batContent);
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
