const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
// Electron-builder output for unpackaged app
const UNPACKED_DIR = path.join(DIST_DIR, 'installers', 'win-unpacked');

const pkg = require(path.join(ROOT_DIR, 'package.json'));
const VERSION = pkg.version;

if (!fs.existsSync(RELEASE_DIR)) fs.mkdirSync(RELEASE_DIR);

console.log(`[Build] Starting release build for v${VERSION}...`);

try {
    // 1. Clean previous release zip only
    const zipName = `SRIKA-${VERSION}.zip`;
    const zipPath = path.join(RELEASE_DIR, zipName);
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    // 2. Build Unpacked App (SKIPPED: Already built manually or via package)
    console.log('[Build] Using existing build in dist/installers/win-unpacked...');
    // execSync('electron-builder build --win --dir', { stdio: 'inherit', cwd: ROOT_DIR });

    if (!fs.existsSync(UNPACKED_DIR)) {
        throw new Error(`Build folder missing: ${UNPACKED_DIR}`);
    }

    console.log(`[Build] Zipping to ${zipPath}...`);
    const zip = new AdmZip();
    // Add the CONTENTS of win-unpacked to the root of the zip
    zip.addLocalFolder(UNPACKED_DIR);
    zip.writeZip(zipPath);

    // 4. Calculate Hash
    console.log('[Build] Calculating SHA256...');
    const fileBuffer = fs.readFileSync(zipPath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const hex = hashSum.digest('hex');

    console.log('\n---------------------------------------------------');
    console.log('BUILD COMPLETE');
    console.log('---------------------------------------------------');
    console.log(`Version: ${VERSION}`);
    console.log(`File:    ${zipName}`);
    console.log(`SHA256:  ${hex}`);
    console.log('---------------------------------------------------');

    // Output metadata for easy copy-paste or automation
    const metadata = {
        version: VERSION,
        file: zipName,
        sha256: hex
    };
    fs.writeFileSync(path.join(RELEASE_DIR, 'latest_build.json'), JSON.stringify(metadata, null, 2));

} catch (e) {
    console.error('[Build] Error:', e);
    process.exit(1);
}
