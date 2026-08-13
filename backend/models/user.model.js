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
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super-admin', 'admin', 'manager', 'receptionist', 'guest'], default: 'guest' },
  mobile: { type: String, trim: true },
  propertyId: { type: String, default: null },
  status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
  otp: { type: String },
  otpExpires: { type: Date }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
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
      if (query.email && query.otp) {
        return u.email === query.email.toLowerCase() && u.otp === query.otp && new Date(u.otpExpires) > new Date();
      }
      if (query.email) {
        return u.email === query.email.toLowerCase();
      }
      const queryId = query._id || query.id;
      if (queryId) {
        return u.id === queryId || u._id === queryId;
      }
      return false;
    });
    return user ? new UserInstance(user) : null;
  },
  findById: async (id) => {
    const users = readUsers();
    const user = users.find(u => u.id === id || u._id === id);
    return user ? new UserInstance(user) : null;
  },
  create: async (data) => {
    const users = readUsers();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);
    const id = Math.random().toString(36).substring(2, 15);
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users.push(newUser);
    writeUsers(users);
    return new UserInstance(newUser);
  },
  findByIdAndUpdate: async (id, update, options = {}) => {
    const list = readUsers();
    const idx = list.findIndex(u => u.id === id || u._id === id);
    if (idx === -1) return null;
    const current = list[idx];
    const updated = {
      ...current,
      ...update,
      updatedAt: new Date().toISOString()
    };
    list[idx] = updated;
    writeUsers(list);
    return new UserInstance(updated);
  },
  findByIdAndDelete: async (id) => {
    const list = readUsers();
    const idx = list.findIndex(u => u.id === id || u._id === id);
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
        return MongooseUser.findById(id);
      }
      return MockUser.findById(id);
    });
  },
  create: async (...args) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseUser.create(...args);
    }
    return await MockUser.create(...args);
  },
  findByIdAndUpdate: async (id, update, options) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseUser.findByIdAndUpdate(id, update, { new: true, ...options });
    }
    return await MockUser.findByIdAndUpdate(id, update, options);
  },
  findByIdAndDelete: async (id) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseUser.findByIdAndDelete(id);
    }
    return await MockUser.findByIdAndDelete(id);
  }
};

export default User;
