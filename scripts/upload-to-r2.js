/**
 * Upload SEC content files to Cloudflare R2
 * 
 * Prerequisites:
 *   npm install @aws-sdk/client-s3
 * 
 * Usage:
 *   R2_ACCESS_KEY_ID=xxx R2_SECRET_ACCESS_KEY=xxx node scripts/upload-to-r2.js
 * 
 * Or set env vars in .env.local
 */

const { S3Client, PutObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "ddc5d0242287a3d94e62f99567e21534"; // from S3 endpoint
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = "dat-tracker-filings";

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error("Missing R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY environment variables");
  console.error("Usage: R2_ACCESS_KEY_ID=xxx R2_SECRET_ACCESS_KEY=xxx node scripts/upload-to-r2.js");
  process.exit(1);
}

// Create S3 client for R2
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Source directory
const SOURCE_DIR = path.join(__dirname, "..", "public", "sec-content");

async function uploadFile(filePath, key) {
  const content = fs.readFileSync(filePath);
  const contentType = filePath.endsWith(".html") ? "text/html" : "text/plain";
  
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: contentType,
  }));
}

async function uploadDirectory(dirPath, prefix = "") {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  let uploaded = 0;
  let errors = 0;
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const key = prefix ? `${prefix}/${entry.name}` : entry.name;
    
    if (entry.isDirectory()) {
      const result = await uploadDirectory(fullPath, key);
      uploaded += result.uploaded;
      errors += result.errors;
    } else if (entry.isFile()) {
      try {
        process.stdout.write(`Uploading ${key}...`);
        await uploadFile(fullPath, key);
        console.log(" ✓");
        uploaded++;
      } catch (err) {
        console.log(` ✗ ${err.message}`);
        errors++;
      }
    }
  }
  
  return { uploaded, errors };
}

async function main() {
  console.log("=== Cloudflare R2 Upload ===\n");
  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Prefix: sec-content/\n`);
  
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }
  
  const start = Date.now();
  const result = await uploadDirectory(SOURCE_DIR, "sec-content");
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  
  console.log(`\n=== Complete ===`);
  console.log(`Uploaded: ${result.uploaded} files`);
  console.log(`Errors: ${result.errors}`);
  console.log(`Time: ${elapsed}s`);
  console.log(`\nFiles available at: https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev/sec-content/`);
}

main().catch(console.error);
