#!/usr/bin/env node
/*
 * Fetch images from Firebase Storage into `public/images/` during build.
 *
 * Environment variables supported:
 * - FIREBASE_SERVICE_ACCOUNT (JSON string of service account) OR
 * - GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON file)
 * - FIREBASE_STORAGE_BUCKET or VITE_FIREBASE_STORAGE_BUCKET
 *
 * On Vercel, set FIREBASE_SERVICE_ACCOUNT to the service account JSON string
 * and set FIREBASE_STORAGE_BUCKET to your bucket name.
 */
import fs from 'fs';
import path from 'path';
import process from 'process';
import admin from 'firebase-admin';

const outDir = path.join(process.cwd(), 'public', 'images');

const ensureDir = (p) => {
  try {
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      if (!stat.isDirectory()) {
        // If a file exists where a directory should be, remove it
        fs.unlinkSync(p);
        fs.mkdirSync(p, { recursive: true });
      }
    } else {
      fs.mkdirSync(p, { recursive: true });
    }
  } catch (err) {
    // best-effort
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
  }
};

const loadServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (err) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', err);
      return null;
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const p = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
  }

  return null;
};

const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET;

const main = async () => {
  if (!bucketName) {
    console.warn('FIREBASE_STORAGE_BUCKET (or VITE_FIREBASE_STORAGE_BUCKET) not set — skipping image fetch.');
    return;
  }

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    console.warn('No service account provided (FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS). Skipping image fetch.');
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: bucketName,
    });

    const bucket = admin.storage().bucket();

    ensureDir(outDir);

    console.log('Listing files in bucket prefix "logos/"...');
    const [files] = await bucket.getFiles({ prefix: 'logos/' });

    if (!files || files.length === 0) {
      console.log('No files found under logos/.');
      return;
    }

    console.log(`Found ${files.length} files. Downloading to public/images/logos/...`);

    for (const file of files) {
      const relPath = file.name; // e.g., logos/plv-logo.webp

      // Skip directory placeholder objects (names that end with '/')
      if (relPath.endsWith('/')) {
        continue;
      }

      const destPath = path.join(process.cwd(), 'public', 'images', relPath);
      ensureDir(path.dirname(destPath));
      try {
        await file.download({ destination: destPath });
        console.log('Downloaded', relPath);
      } catch (err) {
        console.error('Failed to download', relPath, err);
      }
    }

    console.log('Image fetch complete.');
  } catch (err) {
    console.error('Error fetching images from storage:', err);
    process.exitCode = 1;
  }
};

main();
