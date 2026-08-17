import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data/properties.json');

const propertySchema = new mongoose.Schema({
  _id: { type: String },
  name: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  rooms: { type: Number, required: true, default: 0 },
  occupancy: { type: Number, default: 0 },
  adr: { type: Number, default: 0 },
  revpar: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Suspended', 'Pending', 'Onboarding', 'Rejected'], default: 'Onboarding' },
  gm: { type: String, trim: true },
  assignedAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  subscriptionTier: { type: String, enum: ['Basic', 'Premium', 'Enterprise', 'None'], default: 'None' },
  subscriptionStatus: { type: String, enum: ['Active', 'Unpaid', 'Expired', 'None'], default: 'None' },
  subscriptionExpiry: { type: Date }
}, {
  timestamps: true
});

let MongooseProperty;
try {
  MongooseProperty = mongoose.model('Property');
} catch (e) {
  MongooseProperty = mongoose.model('Property', propertySchema);
}

const ensureDataFile = () => {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const defaultProperties = [
      {
        id: "HS-JAI",
        _id: "HS-JAI",
        name: "Hour Stay Rambagh Residency",
        city: "Madhapur,Hyderabad",
        rooms: 128,
        occupancy: 84,
        adr: 11400,
        revpar: 9576,
        status: "Active",
        gm: "Vikram Rathore",
        subscriptionTier: "Premium",
        subscriptionStatus: "Active",
        subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "HS-UDA",
        _id: "HS-UDA",
        name: "Hour Stay Lake Palace View",
        city: "Udaipur, Rajasthan",
        rooms: 96,
        occupancy: 91,
        adr: 16800,
        revpar: 15288,
        status: "Active",
        gm: "Meera Nair",
        subscriptionTier: "Premium",
        subscriptionStatus: "Active",
        subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "HS-GOA",
        _id: "HS-GOA",
        name: "Hour Stay Candolim Beach Resort",
        city: "Candolim, Goa",
        rooms: 142,
        occupancy: 76,
        adr: 13250,
        revpar: 10070,
        status: "Active",
        gm: "Joaquim Fernandes",
        subscriptionTier: "Basic",
        subscriptionStatus: "Active",
        subscriptionExpiry: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "HS-KER",
        _id: "HS-KER",
        name: "Hour Stay Backwater Retreat",
        city: "Alleppey, Kerala",
        rooms: 64,
        occupancy: 68,
        adr: 9800,
        revpar: 6664,
        status: "Active",
        gm: "Anand Pillai",
        subscriptionTier: "Basic",
        subscriptionStatus: "Active",
        subscriptionExpiry: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "HS-DEL",
        _id: "HS-DEL",
        name: "Hour Stay Aerocity",
        city: "New Delhi",
        rooms: 210,
        occupancy: 88,
        adr: 10250,
        revpar: 9020,
        status: "Onboarding",
        gm: "Sanjana Kapoor",
        subscriptionTier: "Enterprise",
        subscriptionStatus: "Active",
        subscriptionExpiry: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "HS-MUM",
        _id: "HS-MUM",
        name: "Hour Stay Marine Drive",
        city: "Mumbai, Maharashtra",
        rooms: 156,
        occupancy: 82,
        adr: 14600,
        revpar: 11972,
        status: "Active",
        gm: "Rehan Shaikh",
        subscriptionTier: "Enterprise",
        subscriptionStatus: "Active",
        subscriptionExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultProperties, null, 2));
  }
};

const readProperties = () => {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
};

const writeProperties = (properties) => {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(properties, null, 2));
};

class PropertyInstance {
  constructor(data) {
    Object.assign(this, data);
    const cleanId = data.id || data._id;
    this.id = cleanId;
    this._id = cleanId;
  }

  async save() {
    const properties = readProperties();
    const cleanId = this.id || this._id || Math.random().toString(36).substring(2, 15);
    this.id = cleanId;
    this._id = cleanId;
    const index = properties.findIndex(p => p.id === cleanId);
    
    this.updatedAt = new Date().toISOString();
    if (!this.createdAt) this.createdAt = new Date().toISOString();

    const record = { ...this };
    if (index !== -1) {
      properties[index] = record;
    } else {
      properties.push(record);
    }
    writeProperties(properties);
    return this;
  }
}

