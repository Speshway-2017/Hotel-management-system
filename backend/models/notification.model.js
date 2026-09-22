import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data/notifications.json');

const notificationSchema = new mongoose.Schema({
  userId: { type: String, default: null }, // Specific recipient user
  role: { type: String, default: null }, // e.g. super-admin, admin, manager, receptionist, guest
  propertyId: { type: String, default: null }, // Property scoped
  title: { type: String, required: true },
  message: { type: String, required: true },
  category: { type: String, default: 'General' }, // Operations, Maintenance, Payments, General, approvals, security
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ role: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ propertyId: 1, isRead: 1, createdAt: -1 });

let MongooseNotification;
try {
  MongooseNotification = mongoose.model('Notification');
} catch (e) {
  MongooseNotification = mongoose.model('Notification', notificationSchema);
}

// Fallback logic for mock database
const ensureDataFile = () => {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
  }
};

const readMockData = () => {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
};

const writeMockData = (data) => {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

const matchesClause = (item, clause) => {
  return Object.keys(clause).every(key => {
    const expected = clause[key];
    const actual = item[key];

    if (expected === null) {
      return actual === null || actual === undefined;
    }
    if (expected === undefined) {
      return true;
    }
    if (key === '_id' || key === 'id') {
      const expStr = String(expected?.toString ? expected.toString() : expected);
      const actId = String(item.id || item._id || '');
      const actMongoId = String(item._id || '');
      return actId === expStr || actMongoId === expStr;
    }
    if (typeof expected === 'object' && expected !== null) {
      if (expected.$regex !== undefined) {
        const flags = expected.$options || 'i';
        const re = new RegExp(expected.$regex, flags);
        return re.test(String(actual || ''));
      }
      if (expected.$exists !== undefined) {
        const exists = actual !== undefined && actual !== null && actual !== '';
        return expected.$exists ? exists : !exists;
      }
      if (expected.$gte !== undefined) {
        return new Date(actual) >= new Date(expected.$gte);
      }
      if (expected.$lte !== undefined) {
        return new Date(actual) <= new Date(expected.$lte);
      }
      if (expected.$in !== undefined && Array.isArray(expected.$in)) {
        return expected.$in.some(val => String(val) === String(actual));
      }
      if (expected.$ne !== undefined) {
        return String(actual) !== String(expected.$ne);
      }
      return String(actual) === String(expected);
    }
    if (typeof expected === 'boolean') {
      return Boolean(actual) === expected;
    }
    return String(actual ?? '').toLowerCase() === String(expected).toLowerCase();
  });
};

const matchesQuery = (item, query = {}) => {
  for (const key of Object.keys(query)) {
    if (key === '$or') continue;
    if (!matchesClause(item, { [key]: query[key] })) {
      return false;
    }
  }
  if (query.$or && Array.isArray(query.$or) && query.$or.length > 0) {
    const orMatches = query.$or.some(clause => matchesClause(item, clause));
    if (!orMatches) return false;
  }
  return true;
};

const normalizeUpdate = (update) => {
  if (!update || typeof update !== 'object') return {};
  const cleaned = { ...update };
  if (cleaned.$set && typeof cleaned.$set === 'object') {
    Object.assign(cleaned, cleaned.$set);
    delete cleaned.$set;
  }
  return cleaned;
};

const MockNotification = {
  find: async (query = {}) => {
    let list = readMockData();
    list = list.filter(n => matchesQuery(n, query));
    return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  },
  findOne: async (query = {}) => {
    const list = readMockData();
    return list.find(n => matchesQuery(n, query)) || null;
  },
  findById: async (id) => {
    const list = readMockData();
    const idStr = String(id?.toString ? id.toString() : id);
    return list.find(n => String(n._id) === idStr || String(n.id) === idStr) || null;
  },
  create: async (data) => {
    const list = readMockData();
    const newRecord = {
      _id: Math.random().toString(36).substring(2, 15),
      id: Math.random().toString(36).substring(2, 15),
      userId: data.userId || null,
      role: data.role || null,
      propertyId: data.propertyId || null,
      title: data.title,
      message: data.message,
      category: data.category || 'General',
      isRead: data.isRead !== undefined ? Boolean(data.isRead) : false,
      createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : new Date().toISOString()
    };
    list.push(newRecord);
    writeMockData(list);
    return newRecord;
  },
  findOneAndUpdate: async (query, update, options = {}) => {
    const list = readMockData();
    const idx = list.findIndex(n => matchesQuery(n, query));
    const normalized = normalizeUpdate(update);
    if (idx === -1) {
      if (options.upsert) {
        return await MockNotification.create({ ...query, ...normalized });
      }
      return null;
    }
    const record = list[idx];
    const updatedRecord = { ...record, ...normalized, updatedAt: new Date().toISOString() };
    list[idx] = updatedRecord;
    writeMockData(list);
    return updatedRecord;
  },
  findByIdAndUpdate: async (id, update, options = {}) => {
    const list = readMockData();
    const idStr = String(id?.toString ? id.toString() : id);
    const idx = list.findIndex(n => String(n._id) === idStr || String(n.id) === idStr);
    if (idx === -1) return null;
    
    const record = list[idx];
    const normalized = normalizeUpdate(update);
    const updatedRecord = { ...record, ...normalized, updatedAt: new Date().toISOString() };
    list[idx] = updatedRecord;
    writeMockData(list);
    return updatedRecord;
  },
  updateOne: async (query, update) => {
    const list = readMockData();
    const idx = list.findIndex(n => matchesQuery(n, query));
    if (idx === -1) return { modifiedCount: 0, acknowledged: true };
    const normalized = normalizeUpdate(update);
    list[idx] = { ...list[idx], ...normalized, updatedAt: new Date().toISOString() };
    writeMockData(list);
    return { modifiedCount: 1, acknowledged: true };
  },
  findByIdAndDelete: async (id) => {
    const list = readMockData();
    const idStr = String(id?.toString ? id.toString() : id);
    const idx = list.findIndex(n => String(n._id) === idStr || String(n.id) === idStr);
    if (idx === -1) return null;
    const removed = list.splice(idx, 1);
    writeMockData(list);
    return removed[0];
  },
  deleteOne: async (query) => {
    const list = readMockData();
    const idx = list.findIndex(n => matchesQuery(n, query));
    if (idx === -1) return { deletedCount: 0, acknowledged: true };
    list.splice(idx, 1);
    writeMockData(list);
    return { deletedCount: 1, acknowledged: true };
  },
  deleteMany: async (query) => {
    const list = readMockData();
    const initialLen = list.length;
    const remaining = list.filter(n => !matchesQuery(n, query));
    writeMockData(remaining);
    return { deletedCount: initialLen - remaining.length, acknowledged: true };
  },
  updateMany: async (filter, update) => {
    const list = readMockData();
    let updatedCount = 0;
    const normalized = normalizeUpdate(update);
    const newList = list.map(n => {
      if (matchesQuery(n, filter)) {
        updatedCount++;
        return { ...n, ...normalized, updatedAt: new Date().toISOString() };
      }
      return n;
    });
    writeMockData(newList);
    return { modifiedCount: updatedCount, acknowledged: true };
  },
  countDocuments: async (query = {}) => {
    const list = readMockData();
    return list.filter(n => matchesQuery(n, query)).length;
  }
};

class QueryWrapper {
  constructor(executor) {
    this.executor = executor;
    this.selectFields = [];
    this.sortFields = null;
    this.limitCount = null;
    this.isLean = false;
  }
  select(fields) { this.selectFields.push(fields); return this; }
  sort(fields) { this.sortFields = fields; return this; }
  limit(n) { this.limitCount = n; return this; }
  lean() { this.isLean = true; return this; }
  populate() { return this; }
  async then(onFulfilled, onRejected) {
    try {
      let result;
      if (mongoose.connection.readyState === 1) {
        let query = this.executor(true);
        for (const fields of this.selectFields) {
          query = query.select(fields);
        }
        if (this.sortFields) {
          query = query.sort(this.sortFields);
        }
        if (this.limitCount) {
          query = query.limit(this.limitCount);
        }
        if (this.isLean) {
          query = query.lean();
        }
        result = await query;
      } else {
        result = await this.executor(false);
        if (this.limitCount && Array.isArray(result)) {
          result = result.slice(0, this.limitCount);
        }
      }
      return onFulfilled ? onFulfilled(result) : result;
    } catch (err) {
      if (onRejected) return onRejected(err);
      throw err;
    }
  }
  async catch(onRejected) {
    return this.then(undefined, onRejected);
  }
  async finally(onFinally) {
    return this.then(
      async (val) => {
        if (onFinally) await onFinally();
        return val;
      },
      async (err) => {
        if (onFinally) await onFinally();
        throw err;
      }
    );
  }
}

const Notification = {
  find: (query) => {
    return new QueryWrapper((isMongoose) => {
      if (isMongoose) return MongooseNotification.find(query);
      return MockNotification.find(query);
    });
  },
  findOne: (query) => {
    return new QueryWrapper((isMongoose) => {
      if (isMongoose) return MongooseNotification.findOne(query);
      return MockNotification.findOne(query);
    });
  },
  findById: (id) => {
    return new QueryWrapper((isMongoose) => {
      if (isMongoose) return MongooseNotification.findById(id);
      return MockNotification.findById(id);
    });
  },
  findOneAndUpdate: async (query, update, options = { new: true }) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseNotification.findOneAndUpdate(query, update, { new: true, ...options });
    }
    return await MockNotification.findOneAndUpdate(query, update, options);
  },
  findByIdAndUpdate: async (id, update, options = { new: true }) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseNotification.findByIdAndUpdate(id, update, { new: true, ...options });
    }
    return await MockNotification.findByIdAndUpdate(id, update, options);
  },
  updateOne: async (query, update) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseNotification.updateOne(query, update);
    }
    return await MockNotification.updateOne(query, update);
  },
  updateMany: async (filter, update) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseNotification.updateMany(filter, update);
    }
    return await MockNotification.updateMany(filter, update);
  },
  create: async (data) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseNotification.create(data);
    }
    return await MockNotification.create(data);
  },
  insertMany: async (items) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseNotification.insertMany(items);
    }
    const created = [];
    for (const it of items) {
      created.push(await MockNotification.create(it));
    }
    return created;
  },
  findByIdAndDelete: async (id) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseNotification.findByIdAndDelete(id);
    }
    return await MockNotification.findByIdAndDelete(id);
  },
  deleteOne: async (filter) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseNotification.deleteOne(filter);
    }
    return await MockNotification.deleteOne(filter);
  },
  deleteMany: async (filter) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseNotification.deleteMany(filter);
    }
    return await MockNotification.deleteMany(filter);
  },
  countDocuments: async (query = {}) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseNotification.countDocuments(query);
    }
    return await MockNotification.countDocuments(query);
  }
};

export default Notification;
