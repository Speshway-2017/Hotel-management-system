import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EVENTS_FILE = path.join(__dirname, '../data/security_events.json');
const BLOCKS_FILE = path.join(__dirname, '../data/blocked_entities.json');

const securityEventSchema = new mongoose.Schema({
  type: { type: String, required: true, index: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },
  userId: { type: String, default: null },
  userEmail: { type: String, default: '' },
  role: { type: String, default: '' },
  propertyId: { type: String, default: null },
  ip: { type: String, default: '' },
  method: { type: String, default: '' },
  path: { type: String, default: '' },
  details: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

securityEventSchema.index({ createdAt: -1 });

const blockedEntitySchema = new mongoose.Schema({
  entityType: { type: String, enum: ['ip', 'email', 'userId'], required: true, index: true },
  entityValue: { type: String, required: true, index: true },
  reason: { type: String, required: true },
  blockedUntil: { type: Date, required: true, index: true },
  attempts: { type: Number, default: 1 },
  unblockedAt: { type: Date, default: null },
  unblockedBy: { type: String, default: '' }
}, {
  timestamps: true
});

let MongooseSecurityEvent;
let MongooseBlockedEntity;
try {
  MongooseSecurityEvent = mongoose.model('SecurityEvent');
} catch {
  MongooseSecurityEvent = mongoose.model('SecurityEvent', securityEventSchema);
}
try {
  MongooseBlockedEntity = mongoose.model('BlockedEntity');
} catch {
  MongooseBlockedEntity = mongoose.model('BlockedEntity', blockedEntitySchema);
}

const ensureFile = (filePath) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]');
};

const readJson = (filePath) => {
  ensureFile(filePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
};

const writeJson = (filePath, rows) => {
  ensureFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(rows.slice(-500), null, 2));
};

export const SecurityEvent = {
  create: async (data) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseSecurityEvent.create(data);
    }
    const rows = readJson(EVENTS_FILE);
    const rec = {
      ...data,
      _id: `SEC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString()
    };
    rows.push(rec);
    writeJson(EVENTS_FILE, rows);
    return rec;
  },
  find: async (query = {}, limit = 100) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseSecurityEvent.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    }
    const rows = readJson(EVENTS_FILE);
    return rows
      .filter((r) => {
        if (query.severity && r.severity !== query.severity) return false;
        if (query.type && r.type !== query.type) return false;
        return true;
      })
      .reverse()
      .slice(0, limit);
  }
};

export const BlockedEntity = {
  findActive: async (entityType, entityValue) => {
    const now = new Date();
    const cleanVal = String(entityValue || '').toLowerCase().trim();
    if (!cleanVal) return null;
    if (mongoose.connection.readyState === 1) {
      return await MongooseBlockedEntity.findOne({
        entityType,
        entityValue: cleanVal,
        unblockedAt: null,
        blockedUntil: { $gt: now }
      }).lean();
    }
    const rows = readJson(BLOCKS_FILE);
    return rows.find(
      (b) =>
        b.entityType === entityType &&
        b.entityValue === cleanVal &&
        !b.unblockedAt &&
        new Date(b.blockedUntil) > now
    ) || null;
  },
  listActive: async () => {
    const now = new Date();
    if (mongoose.connection.readyState === 1) {
      return await MongooseBlockedEntity.find({
        unblockedAt: null,
        blockedUntil: { $gt: now }
      }).sort({ createdAt: -1 }).lean();
    }
    const rows = readJson(BLOCKS_FILE);
    return rows.filter((b) => !b.unblockedAt && new Date(b.blockedUntil) > now).reverse();
  },
  block: async ({ entityType, entityValue, reason, durationMs = 15 * 60 * 1000, attempts = 1 }) => {
    const cleanVal = String(entityValue || '').toLowerCase().trim();
    if (!cleanVal) return null;
    const blockedUntil = new Date(Date.now() + durationMs);
    if (mongoose.connection.readyState === 1) {
      return await MongooseBlockedEntity.findOneAndUpdate(
        { entityType, entityValue: cleanVal, unblockedAt: null },
        { $set: { reason, blockedUntil, attempts } },
        { upsert: true, new: true }
      );
    }
    const rows = readJson(BLOCKS_FILE);
    const idx = rows.findIndex((b) => b.entityType === entityType && b.entityValue === cleanVal && !b.unblockedAt);
    const rec = {
      _id: `BLK-${Date.now()}`,
      entityType,
      entityValue: cleanVal,
      reason,
      blockedUntil: blockedUntil.toISOString(),
      attempts,
      unblockedAt: null,
      createdAt: new Date().toISOString()
    };
    if (idx !== -1) rows[idx] = { ...rows[idx], ...rec };
    else rows.push(rec);
    writeJson(BLOCKS_FILE, rows);
    return rec;
  },
  unblock: async ({ entityType, entityValue, unblockedBy = 'super-admin' }) => {
    const cleanVal = String(entityValue || '').toLowerCase().trim();
    const now = new Date();
    if (mongoose.connection.readyState === 1) {
      return await MongooseBlockedEntity.updateMany(
        { entityType, entityValue: cleanVal, unblockedAt: null },
        { $set: { unblockedAt: now, unblockedBy } }
      );
    }
    const rows = readJson(BLOCKS_FILE);
    let count = 0;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].entityType === entityType && rows[i].entityValue === cleanVal && !rows[i].unblockedAt) {
        rows[i].unblockedAt = now.toISOString();
        rows[i].unblockedBy = unblockedBy;
        count++;
      }
    }
    writeJson(BLOCKS_FILE, rows);
    return { modifiedCount: count };
  }
};

