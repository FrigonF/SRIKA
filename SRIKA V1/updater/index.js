const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const { spawn, execSync } = require('child_process');

// --- 1. SAFE ROOT RESOLUTION ---
const EXE_DIR = path.dirname(process.execPath);
// Detect structure: Are we in a 'current' folder or flat?
let ROOT_DIR;
if (fs.existsSync(path.join(EXE_DIR, '..', 'resources'))) {
    // Packaged but flat (C:\Program Files\SRIKA)
    ROOT_DIR = EXE_DIR;
} else {
    // Dev or "Current" structure
    ROOT_DIR = path.resolve(EXE_DIR, '..');
}

const CURRENT_DIR = (ROOT_DIR === EXE_DIR) ? ROOT_DIR : path.join(ROOT_DIR, 'current');
const VERSIONS_DIR = path.join(ROOT_DIR, 'versions');
const UPDATER_DIR = (ROOT_DIR === EXE_DIR) ? path.join(ROOT_DIR, 'resources', 'updater') : path.join(ROOT_DIR, 'updater');
const LOG_FILE = path.join(UPDATER_DIR, 'updater.log');
const LOCK_FILE = path.join(ROOT_DIR, 'update.lock');

// Ensure root-level dirs exist
if (!fs.existsSync(VERSIONS_DIR)) try { fs.mkdirSync(VERSIONS_DIR, { recursive: true }); } catch (e) { /* ignore */ }

function log(msg) {
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    try {
        fs.appendFileSync(LOG_FILE, entry);
    } catch (e) {
        // Fallback to appdata if Program Files is read-only
        const appData = process.env.APPDATA || process.env.USERPROFILE;
        const fallbackLog = path.join(appData, 'srika_updater.log');
        try { fs.appendFileSync(fallbackLog, entry); } catch (e2) { }
    }
    console.log(msg);
}

log(`Updater started. v3 (Path-Aware). ExecPath: ${process.execPath}`);
log(`Root detected: ${ROOT_DIR}`);
log(`Current binary folder: ${CURRENT_DIR}`);

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
    const hasCurrent = fs.existsSync(path.join(CURRENT_DIR, 'SRIKA.exe'));

    if (!hasCurrent) {
        log('CRITICAL: App executable missing.');
        const backups = fs.readdirSync(ROOT_DIR)
            .filter(f => f.startsWith('backup_'))
            .sort((a, b) => b.localeCompare(a));

        if (backups.length > 0) {
            const latestBackup = path.join(ROOT_DIR, backups[0]);
            log(`Found backup: ${backups[0]}. Attempting restoration...`);
            try {
                // This is risky in Program Files without elevation
                // but recovery is better than nothing
                execSync(`powershell -Command "Move-Item -Path '${latestBackup}' -Destination '${CURRENT_DIR}' -Force"`);
                log('Restoration attempted via PowerShell.');
            } catch (e) {
                log(`Restoration failed: ${e.message}`);
            }
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

        // --- ATOMIC SWAP GENERATOR ---
        const timestamp = Date.now();
        const backupDir = path.join(ROOT_DIR, `backup_${timestamp}`);
        const psScriptPath = path.join(ROOT_DIR, `swap_${timestamp}.ps1`);

        // PowerShell Swap Script Logic:
        // 1. Wait for Main Process to exit
        // 2. Backup current files (except updater/logs/versions)
        // 3. Move new files into place
        // 4. Cleanup
        // 5. Relaunch
        const psScript = `
$mainPid = ${mainPid || 0}
if ($mainPid -gt 0) {
    while (Get-Process -Id $mainPid -ErrorAction SilentlyContinue) {
        Start-Sleep -Seconds 1
    }
}

$rootDir = "${ROOT_DIR}"
$backupDir = "${backupDir}"
$extractPath = "${extractPath}"
$exePath = Join-Path $rootDir "SRIKA.exe"

try {
    # 1. Create backup of current files
    New-Item -ItemType Directory -Path $backupDir -Force
    Get-ChildItem -Path $rootDir | Where-Object { 
        $_.Name -ne "updater" -and 
        $_.Name -ne "versions" -and 
        $_.Name -ne "resources" -and
        $_.Name -notlike "backup_*" -and
        $_.Name -notlike "swap_*"
    } | Move-Item -Destination $backupDir -Force

    # Handle resources separately (keep asar if needed, but usually we replace all)
    if (Test-Path (Join-Path $rootDir "resources")) {
        Move-Item -Path (Join-Path $rootDir "resources") -Destination (Join-Path $backupDir "resources") -Force
    }

    # 2. Move new files in
    Get-ChildItem -Path $extractPath | Move-Item -Destination $rootDir -Force
    
    # 3. Cleanup
    Remove-Item -Path $extractPath -Recurse -Force
    Remove-Item -Path "${LOCK_FILE}" -Force

    # 4. Relaunch
    Start-Process $exePath
} catch {
    Write-Error $_.Exception.Message
    # Try emergency Relaunch
    if (Test-Path $exePath) { Start-Process $exePath }
}

# Delete self
Remove-Item $PSCommandPath -Force
`;

        fs.writeFileSync(psScriptPath, psScript);
        log('Spawning Elevated Swap Script...');

        // Launch PowerShell elevated to perform the swap
        const launchCmd = `Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File '${psScriptPath}'" -Verb RunAs`;
        execSync(`powershell -Command "${launchCmd}"`);

        log('Elevation request sent. Exiting updater.');
        process.exit(0);

    } catch (err) {
        log(`CRITICAL: ${err.message}`);
        if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
        process.exit(1);
    }
}

runUpdate();
