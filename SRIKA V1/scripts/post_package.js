const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const pkg = require(path.join(ROOT_DIR, 'package.json'));
const VERSION = pkg.version;
const SRC_DIR = path.join(ROOT_DIR, 'dist', 'installers');
const DEST_BASE_DIR = path.join(ROOT_DIR, 'installer');
const VERSION_DIR = path.join(DEST_BASE_DIR, VERSION);

console.log(`[Post-Package] Organizing installer for v${VERSION}...`);
if (!fs.existsSync(VERSION_DIR)) {
    fs.mkdirSync(VERSION_DIR, { recursive: true });
}

console.log(`[Post-Package] Checking source: ${SRC_DIR}`);
if (!fs.existsSync(SRC_DIR)) {
    console.error(`[Post-Package] Error: Source directory ${SRC_DIR} not found.`);
    process.exit(1);
}

const files = fs.readdirSync(SRC_DIR);
console.log(`[Post-Package] Files found: ${files.join(', ')}`);
const installerFile = files.find(f => f.startsWith('SRIKA-Setup-') && f.endsWith('.exe'));

if (installerFile) {
    const srcPath = path.join(SRC_DIR, installerFile);
    const destPath = path.join(VERSION_DIR, installerFile);

    console.log(`[Post-Package] Moving ${srcPath} to ${destPath}`);
    try {
        if (fs.existsSync(destPath)) {
            console.log(`[Post-Package] Destination exists. Attempting to overwrite...`);
            fs.unlinkSync(destPath); // Remove old one first to avoid lock issues on rename
        }
        fs.renameSync(srcPath, destPath);
        console.log(`[Post-Package] SUCCESS: Moved ${installerFile} to ${VERSION_DIR}`);
    } catch (e) {
        console.error(`[Post-Package] MOVE FAILED: ${e.message}`);
        // Fallback: copy instead of move
        try {
            fs.copyFileSync(srcPath, destPath);
            console.log(`[Post-Package] SUCCESS: Copied ${installerFile} (fallback)`);
        } catch (copyErr) {
            console.error(`[Post-Package] COPY FAILED TOO: ${copyErr.message}`);
            process.exit(1);
        }
    }
} else {
    console.warn('[Post-Package] Warning: SRIKA-Setup executable not found.');
}
