require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Load metadata
const RELEASE_DIR = path.resolve(__dirname, '../release');
const metaPath = path.join(RELEASE_DIR, 'latest_build.json');

if (!fs.existsSync(metaPath)) {
    console.error('No build metadata found. Run build_release.js first.');
    process.exit(1);
}

const meta = require(metaPath);
const zipPath = path.join(RELEASE_DIR, meta.file);

if (!process.env.R2_ACCOUNT_ID) {
    console.error('R2_ACCOUNT_ID missing in .env');
    console.log('Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME');
    process.exit(1);
}

const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function upload() {
    console.log(`[Upload] Uploading ${meta.file} to R2...`);

    const fileStream = fs.createReadStream(zipPath);

    try {
        await s3.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: meta.file, // e.g. SRIKA-1.0.1.zip
            Body: fileStream,
            ContentType: 'application/zip',
            // ACL: 'public-read' // R2 usually manages public access via bucket settings, but can try
        }));

        console.log('[Upload] Success!');
        console.log(`URL: https://${process.env.R2_PUBLIC_DOMAIN}/${meta.file}`);
        console.log(`SHA256: ${meta.sha256}`);

    } catch (e) {
        console.error('[Upload] Failed:', e);
        process.exit(1);
    }
}

upload();
