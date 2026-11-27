import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data/sessions.json');

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  role: { type: String, required: true },
  propertyId: { type: String, default: null },
  tokenFamilyId: { type: String, required: true, index: true },
  refreshTokenHash: { type: String, required: true, index: true },
  previousRefreshTokenHash: { type: String, default: null, index: true },
  currentAccessJti: { type: String, default: null },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  platform: { type: String, default: 'web' },
  lastUsedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  revokedAt: { type: Date, default: null },
  revokedReason: { type: String, default: '' }
}, {
  timestamps: true
});

let MongooseSession;
try {
  MongooseSession = mongoose.model('Session');
} catch {
  MongooseSession = mongoose.model('Session', sessionSchema);
}

// In-memory revoked access JTI cache (jti -> expMs) for instant stateless access token checks
const revokedAccessJtis = new Map();

export const markAccessJtiRevoked = (jti, expMs) => {
  if (!jti) return;
  revokedAccessJtis.set(String(jti), Number(expMs) || Date.now() + 3600000);
  if (revokedAccessJtis.size > 5000) {
    const now = Date.now();
    for (const [k, exp] of revokedAccessJtis.entries()) {
      if (exp < now) revokedAccessJtis.delete(k);
    }
  }
};

export const isAccessJtiRevoked = (jti) => {
  if (!jti) return false;
  const exp = revokedAccessJtis.get(String(jti));
  if (!exp) return false;
  if (exp < Date.now()) {
    revokedAccessJtis.delete(String(jti));
    return false;
  }
  return true;
};

const ensureFile = () => {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
};

const readJson = () => {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
};

const writeJson = (rows) => {
  ensureFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(rows, null, 2));
};

const matchesQuery = (doc, query = {}) => {
  for (const [k, v] of Object.entries(query)) {
    if (k === '$or' && Array.isArray(v)) {
      if (!v.some((sub) => matchesQuery(doc, sub))) return false;
      continue;
    }
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('$gt' in v && !(new Date(doc[k]) > new Date(v.$gt))) return false;
      if ('$lt' in v && !(new Date(doc[k]) < new Date(v.$lt))) return false;
      if ('$in' in v && !v.$in.includes(doc[k])) return false;
      continue;
    }
    if (v === null) {
      if (doc[k] !== null && doc[k] !== undefined) return false;
    } else if (String(doc[k] ?? '') !== String(v)) {
      return false;
    }
  }
  return true;
};

const Session = {
  create: async (data) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseSession.create(data);
    }
    const rows = readJson();
    const record = {
      ...data,
      _id: data.sessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    rows.push(record);
    writeJson(rows);
    return record;
  },
  findOne: async (query) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseSession.findOne(query);
    }
    const rows = readJson();
    return rows.find((r) => matchesQuery(r, query)) || null;
  },
  find: async (query = {}) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseSession.find(query).sort({ lastUsedAt: -1 }).lean();
    }
    const rows = readJson();
    return rows.filter((r) => matchesQuery(r, query)).reverse();
  },
  findOneAndUpdate: async (query, update, options = {}) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseSession.findOneAndUpdate(query, update, { new: true, ...options });
    }
    const rows = readJson();
    const idx = rows.findIndex((r) => matchesQuery(r, query));
    if (idx === -1) return null;
    const patch = update.$set ? { ...update.$set } : { ...update };
    rows[idx] = { ...rows[idx], ...patch, updatedAt: new Date().toISOString() };
    writeJson(rows);
    return rows[idx];
  },
  updateMany: async (query, update) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseSession.updateMany(query, update);
    }
    const rows = readJson();
    const patch = update.$set ? { ...update.$set } : { ...update };
    let count = 0;
    for (let i = 0; i < rows.length; i++) {
      if (matchesQuery(rows[i], query)) {
        rows[i] = { ...rows[i], ...patch, updatedAt: new Date().toISOString() };
        count++;
      }
    }
    if (count > 0) writeJson(rows);
    return { modifiedCount: count };
  }
};

export default Session;

