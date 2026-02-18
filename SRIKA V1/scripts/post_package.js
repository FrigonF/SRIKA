const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const pkg = require(path.join(ROOT_DIR, 'package.json'));
const VERSION = pkg.version;
const SRC_DIR = path.join(ROOT_DIR, 'dist', 'installers');
const DEST_BASE_DIR = path.join(ROOT_DIR, 'installer');
const VERSION_DIR = path.join(DEST_BASE_DIR, VERSION);

console.log(`[Post-Package] Organizing installer for v${VERSION}...`);

if (!fs.existsSync(SRC_DIR)) {
    console.error(`Error: Source directory ${SRC_DIR} not found.`);
    process.exit(1);
}

if (!fs.existsSync(VERSION_DIR)) {
    fs.mkdirSync(VERSION_DIR, { recursive: true });
}

try {
    const files = fs.readdirSync(SRC_DIR);
    const installerFile = files.find(f => f.startsWith('SRIKA-Setup-') && f.endsWith('.exe'));

    if (installerFile) {
        const srcPath = path.join(SRC_DIR, installerFile);
        const destPath = path.join(VERSION_DIR, installerFile);

        fs.renameSync(srcPath, destPath);
        console.log(`Successfully moved ${installerFile} to ${VERSION_DIR}`);
    } else {
        console.warn('Warning: SRIKA-Setup executable not found in output directory.');
    }
} catch (e) {
    console.error(`Post-package move failed: ${e.message}`);
    process.exit(1);
}