const MockProperty = {
  find: async (query = {}) => {
    const list = readProperties();
    let filtered = list;
    if (query.status) {
      filtered = filtered.filter(p => p.status === query.status);
    }
    if (query.city) {
      filtered = filtered.filter(p => p.city.toLowerCase().includes(query.city.toLowerCase()));
    }
    return filtered.map(p => new PropertyInstance(p));
  },
  findOne: async (query) => {
    const list = readProperties();
    const p = list.find(item => {
      const qId = query._id || query.id;
      if (qId) return item.id === qId || item._id === qId;
      return false;
    });
    return p ? new PropertyInstance(p) : null;
  },
  findById: async (id) => {
    const list = readProperties();
    const p = list.find(item => item.id === id || item._id === id);
    return p ? new PropertyInstance(p) : null;
  },
  create: async (data) => {
    const list = readProperties();
    const id = "HS-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    const newProp = {
      id: id,
      _id: id,
      name: data.name,
      city: data.city,
      rooms: Number(data.rooms) || 0,
      occupancy: Number(data.occupancy) || 0,
      adr: Number(data.adr) || 0,
      revpar: Number(data.revpar) || 0,
      status: data.status || 'Onboarding',
      gm: data.gm || '—',
      assignedAdmin: data.assignedAdmin || null,
      subscriptionTier: data.subscriptionTier || 'None',
      subscriptionStatus: data.subscriptionStatus || 'None',
      subscriptionExpiry: data.subscriptionExpiry || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    list.push(newProp);
    writeProperties(list);
    return new PropertyInstance(newProp);
  },
  findByIdAndUpdate: async (id, update, options = {}) => {
    const list = readProperties();
    const idx = list.findIndex(p => p.id === id || p._id === id);
    if (idx === -1) return null;

    const current = list[idx];
    const updated = {
      ...current,
      ...update,
      updatedAt: new Date().toISOString()
    };

    if (update.rooms !== undefined) updated.rooms = Number(update.rooms);
    if (update.occupancy !== undefined) updated.occupancy = Number(update.occupancy);
    if (update.adr !== undefined) updated.adr = Number(update.adr);
    if (update.revpar !== undefined) updated.revpar = Number(update.revpar);

    list[idx] = updated;
    writeProperties(list);
    return new PropertyInstance(updated);
  },
  findByIdAndDelete: async (id) => {
    const list = readProperties();
    const idx = list.findIndex(p => p.id === id || p._id === id);
    if (idx === -1) return null;
    const removed = list.splice(idx, 1)[0];
    writeProperties(list);
    return new PropertyInstance(removed);
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

  populate(path) {
    this.populatePath = path;
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
        if (this.populatePath) {
          query = query.populate(this.populatePath);
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

const Property = {
  find: (query) => {
    return new QueryWrapper((isMongoose) => {
      if (isMongoose) return MongooseProperty.find(query);
      return MockProperty.find(query);
    });
  },
  findOne: (query) => {
    return new QueryWrapper((isMongoose) => {
      if (isMongoose) return MongooseProperty.findOne(query);
      return MockProperty.findOne(query);
    });
  },
  findById: (id) => {
    return new QueryWrapper((isMongoose) => {
      if (isMongoose) return MongooseProperty.findById(id);
      return MockProperty.findById(id);
    });
  },
  create: async (data) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseProperty.create(data);
    }
    return await MockProperty.create(data);
  },
  findByIdAndUpdate: async (id, update, options) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseProperty.findByIdAndUpdate(id, update, { new: true, ...options });
    }
    return await MockProperty.findByIdAndUpdate(id, update, options);
  },
  findByIdAndDelete: async (id) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseProperty.findByIdAndDelete(id);
    }
    return await MockProperty.findByIdAndDelete(id);
  }
};

export default Property;
