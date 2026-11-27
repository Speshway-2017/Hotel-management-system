import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const BACKUP_ROOT = path.join(__dirname, '../backups');
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 14);

async function runBackup() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required to run backup.');
  }

  fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(BACKUP_ROOT, `backup-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  // Prefer native mongodump if available; otherwise export safe Mongoose JSON snapshot
  let usedMongodump = false;
  try {
    await execFileAsync('mongodump', [
      `--uri=${process.env.MONGODB_URI}`,
      `--out=${outDir}`,
      '--gzip'
    ]);
    usedMongodump = true;
    console.log(`✅ mongodump completed into ${outDir}`);
  } catch {
    console.log('ℹ️ mongodump binary not found; falling back to Mongoose collection snapshot.');
  }

  if (!usedMongodump) {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hourstay_hms', serverSelectionTimeoutMS: 5000 });
    const collections = await mongoose.connection.db.listCollections().toArray();
    const manifest = [];

    for (const col of collections) {
      const docs = await mongoose.connection.db.collection(col.name).find({}).toArray();
      const targetFile = path.join(outDir, `${col.name}.json`);
      const serialized = JSON.stringify(docs, null, 2);
      fs.writeFileSync(targetFile, serialized);
      const sha256 = crypto.createHash('sha256').update(serialized).digest('hex');
      manifest.push({ collection: col.name, count: docs.length, sha256 });
    }

    fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({
      createdAt: new Date().toISOString(),
      dbName: 'hourstay_hms',
      collections: manifest
    }, null, 2));
    await mongoose.disconnect();
    console.log(`✅ Snapshot backup completed (${manifest.length} collections) into ${outDir}`);
  }

  // Enforce retention policy
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const entry of fs.readdirSync(BACKUP_ROOT)) {
    const full = path.join(BACKUP_ROOT, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory() && stat.mtimeMs < cutoff) {
      fs.rmSync(full, { recursive: true, force: true });
      console.log(`🧹 Pruned expired backup: ${entry}`);
    }
  }
}

runBackup().catch((err) => {
  console.error('❌ Backup failed:', err.message);
  process.exit(1);
});

