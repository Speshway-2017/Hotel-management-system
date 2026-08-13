import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data/cms.json');

const cmsSchema = new mongoose.Schema({
  type: { type: String, enum: ['blog', 'faq', 'about', 'feature', 'contact'], required: true },
  title: { type: String },
  slug: { type: String },
  excerpt: { type: String },
  author: { type: String },
  role: { type: String },
  date: { type: String },
  readTime: { type: String },
  tag: { type: String },
  content: { type: String },
  question: { type: String },
  answer: { type: String },
  description: { type: String },
  icon: { type: String },
  name: { type: String },
  email: { type: String },
  subject: { type: String },
  message: { type: String }
}, {
  timestamps: true
});

let MongooseCMS;
try {
  MongooseCMS = mongoose.model('CMS');
} catch (e) {
  MongooseCMS = mongoose.model('CMS', cmsSchema);
}

const ensureDataFile = () => {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const defaultCMS = [
      {
        id: "cms_b1",
        _id: "cms_b1",
        type: "blog",
        slug: "pms-simplifies-operations",
        title: "How Hotel PMS Software Simplifies Daily Operations",
        excerpt: "Discover how a unified property management system connects your reservations, housekeeping logs, and front-desk check-ins in one calm workflow.",
        author: "Meera Nair",
        role: "General Manager, Udaipur",
        date: "02 Aug 2026",
        readTime: "5 min read",
        tag: "Hotel Management"
      },
      {
        id: "cms_f1",
        _id: "cms_f1",
        type: "faq",
        question: "How do I split a guest bill?",
        answer: "Navigate to the front-desk room layout grid, click on the active room folio, select 'Split Bill', choose the split method (e.g. personal vs. corporate), and generate the split invoices."
      },
      {
        id: "cms_f2",
        _id: "cms_f2",
        type: "faq",
        question: "Does the system support GST slab billing?",
        answer: "Yes, tariff under ₹7,500 attracts 12% GST and at or above ₹7,500 tariff attracts 18% GST dynamically."
      }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultCMS, null, 2));
  }
};

const readCMS = () => {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
};

const writeCMS = (cmsList) => {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(cmsList, null, 2));
};

class CMSInstance {
  constructor(data) {
    Object.assign(this, data);
    const cleanId = data.id || data._id;
    this.id = cleanId;
    this._id = cleanId;
  }
}

const MockCMS = {
  find: async (query = {}) => {
    let list = readCMS();
    if (query.type) {
      list = list.filter(item => item.type === query.type);
    }
    return list.map(item => new CMSInstance(item));
  },
  create: async (data) => {
    const list = readCMS();
    const id = "cms_" + Math.random().toString(36).substring(2, 10);
    const newItem = {
      id: id,
      _id: id,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    list.push(newItem);
    writeCMS(list);
    return new CMSInstance(newItem);
  },
  findByIdAndUpdate: async (id, update, options = {}) => {
    const list = readCMS();
    const idx = list.findIndex(item => item.id === id || item._id === id);
    if (idx === -1) return null;
    const current = list[idx];
    const updated = {
      ...current,
      ...update,
      updatedAt: new Date().toISOString()
    };
    list[idx] = updated;
    writeCMS(list);
    return new CMSInstance(updated);
  },
  findByIdAndDelete: async (id) => {
    const list = readCMS();
    const idx = list.findIndex(item => item.id === id || item._id === id);
    if (idx === -1) return null;
    const removed = list.splice(idx, 1)[0];
    writeCMS(list);
    return new CMSInstance(removed);
  }
};

const CMS = {
  find: (query) => {
    return {
      then: async (onFulfilled) => {
        let result;
        if (mongoose.connection.readyState === 1) {
          result = await MongooseCMS.find(query);
        } else {
          result = await MockCMS.find(query);
        }
        return onFulfilled ? onFulfilled(result) : result;
      }
    };
  },
  create: async (data) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseCMS.create(data);
    }
    return await MockCMS.create(data);
  },
  findByIdAndUpdate: async (id, update) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseCMS.findByIdAndUpdate(id, update, { new: true });
    }
    return await MockCMS.findByIdAndUpdate(id, update);
  },
  findByIdAndDelete: async (id) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseCMS.findByIdAndDelete(id);
    }
    return await MockCMS.findByIdAndDelete(id);
  }
};

export default CMS;
