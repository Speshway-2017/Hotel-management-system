import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data/users.json');

// Mongoose User Schema
const userSchema = new mongoose.Schema({
  _id: { type: String, default: () => Math.random().toString(36).substring(2, 15) },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super-admin', 'admin', 'manager', 'receptionist', 'guest'], default: 'guest' },
  mobile: { type: String, trim: true },
  propertyId: { type: String, default: null },
  status: { type: String, enum: ['Active', 'Suspended', 'Inactive'], default: 'Active' },
  dept: { type: String, default: "Front Desk" },
  shift: { type: String, default: "Morning (06:00 - 14:00)" },
  avatar: { type: String, default: null },
  otp: { type: String },
  otpExpires: { type: Date },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  country: { type: String, trim: true, default: "India" },
  address: { type: String, trim: true },
  type: { type: String, default: "Regular" },
  preferences: { type: String, trim: true },
  idDocType: { type: String, default: "Aadhaar Card" },
  idDocNumber: { type: String, trim: true },
  idProofType: { type: String, default: "Aadhaar Card" },
  idProofNumber: { type: String, trim: true },
  verifiedAadhaar: { type: String, trim: true },
  verifiedAadhaarLast4: { type: String, trim: true },
  isAadhaarVerified: { type: Boolean, default: false },
  aadhaarVerifiedAt: { type: Date },
  loyaltyPoints: { type: Number, default: 0 },
  notificationSettings: {
    emailConfirmations: { type: Boolean, default: true },
    smsAlerts: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    promotionalOffers: { type: Boolean, default: false },
    checkInReminders: { type: Boolean, default: true }
  },
  appPreferences: {
    currency: { type: String, default: 'INR (₹)' },
    language: { type: String, default: 'English (IN)' },
    theme: { type: String, default: 'System' },
    biometricLogin: { type: Boolean, default: false },
    hapticFeedback: { type: Boolean, default: true }
  },
  securitySettings: {
    twoFactorAuth: { type: Boolean, default: false },
    lastPasswordChange: { type: Date }
  },
  notes: { type: String, trim: true },
  fcmToken: { type: String, default: null },
  fcmTokens: [{ type: String }]
}, {
  timestamps: true
});

