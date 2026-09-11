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

const MockNotification = {
  find: async (query = {}) => {
    let list = readMockData();
    
    // Support MongoDB-style $or query for matching user context
    if (query.$or && Array.isArray(query.$or)) {
      list = list.filter(n => {
        return query.$or.some(clause => {
          return Object.keys(clause).every(key => {
            return String(n[key]) === String(clause[key]);
          });
        });
      });
    } else {
      if (query.userId !== undefined) {
        list = list.filter(n => n.userId === query.userId);
      }
      if (query.role !== undefined) {
        list = list.filter(n => n.role === query.role);
      }
      if (query.propertyId !== undefined) {
        list = list.filter(n => n.propertyId === query.propertyId);
      }
      if (query.isRead !== undefined) {
        list = list.filter(n => n.isRead === query.isRead);
      }
    }
    
    // Sort by createdAt descending
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  findOne: async (query = {}) => {
    const list = await MockNotification.find(query);
    return list[0] || null;
  },
  findById: async (id) => {
    const list = readMockData();
    return list.find(n => n._id === id || n.id === id) || null;
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
      isRead: data.isRead !== undefined ? data.isRead : false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    list.push(newRecord);
    writeMockData(list);
    return newRecord;
  },
  findByIdAndUpdate: async (id, update, options = {}) => {
    const list = readMockData();
    const idx = list.findIndex(n => n._id === id || n.id === id);
    if (idx === -1) return null;
    
    const record = list[idx];
    const updatedRecord = { ...record, ...update, updatedAt: new Date().toISOString() };
    list[idx] = updatedRecord;
    writeMockData(list);
    return updatedRecord;
  },
  findByIdAndDelete: async (id) => {
    const list = readMockData();
    const idx = list.findIndex(n => n._id === id || n.id === id);
    if (idx === -1) return null;
    const removed = list.splice(idx, 1);
    writeMockData(list);
    return removed[0];
  },
  updateMany: async (filter, update) => {
    const list = readMockData();
    let updatedCount = 0;
    
    // Handle $or matching or standard property criteria
    const matchFilter = (n) => {
      if (filter.$or && Array.isArray(filter.$or)) {
        return filter.$or.some(clause => {
          return Object.keys(clause).every(key => {
            return String(n[key]) === String(clause[key]);
          });
        });
      }
      if (filter.userId !== undefined && n.userId !== filter.userId) return false;
      if (filter.role !== undefined && n.role !== filter.role) return false;
      if (filter.propertyId !== undefined && n.propertyId !== filter.propertyId) return false;
      if (filter.isRead !== undefined && n.isRead !== filter.isRead) return false;
      return true;
    };

    const newList = list.map(n => {
      if (matchFilter(n)) {
        updatedCount++;
        return { ...n, ...update, updatedAt: new Date().toISOString() };
      }
      return n;
    });
    writeMockData(newList);
    return { modifiedCount: updatedCount };
  }
};

class QueryWrapper {
  constructor(executor) {
    this.executor = executor;
    this.selectFields = [];
    this.sortFields = null;
  }
  select(fields) { this.selectFields.push(fields); return this; }
  sort(fields) { this.sortFields = fields; return this; }
  lean() { return this; }
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
        result = await query;
      } else {
        result = await this.executor(false);
      }
      return onFulfilled ? onFulfilled(result) : result;
    } catch (err) {
      if (onRejected) return onRejected(err);
      throw err;
    }
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
  findByIdAndUpdate: async (id, update, options) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseNotification.findByIdAndUpdate(id, update, { new: true, ...options });
    }
    return await MockNotification.findByIdAndUpdate(id, update, options);
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
    const item = await MockNotification.findOne(filter);
    if (item && item._id) {
      return await MockNotification.findByIdAndDelete(item._id);
    }
  },
  deleteMany: async (filter) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseNotification.deleteMany(filter);
    }
  },
  countDocuments: async (query = {}) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseNotification.countDocuments(query);
    }
    const items = await MockNotification.find(query);
    return items.length;
  },
  updateMany: async (filter, update) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseNotification.updateMany(filter, update);
    }
    return await MockNotification.updateMany(filter, update);
  }
};

export default Notification;
