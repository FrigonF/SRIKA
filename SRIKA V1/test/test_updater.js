const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const AdmZip = require('adm-zip');

const TEST_ROOT = path.join(__dirname, 'mock_environment');
const CURRENT_DIR = path.join(TEST_ROOT, 'current');
const UPDATER_DIR = path.join(TEST_ROOT, 'updater');
const VERSIONS_DIR = path.join(TEST_ROOT, 'versions');
const DIST_DIR = path.join(TEST_ROOT, 'dist'); // Source for downloads

// Setup Mock Environment
function setup() {
    if (fs.existsSync(TEST_ROOT)) fs.rmSync(TEST_ROOT, { recursive: true, force: true });
    fs.mkdirSync(TEST_ROOT);
    fs.mkdirSync(CURRENT_DIR);
    fs.mkdirSync(UPDATER_DIR);
    fs.mkdirSync(DIST_DIR);

    // Copy real updater script
    fs.copyFileSync(path.join(__dirname, '../updater/index.js'), path.join(UPDATER_DIR, 'index.js'));

    // Create "Current" App
    fs.writeFileSync(path.join(CURRENT_DIR, 'SRIKA.exe'), 'mock binary content');
    fs.writeFileSync(path.join(CURRENT_DIR, 'version.txt'), '1.0.0');

    // Create Update Zip (Mock Download)
    const updateZip = new AdmZip();
    updateZip.addFile('SRIKA.exe', Buffer.from('new binary content (v1.0.1)'));
    updateZip.addFile('version.txt', Buffer.from('1.0.1'));
    // Write to DIST_DIR (Simulating remote server)
    updateZip.writeZip(path.join(DIST_DIR, '1.0.1.zip'));

    console.log('Test environment setup complete.');
}

function runUpdater() {
    console.log('Running updater...');

    const http = require('http');
    const server = http.createServer((req, res) => {
        const filePath = path.join(DIST_DIR, '1.0.1.zip');
        if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Length': stat.size
            });
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404);
            res.end();
        }
    }).listen(4567, async () => {
        console.log('Mock server running on 4567');

        // --- PATCH UPDATER SCRIPT TO USE LOCAL ROOT ---
        const scriptPath = path.join(UPDATER_DIR, 'index.js');
        let content = fs.readFileSync(scriptPath, 'utf8');

        // Override ROOT_DIR to point to TEST_ROOT
        // We replace the logic that calculates ROOT_DIR based on process.execPath

        // Original: const EXE_DIR = path.dirname(process.execPath);
        // Original: const ROOT_DIR = path.resolve(EXE_DIR, '..');

        // We inject a hard override at the top of the file/or replace the lines
        const override = `
        const ROOT_DIR = String.raw\`${TEST_ROOT}\`;
        const EXE_DIR = path.join(ROOT_DIR, 'current');
        // Overridden lines below
        `;

        // We comment out the original derivation
        content = content.replace('const EXE_DIR = path.dirname(process.execPath);', '// const EXE_DIR = ...');
        content = content.replace("const ROOT_DIR = path.resolve(EXE_DIR, '..');", override);

        fs.writeFileSync(scriptPath, content);

        const child = spawn(process.execPath, [
            scriptPath,
            '--to', '1.0.1',
            '--url', 'http://localhost:4567/update.zip',
            '--hash', '' // No hash check for test
        ], {
            cwd: UPDATER_DIR
        });

        child.stdout.on('data', d => console.log('UPDATER:', d.toString().trim()));
        child.stderr.on('data', d => console.log('UPDATER ERR:', d.toString().trim()));

        child.on('close', (code) => {
            console.log(`Updater exited with code ${code}`);
            server.close();
            verify();
        });
    });
}

function verify() {
    console.log('Verifying...');

    // 1. Check version.txt
    const versionFile = path.join(CURRENT_DIR, 'version.txt');
    if (fs.existsSync(versionFile)) {
        const content = fs.readFileSync(versionFile, 'utf8');
        if (content === '1.0.1') {
            console.log('SUCCESS: Version updated to 1.0.1');
        } else {
            console.error(`FAILURE: Version is ${content}, expected 1.0.1`);
        }
    } else {
        console.error('FAILURE: version.txt missing');
    }

    // 2. Check binary content
    const binFile = path.join(CURRENT_DIR, 'SRIKA.exe');
    if (fs.existsSync(binFile)) {
        const content = fs.readFileSync(binFile, 'utf8');
        if (content === 'new binary content (v1.0.1)') {
            console.log('SUCCESS: Binary updated');
        } else {
            console.error('FAILURE: Binary content mismatch');
        }
    }

    // 3. Check for backup
    const backups = fs.readdirSync(TEST_ROOT).filter(d => d.startsWith('backup_'));
    if (backups.length > 0) {
        console.log('SUCCESS: Backup folder created');
    } else {
        console.error('FAILURE: No backup folder found');
    }
}

setup();
runUpdater();
