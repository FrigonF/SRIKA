const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const ROOT_DIR = path.resolve(__dirname, '..');
const MODE = process.argv[2] || 'obfuscate'; // 'backup', 'obfuscate', 'restore'

function obfuscateFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    console.log(`[Obfuscator] Obfuscating: ${filePath}`);
    const code = fs.readFileSync(filePath, 'utf8');
    const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1,
        numbersToExpressions: true,
        simplify: true,
        stringArrayThreshold: 1,
        splitStrings: true,
        splitStringsChunkLength: 5,
        unicodeEscapeSequence: false
    }).getObfuscatedCode();
    fs.writeFileSync(filePath, obfuscatedCode, 'utf8');
}

function obfuscateDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            obfuscateDirectory(fullPath);
        } else if (file.endsWith('.js')) {
            obfuscateFile(fullPath);
        }
    }
}

function handleSourceFiles(action) {
    const files = [
        path.join(ROOT_DIR, 'electron', 'main.js'),
        path.join(ROOT_DIR, 'electron', 'preload.js')
    ];

    files.forEach(file => {
        if (!fs.existsSync(file)) return;
        const backup = file + '.bak';
        if (action === 'backup') {
            console.log(`[Obfuscator] Backing up: ${file}`);
            fs.copyFileSync(file, backup);
        } else if (action === 'restore') {
            if (fs.existsSync(backup)) {
                console.log(`[Obfuscator] Restoring: ${file}`);
                fs.copyFileSync(backup, file);
                if (fs.existsSync(backup)) fs.unlinkSync(backup);
            }
        } else if (action === 'obfuscate') {
            obfuscateFile(file);
        }
    });
}

if (MODE === 'backup') {
    handleSourceFiles('backup');
} else if (MODE === 'restore') {
    handleSourceFiles('restore');
} else {
    // 1. Obfuscate Renderer Build (dist)
    const distDir = path.join(ROOT_DIR, 'dist');
    if (fs.existsSync(distDir)) {
        console.log('[Obfuscator] Starting Renderer Obfuscation...');
        obfuscateDirectory(distDir);
    }
    // 2. Obfuscate Main Process files in place
    handleSourceFiles('obfuscate');
}

console.log(`[Obfuscator] ${MODE} complete.`);