userSchema.index({ role: 1, propertyId: 1 });
userSchema.index({ propertyId: 1 });
userSchema.index({ mobile: 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Clean registration model checks
let MongooseUser;
try {
  MongooseUser = mongoose.model('User');
} catch (e) {
  MongooseUser = mongoose.model('User', userSchema);
}

// File-based Mock Implementation
const ensureDataFile = () => {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
};

const readUsers = () => {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
};

const writeUsers = (users) => {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
};

class UserInstance {
  constructor(data) {
    Object.assign(this, data);
    const cleanId = data.id || data._id;
    this.id = cleanId;
    this._id = cleanId;
  }
  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }
  async save() {
    const users = readUsers();
    const cleanId = this.id || this._id;
    const index = users.findIndex(u => u.id === cleanId || u.email === this.email);
    this.updatedAt = new Date().toISOString();
    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    const updatedUser = {
      ...this,
      id: cleanId,
      _id: cleanId
    };
    if (index !== -1) {
      users[index] = updatedUser;
    } else {
      users.push(updatedUser);
    }
    writeUsers(users);
    return this;
  }
}

const MockUser = {
  find: async (query = {}) => {
    let list = readUsers();
    if (query.$or) {
      list = list.filter(u => query.$or.some(q => {
        if (q._id && (String(u._id) === String(q._id) || String(u.id) === String(q._id))) return true;
        if (q.id && (String(u.id) === String(q.id) || String(u._id) === String(q.id))) return true;
        if (q.email && u.email && u.email.toLowerCase() === String(q.email).toLowerCase()) return true;
        if (q.role && u.role === q.role) return true;
        if (q.propertyId && u.propertyId === q.propertyId) return true;
        return false;
      }));
    }
    if (query.role) {
      list = list.filter(u => u.role === query.role);
    }
    if (query.propertyId) {
      list = list.filter(u => u.propertyId === query.propertyId);
    }
    return list.map(u => new UserInstance(u));
  },
  findOne: async (query) => {
    const users = readUsers();
    const user = users.find(u => {
      if (query.$or) {
        return query.$or.some(q => {
          if (q._id && (String(u._id) === String(q._id) || String(u.id) === String(q._id))) return true;
          if (q.id && (String(u.id) === String(q.id) || String(u._id) === String(q.id))) return true;
          if (q.email && u.email && u.email.toLowerCase() === String(q.email).toLowerCase()) return true;
          if (q.name && u.name && u.name.toLowerCase() === String(q.name).toLowerCase()) return true;
          return false;
        });
      }
      if (query.email && query.otp) {
        return u.email === query.email.toLowerCase() && u.otp === query.otp && new Date(u.otpExpires) > new Date();
      }
      if (query.email) {
        return u.email === query.email.toLowerCase();
      }
      const queryId = query._id || query.id;
      if (queryId) {
        return String(u.id) === String(queryId) || String(u._id) === String(queryId);
      }
      return false;
    });
    return user ? new UserInstance(user) : null;
  },
  findById: async (id) => {
    const users = readUsers();
    const user = users.find(u => String(u.id) === String(id) || String(u._id) === String(id));
    return user ? new UserInstance(user) : null;
  },
  create: async (data) => {
    const users = readUsers();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);
    const id = data._id || data.id || Math.random().toString(36).substring(2, 15);
    const newUser = {
      id: id,
      _id: id,
      name: data.name,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      role: data.role || 'guest',
      mobile: data.mobile,
      propertyId: data.propertyId || null,
      status: data.status || 'Active',
      dept: data.dept || 'Front Desk',
      shift: data.shift || 'Morning (06:00 - 14:00)',
      avatar: data.avatar || null,
      city: data.city || '',
      state: data.state || '',
      country: data.country || 'India',
      address: data.address || '',
      type: data.type || 'Regular',
      preferences: data.preferences || '',
      idDocType: data.idDocType || 'Aadhaar Card',
      idDocNumber: data.idDocNumber || '',
      loyaltyPoints: Number(data.loyaltyPoints) || 0,
      notes: data.notes || '',
      fcmToken: data.fcmToken || null,
      fcmTokens: Array.isArray(data.fcmTokens) ? data.fcmTokens : (data.fcmToken ? [data.fcmToken] : []),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users.push(newUser);
    writeUsers(users);
    return new UserInstance(newUser);
  },
  findByIdAndUpdate: async (id, update, options = {}) => {
    return MockUser.findOneAndUpdate({ _id: id }, update, options);
  },
  findByIdAndDelete: async (id) => {
    const list = readUsers();
    const idx = list.findIndex(u => String(u.id) === String(id) || String(u._id) === String(id));
    if (idx === -1) return null;
    const removed = list.splice(idx, 1)[0];
    writeUsers(list);
    return new UserInstance(removed);
  },
  findOneAndUpdate: async (query, update, options = {}) => {
    const list = readUsers();
    let idx = -1;
    if (query.$or) {
      idx = list.findIndex(u => query.$or.some(q => {
        if (q._id && (String(u._id) === String(q._id) || String(u.id) === String(q._id))) return true;
        if (q.id && (String(u.id) === String(q.id) || String(u._id) === String(q.id))) return true;
        if (q.email && u.email && u.email.toLowerCase() === String(q.email).toLowerCase()) return true;
        if (q.name && u.name && u.name.toLowerCase() === String(q.name).toLowerCase()) return true;
        return false;
      }));
    } else {
      idx = list.findIndex(u => {
        if (query.email && u.email === query.email.toLowerCase()) return true;
        const qId = query._id || query.id;
        if (qId && (String(u.id) === String(qId) || String(u._id) === String(qId))) return true;
        return false;
      });
    }
    if (idx === -1) return null;
    const current = list[idx];
    let updateFields = { ...update };
    if (update.$addToSet) {
      for (const key of Object.keys(update.$addToSet)) {
        const val = update.$addToSet[key];
        const existing = Array.isArray(current[key]) ? current[key] : [];
        if (!existing.includes(val)) {
          updateFields[key] = [...existing, val];
        }
      }
      delete updateFields.$addToSet;
    }
    if (update.$pull) {
      for (const key of Object.keys(update.$pull)) {
        const val = update.$pull[key];
        const existing = Array.isArray(current[key]) ? current[key] : [];
        updateFields[key] = existing.filter(item => item !== val);
      }
      delete updateFields.$pull;
    }
    if (update.$set) {
      Object.assign(updateFields, update.$set);
      delete updateFields.$set;
    }
    const updated = {
      ...current,
      ...updateFields,
      updatedAt: new Date().toISOString()
    };
    list[idx] = updated;
    writeUsers(list);
    return new UserInstance(updated);
  },
  findOneAndDelete: async (query) => {
    const list = readUsers();
    let idx = -1;
    if (query.$or) {
      idx = list.findIndex(u => query.$or.some(q => {
        if (q._id && (String(u._id) === String(q._id) || String(u.id) === String(q._id))) return true;
        if (q.id && (String(u.id) === String(q.id) || String(u._id) === String(q.id))) return true;
        if (q.email && u.email && u.email.toLowerCase() === String(q.email).toLowerCase()) return true;
        return false;
      }));
    } else {
      idx = list.findIndex(u => {
        if (query.email && u.email === query.email.toLowerCase()) return true;
        const qId = query._id || query.id;
        if (qId && (String(u.id) === String(qId) || String(u._id) === String(qId))) return true;
        return false;
      });
    }
    if (idx === -1) return null;
    const removed = list.splice(idx, 1)[0];
    writeUsers(list);
    return new UserInstance(removed);
  }
};

class QueryWrapper {
  constructor(executor) {
    this.executor = executor;
    this.selectFields = [];
  }

  select(fields) {
    this.selectFields.push(fields);
    return this;
  }

  lean() {
    return this;
  }

  populate() {
    return this;
  }

  async then(onFulfilled, onRejected) {
    try {
      let result;
      if (mongoose.connection.readyState === 1) {
        let query = this.executor(true);
        for (const fields of this.selectFields) {
          query = query.select(fields);
        }
        result = await query;
        if (!result) {
          result = await this.executor(false);
        }
      } else {
        result = await this.executor(false);
      }
      return onFulfilled ? onFulfilled(result) : result;
    } catch (err) {
      if (onRejected) {
        return onRejected(err);
      }
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

// Dynamic Router for User model
const User = {
  find: (query) => {
    return new QueryWrapper((isMongoose) => {
      if (isMongoose) {
        return MongooseUser.find(query);
      }
      return MockUser.find(query);
    });
  },
  findOne: (query) => {
    return new QueryWrapper((isMongoose) => {
      if (isMongoose) {
        return MongooseUser.findOne(query);
      }
      return MockUser.findOne(query);
    });
  },
  findById: (id) => {
    return new QueryWrapper((isMongoose) => {
      if (isMongoose) {
        return MongooseUser.findOne({ $or: [{ _id: String(id) }, { _id: id }, { id: String(id) }] });
      }
      return MockUser.findById(id);
    });
  },
  create: async (...args) => {
    if (mongoose.connection.readyState === 1) {
      const created = await MongooseUser.create(...args);
      try {
        const instance = new UserInstance({
          id: created._id.toString(),
          _id: created._id.toString(),
          name: created.name,
          email: created.email,
          password: created.password,
          role: created.role,
          mobile: created.mobile,
          propertyId: created.propertyId || null,
          status: created.status || 'Active',
          dept: created.dept || 'Front Desk',
          shift: created.shift || 'Morning (06:00 - 14:00)',
          avatar: created.avatar || null,
          city: created.city || '',
          state: created.state || '',
          country: created.country || 'India',
          address: created.address || '',
          type: created.type || 'Regular',
          preferences: created.preferences || '',
          idDocType: created.idDocType || 'Aadhaar Card',
          idDocNumber: created.idDocNumber || '',
          loyaltyPoints: created.loyaltyPoints || 0,
          notes: created.notes || '',
          fcmToken: created.fcmToken || null,
          fcmTokens: created.fcmTokens || [],
          createdAt: created.createdAt || new Date().toISOString(),
          updatedAt: created.updatedAt || new Date().toISOString()
        });
        await instance.save();
      } catch (err) {
        console.warn('Mock dual-write failed:', err.message);
      }
      return created;
    }
    return await MockUser.create(...args);
  },
  findByIdAndUpdate: async (id, update, options) => {
    return User.findOneAndUpdate({ $or: [{ _id: String(id) }, { _id: id }, { id: String(id) }] }, update, options);
  },
  findByIdAndDelete: async (id) => {
    return User.findOneAndDelete({ $or: [{ _id: String(id) }, { _id: id }, { id: String(id) }] });
  },
  findOneAndUpdate: async (query, update, options = {}) => {
    if (mongoose.connection.readyState === 1) {
      const updated = await MongooseUser.findOneAndUpdate(query, update, { new: true, ...options });
      if (updated) {
        try {
          const instance = new UserInstance({
            id: updated._id.toString(),
            _id: updated._id.toString(),
            name: updated.name,
            email: updated.email,
            password: updated.password,
            role: updated.role,
            mobile: updated.mobile,
            propertyId: updated.propertyId || null,
            status: updated.status || 'Active',
            dept: updated.dept || 'Front Desk',
            shift: updated.shift || 'Morning (06:00 - 14:00)',
            avatar: updated.avatar || null,
            city: updated.city || '',
            state: updated.state || '',
            country: updated.country || 'India',
            address: updated.address || '',
            type: updated.type || 'Regular',
            preferences: updated.preferences || '',
            idDocType: updated.idDocType || 'Aadhaar Card',
            idDocNumber: updated.idDocNumber || '',
            loyaltyPoints: updated.loyaltyPoints || 0,
            notes: updated.notes || '',
            fcmToken: updated.fcmToken || null,
            fcmTokens: updated.fcmTokens || [],
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt
          });
          await instance.save();
        } catch (err) {
          console.warn('Mock dual-write update failed:', err.message);
        }
      }
      return updated;
    }
    return await MockUser.findOneAndUpdate(query, update, options);
  },
  findOneAndDelete: async (query) => {
    if (mongoose.connection.readyState === 1) {
      const deleted = await MongooseUser.findOneAndDelete(query);
      if (deleted) {
        try {
          await MockUser.findOneAndDelete({ _id: deleted._id.toString() });
        } catch (err) {
          console.warn('Mock dual-write delete failed:', err.message);
        }
      }
      return deleted;
    }
    return await MockUser.findOneAndDelete(query);
  },
  updateOne: async (query, update, options = {}) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseUser.updateOne(query, update, options);
    }
    return await MockUser.findOneAndUpdate(query, update, options);
  },
  deleteOne: async (query) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseUser.deleteOne(query);
    }
    return await MockUser.findOneAndDelete(query);
  },
  deleteMany: async (query) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseUser.deleteMany(query);
    }
    return { acknowledged: true, deletedCount: 0 };
  }
};

export default User;
